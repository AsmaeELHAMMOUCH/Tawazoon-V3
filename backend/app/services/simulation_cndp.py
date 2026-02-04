from sqlalchemy.orm import Session
from typing import Optional
from app.models.db_models import Tache, CentrePoste
from app.schemas.volumes_ui import VolumesUIInput
from app.schemas.models import SimulationResponse, TacheDetail, PosteResultat

def calculer_simulation_cndp(
    db: Session,
    centre_id: int,
    volumes_ui: VolumesUIInput,
    productivite: float = 100.0,
    heures_par_jour: float = 8.0,
    idle_minutes: float = 0.0,
    poste_id_filter: Optional[int] = None
) -> SimulationResponse:
    """
    Simulateur spécifique pour CNDP (Centre National de Dépôt et de Partage)
    Logique simplifiée basée sur les colonnes 'produit' et 'unite_mesure' de la base.
    """
    
    # 1. Extraction des volumes de base (IMPORT / EXPORT)
    vol_import = 0.0
    vol_export = 0.0
    
    if volumes_ui.volumes_flux:
        for item in volumes_ui.volumes_flux:
            f = item.flux.upper()
            s = item.sens.upper()
            seg = item.segment.upper()
            if f == "AMANA":
                # On cumule IMPORT et EXPORT
                if s == "ARRIVEE" or "IMPORT" in s or "IMPORT" in seg:
                    vol_import += float(item.volume)
                elif s == "DEPART" or "EXPORT" in s or "EXPORT" in seg:
                    vol_export += float(item.volume)
    else:
        # Fallback anciens champs
        if volumes_ui.flux_arrivee and volumes_ui.flux_arrivee.amana:
            vol_import = volumes_ui.flux_arrivee.amana.global_ or 0.0
        if volumes_ui.flux_depart and volumes_ui.flux_depart.amana:
            vol_export = volumes_ui.flux_depart.amana.global_ or 0.0

    # 2. Paramètres CNDP (Facteurs)
    ed_factor = (volumes_ui.ed_percent or 0.0) / 100.0
    sac_factor = (volumes_ui.pct_sac or 60.0) / 100.0
    
    colis_par_sac = volumes_ui.colis_amana_par_sac or 5.0
    nb_jours = volumes_ui.nb_jours_ouvres_an or 264

    # 3. Récupération des tâches
    print(f"🔍 [CNDP DEBUG] centre_id={centre_id}, poste_id_filter={poste_id_filter}, Imp={vol_import}, Exp={vol_export}", flush=True)
    
    if not poste_id_filter:
        print("⚠️ [CNDP] Aucun poste sélectionné pour la simulation intervenant.", flush=True)
        return SimulationResponse(
            details_taches=[],
            total_heures=0.0,
            fte_calcule=0.0,
            fte_arrondi=0.0,
            heures_net_jour=heures_par_jour,
            postes=[]
        )

    query = db.query(Tache).join(CentrePoste).filter(
        CentrePoste.centre_id == centre_id,
        CentrePoste.poste_id == poste_id_filter
    )
    
    taches = query.all()
    print(f"🔍 [CNDP] {len(taches)} tâches trouvées pour le poste {poste_id_filter}", flush=True)
    
    details_taches = []
    total_heures = 0.0
    heures_net_jour = max(0.1, heures_par_jour - (idle_minutes / 60.0))
    heures_par_poste = {} 

    for t in taches:
        nom_tache = str(t.nom_tache or "")
        unite = str(t.unite_mesure or "").upper().strip()
        produit_db = str(t.produit or "").upper().strip()
        
        # A. Sélection du volume source via colonne 'produit'
        # Logique : Si 'EXPORT' ou 'DEPART' dans produit => EXPORT, sinon IMPORT
        is_export = "EXPORT" in produit_db or "DEPART" in produit_db or "DÉPART" in produit_db
        vol_source = vol_export if is_export else vol_import
        source_label = "EXPORT" if is_export else "IMPORT"
        
        # B. Règle de calcul selon l'unité de mesure
        # "Sac" = Vol * %SAC / Ratio
        # "Colis" = Vol * %ED
        
        coeff = 1.0
        conversion_unite = 1.0
        applied_param_desc = "100%"

        if "SAC" in unite:
            coeff = sac_factor # % SAC
            conversion_unite = 1.0 / max(1.0, colis_par_sac) # Division par Nbr Colis/Sac
            applied_param_desc = f"% Sac ({volumes_ui.pct_sac}%) ÷ RatioSac({colis_par_sac})"
            
        elif "COLIS" in unite:
            coeff =ed_factor # % ED
            applied_param_desc = f"% ED ({volumes_ui.ed_percent}%)"
            
        else:
             # Autres unités (Camion, etc.) -> 100% du volume ? Ou 0 ?
             # Supposons 100% du volume unitaire (par défaut) ou 1 si c'est structurel
             # Si c'est "Jour", "Heure", etc.
             pass
        
        # D. Volume Journalier
        vol_calcule = vol_source * coeff * conversion_unite
        vol_jour = vol_calcule / nb_jours if nb_jours > 0 else 0.0
        
        # E. Calcul Heures
        moy_min = float(t.moyenne_min or 0.0)
        minutes_jour = vol_jour * moy_min
        heures_tache = minutes_jour / 60.0
        
        # F. Productivité
        if productivite and productivite > 0:
            heures_tache = heures_tache * (100.0 / productivite)
            
        total_heures += heures_tache
        
        # Accumulation
        cp_id = t.centre_poste_id
        heures_par_poste[cp_id] = heures_par_poste.get(cp_id, 0.0) + heures_tache
        
        # Debug Formule
        formule = (
            f"Vol({source_label})={vol_source/nb_jours:.0f}/j × {applied_param_desc} "
            f"× {moy_min:.2f}min"
        )
        
        details_taches.append(TacheDetail(
            id=t.id,
            task=t.nom_tache,
            phase=t.phase,
            unit=t.unite_mesure,
            avg_sec=moy_min * 60.0,
            heures=round(heures_tache, 4),
            nombre_unite=round(vol_jour, 2),
            formule=formule,
            poste_id=t.centre_poste.poste_id if t.centre_poste else None,
            centre_poste_id=cp_id
        ))

    # 4. Préparation de la réponse (identique)
    fte_calcule = total_heures / heures_net_jour if heures_net_jour > 0 else 0.0
    
    # Résultats par poste
    liste_postes_res = []
    centre_postes = db.query(CentrePoste).filter(CentrePoste.centre_id == centre_id).all()
    etp_par_poste = {}
    
    for cp in centre_postes:
        hrs = heures_par_poste.get(cp.id, 0.0)
        etp = hrs / heures_net_jour if heures_net_jour > 0 else 0.0
        etp_par_poste[cp.id] = etp
        
        liste_postes_res.append(PosteResultat(
            id=cp.id,
            centre_poste_id=cp.id,
            poste_label=cp.poste.label if cp.poste else "Inconnu",
            etp_calcule=etp,
            etp_arrondi=int(round(etp)),
            total_heures=hrs,
            effectif_actuel=float(cp.effectif_actuel or 0),
            ecart=float(cp.effectif_actuel or 0) - etp,
            type_poste=cp.poste.type_poste if cp.poste else "MOD"
        ))

    return SimulationResponse(
        details_taches=details_taches,
        total_heures=total_heures,
        heures_net_jour=heures_net_jour,
        fte_calcule=fte_calcule,
        fte_arrondi=int(round(fte_calcule)),
        heures_par_poste=heures_par_poste,
        etp_par_poste=etp_par_poste,
        postes=liste_postes_res
    )
