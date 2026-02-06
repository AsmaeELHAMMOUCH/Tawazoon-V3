from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.schemas.models import (
    SimulationRequest, 
    SimulationResponse, 
    TacheDetail, 
    PosteResultat, 
    VolumeItemUI
)
from app.models.db_models import Tache, CentrePoste, Poste, Centre

class CCIVolumeContext:
    def __init__(self, volumes_ui: List[VolumeItemUI]):
        self.volumes = volumes_ui or []
   
    def get_volume(self, flux: str, sens: str) -> float:
        """
        Récupère le volume pour un couple Flux (famille_uo) / Sens (produit/segment).
        Le matching est strict sur les codes normalisés (majuscues).
        """
        if not self.volumes:
            return 0.0
            
        target_flux = (flux or "").strip().upper()
        target_sens = (sens or "").strip().upper()
        
        total = 0.0
        for v in self.volumes:
            v_flux = (v.flux or "").strip().upper()
            v_sens = (v.sens or "").strip().upper()
            
            # Match Flux (ex: CO, CR) et Sens (ex: IMPORT, EXPORT)
            if v_flux == target_flux and v_sens == target_sens:
                total += v.volume
                
        return total

    def get_total_flux_volume(self, flux: str) -> float:
        """Récupère le volume total pour un flux donné (Import + Export)"""
        total = 0.0
        target_flux = (flux or "").strip().upper()
        for v in self.volumes:
            if (v.flux or "").strip().upper() == target_flux:
                total += v.volume
        return total

    def get_total_combined_volume(self) -> float:
        """Récupère le volume TOTAL de tous les flux (CO + CR + etc.)"""
        total = 0.0
        for v in self.volumes:
             total += v.volume
        return total

def calculate_cci_simulation(
    db: Session,
    request: SimulationRequest
) -> SimulationResponse:
    """
    Calcul Spécifique CASA CCI (ID 1952).
    
    Règles :
    - Volume Journalier = Volume Annuel / 12 / 22
    - Capacité Nette = (Amplitude(480) - TempsMort) * Productivité
    - Mapping Volume par Tache : Flux=famille_uo, Sens=produit
    """
    
    # 1. Paramètres Globaux
    # ---------------------
    productivite_pct = request.productivite or 100.0
    temps_mort_min = request.idle_minutes or 0.0
    
    # Inputs Spécifiques CCI - CO/CR Specific Parameters
    # ---------------------------------------------------
    print(f"🛠️ [CCI DEBUG] Request Params: Liasse CO={request.nb_courrier_liasse_co}, Liasse CR={request.nb_courrier_liasse_cr}, Legacy={request.nbr_courrier_liasse}", flush=True)

    # Helper to resolve parameter: Specific -> Legacy -> Default
    def resolve_param(specific_val, legacy_val, default):
        if specific_val is not None:
             # If specific is 0 and 0 is invalid (like liasse), handled by caller or logic below
             return specific_val
        if legacy_val is not None:
             return legacy_val
        return default

    # 1. Nb Courriers / Liasse (Default 500.0)
    # Liasse 0 is invalid, so treat 0 as None/Default usually, but frontend might send 0. 
    # Let's trust 0 is handled later (division by zero protection) or assume 0 -> 500
    nb_courrier_liasse_co = request.nb_courrier_liasse_co
    if nb_courrier_liasse_co is None or nb_courrier_liasse_co == 0:
        nb_courrier_liasse_co = request.nbr_courrier_liasse
    if nb_courrier_liasse_co is None or nb_courrier_liasse_co == 0:
        nb_courrier_liasse_co = 500.0
        
    nb_courrier_liasse_cr = request.nb_courrier_liasse_cr
    if nb_courrier_liasse_cr is None or nb_courrier_liasse_cr == 0:
        nb_courrier_liasse_cr = request.nbr_courrier_liasse
    if nb_courrier_liasse_cr is None or nb_courrier_liasse_cr == 0:
        nb_courrier_liasse_cr = 500.0

    # 2. % Retour (Default 0.0) - 0 is valid
    pct_retour_co = resolve_param(request.pct_retour_co, request.pct_retour, 0.0)
    pct_retour_cr = resolve_param(request.pct_retour_cr, request.pct_retour, 0.0)

    # 3. Courriers / Sac (Default - CO:2500, CR:500)
    courriers_co_par_sac = resolve_param(request.courriers_co_par_sac, request.courriers_par_sac, 2500.0)
    courriers_cr_par_sac = resolve_param(request.courriers_cr_par_sac, request.courriers_par_sac, 500.0) # Fallback to courriers_par_sac? Usually sacc is global
    if courriers_co_par_sac == 0: courriers_co_par_sac = 2500.0
    if courriers_cr_par_sac == 0: courriers_cr_par_sac = 500.0
    
    # 4. Annotés (Default 0.0)
    annotes_co = resolve_param(request.annotes_co, request.annotes, 0.0)
    annotes_cr = resolve_param(request.annotes_cr, request.annotes, 0.0)

    # 5. % Réclamation (Default 0.0)
    pct_reclam_co = resolve_param(request.pct_reclam_co, request.pct_reclamation, 0.0) # pct_reclamation is legacy? Verify schema
    pct_reclam_cr = resolve_param(request.pct_reclam_cr, request.pct_reclamation, 0.0)

    amplitude_jour_min = 480.0 # 8h standard
    
    # Capacité Nette (Heures)
    # Formule : ((480 - TempsMort) * (Prod/100)) / 60
    capacite_nette_h = ((amplitude_jour_min - temps_mort_min) * (productivite_pct / 100.0)) / 60.0
    
    # Éviter division par zéro
    if capacite_nette_h <= 0.001:
        capacite_nette_h = 7.33 # Valeur par défaut (~440min)
        
    # 2. Context Volume
    # -----------------
    ctx = CCIVolumeContext(request.volumes_ui)

    # 3. Récupération des Tâches
    # --------------------------
    
    # A. Récupérer TOUS les postes du centre (pour avoir effectif_actuel correct même sans tâches)
    all_postes_query = db.query(CentrePoste, Poste).join(Poste, CentrePoste.poste_id == Poste.id).filter(CentrePoste.centre_id == request.centre_id)
    
    if request.poste_id:
        all_postes_query = all_postes_query.filter(CentrePoste.poste_id == request.poste_id)

    all_postes_rows = all_postes_query.all()
    
    postes_agg: Dict[int, Dict] = {}
    
    for cp, p in all_postes_rows:
        postes_agg[cp.id] = {
            "id": p.id,
            "cp_id": cp.id,
            "label": p.label,
            "effectif_actuel": float(cp.effectif_actuel or 0),
            "type_poste": p.type_poste,
            "total_heures": 0.0
        }

    # B. Récupérer les tâches associés
    query = db.query(Tache, CentrePoste, Poste).join(CentrePoste, Tache.centre_poste_id == CentrePoste.id)\
              .join(Poste, CentrePoste.poste_id == Poste.id)\
              .filter(CentrePoste.centre_id == request.centre_id)
              
    # Récupérer infos centre pour APS
    # If filtered by poste_id, default APS to 0 (unless that poste IS APS, handled by type_poste maybe?) 
    # But usually APS is global.
    centre_info = db.query(Centre).filter(Centre.id == request.centre_id).first()
    if request.poste_id:
        t_aps_val = 0.0
    else:
        t_aps_val = float(centre_info.t_aps or 0.0) if centre_info else 0.0
              
    if request.poste_id:
        query = query.filter(CentrePoste.poste_id == request.poste_id)
        
    rows = query.all()
    
    results_taches: List[TacheDetail] = []
    # postes_agg déjà initialisé
    total_heures_centre = 0.0
    
    # 4. Boucle de Calcul
    # -------------------
    for tache, cp, poste in rows:
        
        # A. Détermination du Volume de Base
        # ----------------------------------
        famille = tache.famille_uo  # Flux (CO, CR...)
        produit = tache.produit     # Sens (IMPORT, EXPORT...)
        
        print(f"\n🔍 Processing Task: {tache.nom_tache}")
        print(f"   - Famille UO: {famille}")
        print(f"   - Produit: {produit}")
        print(f"   - Moyenne Min (DB): {tache.moyenne_min}")
        
        # 1. Essai de matching exact (Ex: Flux=CO, Sens=EXPORT)
        vol_annuel = ctx.get_volume(famille, produit)
        
        unite = (tache.unite_mesure or "").strip().upper()
        
        # 2. Fallback Strategy: Si matching exact échoue, essayer plusieurs alternatives
        if vol_annuel == 0:
            # Fallback 2a: Essayer EXPORT si pas de produit ou si IMPORT a échoué
            if not produit or produit.upper() == "IMPORT":
                vol_annuel = ctx.get_volume(famille, "EXPORT")
            
            # Fallback 2b: Essayer IMPORT si EXPORT a échoué
            if vol_annuel == 0 and produit and produit.upper() != "EXPORT":
                vol_annuel = ctx.get_volume(famille, "IMPORT")
            
            # Fallback 2c: Pour SAC/LIASSE, utiliser le volume total du flux (Import + Export)
            if vol_annuel == 0 and ("SAC" in unite or "LIASSE" in unite):
                vol_annuel = ctx.get_total_flux_volume(famille)
            
            # Fallback 2d: Dernier recours - volume total combiné (tous flux)
            if vol_annuel == 0:
                vol_annuel = ctx.get_total_combined_volume()

        # B. Conversion Journalier
        # ------------------------
        # Règle stricte CCI : / 12 / 22
        vol_jour = vol_annuel / 12.0 / 22.0
        
        # C. Ajustement selon Unité (Courrier / Sac / Liasse)
        # ---------------------------------------------------
        vol_applique = vol_jour
        formule_debug = "VolJour"
        
        # Select famille-specific parameters
        if famille == "CO":
            courriers_par_sac = courriers_co_par_sac
            nb_courrier_liasse = nb_courrier_liasse_co
        elif famille == "CR":
            courriers_par_sac = courriers_cr_par_sac
            nb_courrier_liasse = nb_courrier_liasse_cr
        else:
            # Default fallback for other families
            courriers_par_sac = courriers_co_par_sac
            nb_courrier_liasse = nb_courrier_liasse_co
        
        if "SAC" in unite or "BAC" in unite:
            # Division par nbr courrier/sac (famille-specific)
            vol_applique = vol_jour / courriers_par_sac
            formule_debug += f" / {courriers_par_sac} (Sac/Bac-{famille})"
            
        elif "LIASSE" in unite:
             # Division par nbr courrier/liasse (famille-specific)
             vol_applique = vol_jour / nb_courrier_liasse
             formule_debug += f" / {nb_courrier_liasse} (Liasse-{famille})"
             
        # Si Unité = COURRIER (ou autre), pas d'ajustement supplémentaire (division par 1)

        # 🆕 D. Ajustement Spécial pour Phase "Retour"
        # ---------------------------------------------
        phase = (tache.phase or "").strip()
        # Normalisation des espaces (ex: "Export  Retour" -> "Export Retour")
        phase_norm = " ".join(phase.split())
        
        # 🔍 DEBUG: Inspecter la phase si elle contient "Retour"
        if "RETOUR" in phase.upper():
            print(f"🐛 [DEBUG PHASE] Task: '{tache.nom_tache}'")
            print(f"   Raw Phase: '{phase}'")
            print(f"   Norm Phase: '{phase_norm}'")
            print(f"   ASCII Phase: {ascii(phase)}")
            print(f"   Chars: {[ord(c) for c in phase]}")
            print(f"   Match Condition: {phase_norm in ('Reception Retour', 'Export Retour')}")
        
        if phase_norm in ("Reception Retour", "Export Retour"):
            # Select famille-specific pct_retour
            pct_retour = pct_retour_co if famille == "CO" else pct_retour_cr
            # Appliquer le pourcentage de retour au volume
            vol_applique = vol_applique * (pct_retour / 100.0)
            formule_debug += f" * {pct_retour}% (Retour-{famille})"

        # 🆕 E. Ajustement Spécial pour "Traitement des anotés"
        # -----------------------------------------------------
        if tache.nom_tache and tache.nom_tache.strip() == 'Traitement des anotés/Litigue /impression CAB':
             annotes_val = annotes_co if famille == "CO" else annotes_cr
             # Règle: Volume Journalier * param
             vol_applique = vol_applique * annotes_val
             formule_debug += f" * {annotes_val} (Annotés-{famille})"

        # 🆕 F. Ajustement Spécial pour "Traitement réclamation"
        # -----------------------------------------------------
        if tache.nom_tache and tache.nom_tache.strip() == 'Traitement réclamation':
             pct_reclam = pct_reclam_co if famille == "CO" else pct_reclam_cr
             # Règle: Volume Journalier * (% Reclam / 100)
             vol_applique = vol_applique * (pct_reclam / 100.0)
             formule_debug += f" * {pct_reclam}% (Reclam-{famille})"

        # E. Calcul Heures
        # ----------------
        moyenne_min = tache.moyenne_min or 0.0
        
        # Temps calculé (minutes) = moyenne_min * volume_journalier_ajusté
        temps_calcule_min = moyenne_min * vol_applique
        
        # 🆕 G. Shift Parameter Logic
        # ---------------------------
        shift_val = float(request.shift_param or 1.0)
        target_roles = [
            "AGENT OPÉRATION", "AGENT OPERATION", 
            "CONTRÔLEUR", "CONTROLEUR", 
            "AGENT TRAITEMENT", 
            "RESPONSABLE OPÉRATION", "RESPONSABLE OPERATION", 
            "TRIEUR", 
            "MANUTENTIONNAIRE"
        ]
        p_label = str(poste.label or "").strip().upper()
        
        # Check if label contains any target role (Standardized matching)
        # Using exact match logic from CCP: "is_shift_role = p_label in target_roles"
        # But here I want to be safe if labels vary slightly.
        # CCP Code: "if is_shift_role and shift_val > 1.0:"
        # Let's use strict match if list covers it, or contain check?
        # CCP used: "is_shift_role = p_label in target_roles" (Line 356)
        # I'll stick to that to comply with "dont add or delete anything beside this loigc on same poste names".
        
        if shift_val > 1.0 and p_label in target_roles:
             temps_calcule_min = temps_calcule_min * shift_val
             formule_debug += f" * {shift_val:.0f} (Shift)"

        
        # Conversion en Heures
        heures_requises = temps_calcule_min / 60.0
        
        total_heures_centre += heures_requises
        
        # 🔍 DEBUG: Log each task calculation
        if heures_requises > 0:
            print(f"   ✅ Task: {tache.nom_tache[:40]:40} | Vol: {vol_applique:8.2f} | Avg: {moyenne_min:7.5f}min | Hours: {heures_requises:6.3f}h")
        else:
            # Log tasks with 0 hours to help debug
            reason = "No volume" if vol_annuel == 0 else ("No avg_min" if moyenne_min == 0 else "Retour 0%")
            print(f"   ⚠️  Task: {tache.nom_tache[:40]:40} | Vol: {vol_applique:8.2f} | Avg: {moyenne_min:7.5f}min | Hours: 0.000h | Reason: {reason}")
        
        # F. Agrégation Poste
        # -------------------
        if cp.id not in postes_agg:
            postes_agg[cp.id] = {
                "id": poste.id,
                "label": poste.label,
                "cp_id": cp.id,
                "total_heures": 0.0,
                "effectif_actuel": cp.effectif_actuel or 0.0,
                "type_poste": poste.type_poste
            }
        
        postes_agg[cp.id]["total_heures"] += heures_requises
        
        # G. Resultat Ligne
        # -----------------
        results_taches.append(TacheDetail(
            id=tache.id,
            task=tache.nom_tache,
            phase=tache.phase,
            unit=unite,
            base_calcul=int(tache.base_calcul or 0),
            produit=produit,
            famille_uo=famille,  # 🆕 Ajout pour différencier les tâches avec même nom
            avg_sec=moyenne_min * 60, # Pour affichage front (si besoin)
            heures=round(heures_requises, 4),
            nombre_unite=round(vol_applique, 2), # Le volume (Nombre de sacs / liasses / courriers)
            formule=f"{formule_debug} * {moyenne_min:.4f}min",
            poste_id=poste.id,
            centre_poste_id=cp.id
        ))

    # 🔍 DEBUG: Summary of task processing
    tasks_with_hours = len([r for r in results_taches if r.heures > 0])
    tasks_with_zero = len(results_taches) - tasks_with_hours
    print(f"\n📊 TASK SUMMARY:")
    print(f"   Total tasks processed: {len(results_taches)}")
    print(f"   Tasks with hours > 0: {tasks_with_hours}")
    print(f"   Tasks with 0 hours: {tasks_with_zero}")
    print(f"   Expected from Référentiel: 127 (if different, some tasks were not queried)\n")

    # 5. Finalisation Resultats Postes
    # --------------------------------
    final_postes: List[PosteResultat] = []
    
    total_etp_calcule = 0.0
    
    for cp_id, data in postes_agg.items():
        h_poste = data["total_heures"]
        etp_calc = h_poste / capacite_nette_h
        
        # Arrondi ETP : Entier le plus proche (Round Half Up)
        etp_arrondi = int(round(etp_calc + 0.0001)) # Petit epsilon pour gérer 0.5
        
        total_etp_calcule += etp_calc
        
        final_postes.append(PosteResultat(
            id=data["id"],
            centre_poste_id=data["cp_id"],
            poste_label=data["label"],
            etp_calcule=round(etp_calc, 2),
            etp_arrondi=etp_arrondi,
            total_heures=round(h_poste, 2),
            effectif_actuel=float(data["effectif_actuel"]),
            ecart=round(etp_arrondi - data["effectif_actuel"], 2),
            type_poste=data["type_poste"] or "MOD",
            effectif_aps=t_aps_val # Pass global APS count mostly for reference if needed
        ))
        
    final_postes.sort(key=lambda x: x.poste_label)
    
    # 6. Réponse Globale
    # ------------------
    # 6. Réponse Globale
    # ------------------
    # ETP Global calculé comme Somme Heures / Capacité
    fte_calcule_global = total_heures_centre / capacite_nette_h
    fte_arrondi_global = round(fte_calcule_global, 2)

    # 🆕 Calcul du MOI Global (DB)
    # Règle: Somme de effectif_actuel pour les postes de type 'MOI' du centre
    sql_moi = """
        SELECT SUM(cp.effectif_actuel)
        FROM dbo.centre_postes cp
        JOIN dbo.postes p ON cp.poste_id = p.id
        WHERE cp.centre_id = :centre_id
          AND p.type_poste = 'MOI'
    """
    total_moi_val = db.execute(text(sql_moi), {"centre_id": request.centre_id}).scalar() or 0
    total_aps_val = t_aps_val or 0

    # 🔍 DEBUG: Afficher tous les calculs
    print("\n" + "="*80)
    print("📊 SYNTHÈSE DES CALCULS CCI")
    print("="*80)
    print(f"1️⃣  CHARGE TOTALE (total_heures):")
    print(f"    ➜ Somme de toutes les heures des tâches")
    print(f"    ➜ Résultat: {round(total_heures_centre, 2)} heures/jour")
    print()
    print(f"2️⃣  CAPACITÉ NETTE PAR EMPLOYÉ (heures_net_jour):")
    print(f"    ➜ Formule: ((480 - temps_mort) * (productivite/100)) / 60")
    print(f"    ➜ Calcul: (({amplitude_jour_min} - {temps_mort_min}) * {productivite_pct/100}) / 60")
    print(f"    ➜ Résultat: {round(capacite_nette_h, 2)} heures/jour/personne")
    print()
    print(f"3️⃣  EFFECTIF CALCULÉ (fte_calcule):")
    print(f"    ➜ Formule: total_heures / heures_net_jour")
    print(f"    ➜ Calcul: {round(total_heures_centre, 2)} / {round(capacite_nette_h, 2)}")
    print(f"    ➜ Résultat: {round(fte_calcule_global, 2)} ETP")
    print()
    print(f"4️⃣  EFFECTIF ARRONDI (fte_arrondi):")
    print(f"    ➜ Formule: round(fte_calcule, 2)")
    print(f"    ➜ Résultat: {fte_arrondi_global} ETP")
    print()
    print(f"5️⃣  EFFECTIF APS (T_APS):")
    print(f"    ➜ Résultat: {total_aps_val}")
    print()
    print(f"6️⃣  EFFECTIF MOI (DB):")
    print(f"    ➜ Résultat: {total_moi_val}")
    print()
    print(f"📋 Nombre de tâches calculées: {len(results_taches)}")
    print(f"📋 Nombre de postes: {len(final_postes)}")
    print("="*80 + "\n")

    # --- OPTIMIZATION LOGIC (ARRONDI BREAKDOWN) ---
    total_mod_actuel = float(real_mod) # Using value from earlier query
    total_aps_actuel = float(real_aps)
    total_moi_actuel = float(real_moi)
    
    total_actuel_staff = total_mod_actuel + total_aps_actuel
    target_staff = fte_arrondi_global # Total Target
    
    final_aps_target = 0
    final_mod_target = 0
    
    if total_actuel_staff > target_staff:
        # SURPLUS CASE
        surplus = total_actuel_staff - target_staff
        
        # 1. Reduce APS
        cut_from_aps = min(total_aps_actuel, surplus)
        final_aps_target = total_aps_actuel - cut_from_aps
        
        remaining_surplus = surplus - cut_from_aps
        
        # 2. Reduce MOD
        cut_from_mod = min(total_mod_actuel, remaining_surplus)
        final_mod_target = total_mod_actuel - cut_from_mod
    else:
        # DEFICIT CASE
        # Keep existing APS, hire MOD
        final_aps_target = total_aps_actuel
        final_mod_target = total_mod_actuel + (target_staff - total_actuel_staff)

    return SimulationResponse(
        total_heures=round(total_heures_centre, 2),
        fte_calcule=round(fte_calcule_global, 2),
        fte_arrondi=fte_arrondi_global,
        heures_net_jour=round(capacite_nette_h, 2),
        details_taches=results_taches,
        postes=final_postes,
        # Real Data
        total_mod_actuel=total_mod_actuel,
        total_moi_actuel=total_moi_actuel,
        total_aps_actuel=total_aps_actuel,
        
        # Target / Proposed
        total_mod_target=float(final_mod_target),
        total_moi_target=float(total_moi_actuel), # Pass through
        total_aps_target=float(final_aps_target),
        
        # Calculated
        total_mod_calcule=round(fte_calcule_global, 2),
        
        # Legacy
        total_moi=int(total_moi_val),
        total_aps=int(total_aps_val)
    )

def get_cci_postes(db: Session, centre_id: int) -> List[Dict[str, Any]]:
    """
    Get all positions for CCI center
    """
    sql = """
        SELECT
            cp.id as centre_poste_id,
            cp.poste_id as id,
            p.label as label,
            p.type_poste,
            COALESCE(cp.effectif_actuel, 0) as effectif_actuel
        FROM dbo.centre_postes cp
        LEFT JOIN dbo.postes p ON p.id = cp.poste_id
        WHERE cp.centre_id = :centre_id
        ORDER BY p.label
    """
    
    rows = db.execute(text(sql), {"centre_id": centre_id}).mappings().all()
    return [dict(r) for r in rows] if rows else []

def load_cci_tasks(
    db: Session,
    centre_id: int,
    poste_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Load CCI-specific tasks from database
    """
    sql = """
        SELECT 
            t.id,
            t.nom_tache,
            t.phase,
            t.unite_mesure,
            t.moyenne_min,
            t.base_calcul,
            t.famille_uo,
            t.centre_poste_id,
            cp.poste_id,
            p.label as poste_label
        FROM dbo.taches t
        INNER JOIN dbo.centre_postes cp ON cp.id = t.centre_poste_id
        LEFT JOIN dbo.postes p ON p.id = cp.poste_id
        WHERE cp.centre_id = :centre_id
    """
    
    params = {"centre_id": centre_id}
    
    if poste_id is not None:
        sql += " AND cp.poste_id = :poste_id"
        params["poste_id"] = poste_id
    
    sql += " ORDER BY t.nom_tache"
    
    rows = db.execute(text(sql), params).mappings().all()
    return [dict(r) for r in rows] if rows else []
