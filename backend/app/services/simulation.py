# app/services/simulation.py  (le mouteur de simulation)
from typing import List, Dict, Optional, Union, Any
from sqlalchemy.orm import Session
from sqlalchemy import text, func

from app.schemas.models import VolumesInput, SimulationResponse, TacheDetail, VolumeItem
from app.models.db_models import VolumeSimulation, Tache, CentrePoste, Poste, Flux, VolumeSens, VolumeSegment
from app.services.utils import normalize_unit, round_half_up

JOURS_OUVRES_AN = 264  # jours ouvrés/an  # 22 jours * 12 mois


def _coerce_volumes(volumes: Union[VolumesInput, Dict]) -> VolumesInput:
    """Accepte soit un VolumesInput soit un dict venant du front."""
    return volumes if isinstance(volumes, VolumesInput) else VolumesInput(**volumes)


def _normalize_annual(
    volumes_annuels: Optional[Dict],
    volumes_mensuels: Optional[Dict],
) -> Dict[str, float]:
    """Normalise les volumes annuels (annuel direct, sinon mensuel*12, sinon 0)."""
    if volumes_annuels:
        return {
            "courrier_ordinaire": float(volumes_annuels.get("courrier_ordinaire", 0) or 0),
            "courrier_recommande": float(volumes_annuels.get("courrier_recommande", 0) or 0),
            "ebarkia": float(volumes_annuels.get("ebarkia", 0) or 0),
            "lrh": float(volumes_annuels.get("lrh", 0) or 0),
            "amana": float(volumes_annuels.get("amana", 0) or 0),
        }

    if volumes_mensuels:
        return {
            "courrier_ordinaire": float(volumes_mensuels.get("courrier_ordinaire", 0) or 0) * 12.0,
            "courrier_recommande": float(volumes_mensuels.get("courrier_recommande", 0) or 0) * 12.0,
            "ebarkia": float(volumes_mensuels.get("ebarkia", 0) or 0) * 12.0,
            "lrh": float(volumes_mensuels.get("lrh", 0) or 0) * 12.0,
            "amana": float(volumes_mensuels.get("amana", 0) or 0) * 12.0,
        }

    return {
        "courrier_ordinaire": 0.0,
        "courrier_recommande": 0.0,
        "ebarkia": 0.0,
        "lrh": 0.0,
        "amana": 0.0,
    }


def calculer_heures_nettes(productivite: float, heures_net_input: Optional[float] = None) -> float:
    """Si heures_net_input fourni -> on le prend. Sinon : 8h * productivité (%)."""
    if heures_net_input and heures_net_input > 0:
        return float(heures_net_input)
    return (8.0 * float(productivite or 0)) / 100.0


def calculer_simulation(
    taches: List[Dict[str, Any]],
    volumes: Union[VolumesInput, Dict],
    productivite: float,
    heures_net_input: Optional[float] = None,
    idle_minutes: Optional[float] = None,  # 🔹 marge d'inactivité (min/jour)
    *,
    taux_complexite: float = 1.0,
    nature_geo: float = 1.0,
    volumes_annuels: Optional[Dict[str, float]] = None,
    volumes_mensuels: Optional[Dict[str, float]] = None,
) -> SimulationResponse:
    """
    Logique commune VueIntervenant / VueCentre :

    - AMANA-only : on ignore toutes les tâches courrier CO/CR/EB/LRH et les mixtes courrier.
    - Fallback AMANA sur unités inconnues uniquement si la tâche est tag AMANA (et jamais pour MAG/admin/machine).
    - Pas de fallback courrier -> AMANA.
    - Pour AMANA :
        * unité = COLIS  -> volume_jour = colis/jour (AMANA ou classiques)
        * unité = SACS   -> volume_jour = sacs/jour = colis/jour / colis_amana_par_sac

    - idle_minutes (marge d'inactivité, en minutes/jour) :
        * converti en heures
        * soustrait des heures nettes théoriques
        
    - taux_complexite / nature_geo :
        * Multiplicateurs appliqués aux tâches de "Distribution"
    """

    volumes_obj = _coerce_volumes(volumes)
    
    # 🔍 DEBUG COMPLET : Afficher TOUS les paramètres reçus
    print("=" * 80, flush=True)
    print("🔍 DEBUG SIMULATION - PARAMÈTRES REÇUS:", flush=True)
    print(f"   colis_amana_par_sac: {volumes_obj.colis_amana_par_sac}", flush=True)
    print(f"   courriers_par_sac: {volumes_obj.courriers_par_sac}", flush=True)
    print(f"   sacs (fournis): {getattr(volumes_obj, 'sacs', 'ABSENT')}", flush=True)
    print(f"   ed_percent (obj): {getattr(volumes_obj, 'ed_percent', 'ABSENT')}", flush=True)
    print(f"   taux_complexite: {taux_complexite}", flush=True)
    print(f"   nature_geo: {nature_geo}", flush=True)
    print(f"   volumes_annuels: {volumes_annuels}", flush=True)
    print("=" * 80, flush=True)
    
    # 🆕 Extraction de ED% (priorité: volumes_annuels > volumes_obj)
    ed_percent_from_obj = float(getattr(volumes_obj, "ed_percent", 0) or 0)
    ed_percent_from_annuels = 0.0
    if volumes_annuels and isinstance(volumes_annuels, dict):
        ed_percent_from_annuels = float(volumes_annuels.get("ed_percent", 0) or 0)
    
    ed_percent = ed_percent_from_annuels if ed_percent_from_annuels > 0 else ed_percent_from_obj
    
    sacs_fournis = float(getattr(volumes_obj, "sacs", 0) or 0)
    
    print(f"🔍 ED% FINAL UTILISÉ: {ed_percent}%", flush=True)
    print(f"🔍 SACS FOURNIS: {sacs_fournis}", flush=True)
    
    if ed_percent > 0:
        print(f"✅ ED% ACTIF: {ed_percent}% de colis en dehors → sacs fournis={sacs_fournis}", flush=True)
    else:
        print(f"⚠️  ED% INACTIF (0%)", flush=True)

    # 🔹 Gestion des ratios avec valeurs par défaut
    colis_amana_par_sac = (
        float(volumes_obj.colis_amana_par_sac)
        if getattr(volumes_obj, "colis_amana_par_sac", None) not in [None, ""]
        else 5.0
    )
    courriers_par_sac = (
        float(volumes_obj.courriers_par_sac)
        if getattr(volumes_obj, "courriers_par_sac", None) not in [None, ""]
        else 4500.0
    )

    # Assurer que les valeurs sont positives
    colis_amana_par_sac = max(1.0, colis_amana_par_sac)   # au moins 1
    courriers_par_sac = max(100.0, courriers_par_sac)     # au moins 100

    # 🔹 Récupération de la marge d'inactivité (min/jour)
    idle_min = (
        float(idle_minutes)
        if idle_minutes is not None
        else float(getattr(volumes_obj, "idle_minutes", 0) or 0)
    )
    if idle_min < 0:
        idle_min = 0.0

    # 1) volumes annuels normalisés (ou fallback volumes_obj si rien fourni)
    annual = _normalize_annual(volumes_annuels, volumes_mensuels)
    if not volumes_annuels and not volumes_mensuels:
        annual = {
            "courrier_ordinaire": float(getattr(volumes_obj, "courrier_ordinaire", 0) or 0),
            "courrier_recommande": float(getattr(volumes_obj, "courrier_recommande", 0) or 0),
            "ebarkia": float(getattr(volumes_obj, "ebarkia", 0) or 0),
            "lrh": float(getattr(volumes_obj, "lrh", 0) or 0),
            "amana": float(getattr(volumes_obj, "amana", 0) or 0),
        }

    co_an = annual["courrier_ordinaire"]
    cr_an = annual["courrier_recommande"]
    eb_an = annual["ebarkia"]
    lrh_an = annual["lrh"]
    amana_an = annual["amana"]

    # 2) volumes / jour
    co_jour = co_an / JOURS_OUVRES_AN if co_an > 0 else 0.0
    cr_jour = cr_an / JOURS_OUVRES_AN if cr_an > 0 else 0.0
    eb_jour = eb_an / JOURS_OUVRES_AN if eb_an > 0 else 0.0
    lrh_jour = lrh_an / JOURS_OUVRES_AN if lrh_an > 0 else 0.0
    courrier_total_jour = co_jour + cr_jour + eb_jour + lrh_jour

    # 🆕 Application de ED% sur les volumes Amana
    amana_colis_jour_brut = amana_an / JOURS_OUVRES_AN if amana_an > 0 else 0.0
    
    # Calcul de la part en sac après exclusion ED%
    pourc_sac = max(0.0, 100.0 - ed_percent)  # % qui reste en sac
    amana_colis_jour = amana_colis_jour_brut * (pourc_sac / 100.0)
    
    # Log si ED% est actif
    if ed_percent > 0 and amana_colis_jour_brut > 0:
        print(f"🆕 ED% APPLICATION: {amana_colis_jour_brut:.2f} colis/j × {pourc_sac}% = {amana_colis_jour:.2f} colis en sac/j", flush=True)
    
    # 🔹 PRIORITÉ : Utiliser les sacs fournis par le frontend (déjà calculés avec ED%)
    # Si sacs_fournis > 0, on l'utilise directement (le frontend a déjà appliqué ED%)
    # Sinon, on calcule à partir de amana_colis_jour
    if sacs_fournis > 0:
        amana_sacs_jour = sacs_fournis
        print(f"🆕 SACS FOURNIS (avec ED%): {amana_sacs_jour:.2f} sacs/j (fourni par frontend)", flush=True)
    else:
        amana_sacs_jour = amana_colis_jour / colis_amana_par_sac if amana_colis_jour > 0 else 0.0
        if amana_sacs_jour > 0:
            print(f"🆕 SACS CALCULÉS: {amana_sacs_jour:.2f} sacs/j (calculé: {amana_colis_jour:.2f} colis ÷ {colis_amana_par_sac})", flush=True)

    # Fallback "pas de volumes courrier fournis" : dérive du nombre de sacs
    if courrier_total_jour <= 0:
        sacs_jour = float(getattr(volumes_obj, "sacs", 0) or 0)
        if sacs_jour > 0 and courriers_par_sac > 0:
            courrier_total_jour = sacs_jour * courriers_par_sac
            co_jour = courrier_total_jour  # on met tout en "générique"

    # 3) heures nettes (avec marge d'inactivité)
    heures_brutes = calculer_heures_nettes(productivite, heures_net_input)
    idle_heures = idle_min / 60.0
    heures_net = max(0.0, heures_brutes - idle_heures)

    details_taches: List[TacheDetail] = []
    heures_par_poste: Dict[Union[str, int], float] = {}
    total_heures_acc = 0.0

    # Cas "AMANA only"
    amana_only = (
        amana_colis_jour > 0
        and co_an == 0
        and cr_an == 0
        and eb_an == 0
        and lrh_an == 0
        and float(getattr(volumes_obj, "colis", 0) or 0) == 0
        and float(getattr(volumes_obj, "sacs", 0) or 0) == 0
    )

    # tâches admin/support à exclure du fallback AMANA
    ADMIN_KEYWORDS = {
        "suivi", "etat", "pointage", "rapport", "canevas", "bp intelligente",
        "gardiennage", "femmes de ménage", "réalisations commerciales", "absences"
    }

    # Mapping DB -> logique
    FLUX_MAP = {
        "co": "ordinaire",
        "cr": "recommande",
        "eb": "ebarkia",
        "lrh": "lrh",
    }
    ADMIN_FLUX = {"mag"}

    # 🔍 DEBUG: Afficher un résumé des unités de mesure présentes
    unites_count = {}
    for t in taches:
        unite_normalisee = normalize_unit(t.get("unite_mesure", ""))
        unites_count[unite_normalisee] = unites_count.get(unite_normalisee, 0) + 1
    
    print(f"🔍 UNITÉS DE MESURE DÉTECTÉES:", flush=True)
    for unite, count in sorted(unites_count.items()):
        print(f"   - {unite}: {count} tâche(s)", flush=True)
    print(f"🔍 VOLUMES REÇUS:", flush=True)
    print(f"   - sacs (journalier): {float(getattr(volumes_obj, 'sacs', 0) or 0)}", flush=True)
    print(f"   - colis (journalier): {float(getattr(volumes_obj, 'colis', 0) or 0)}", flush=True)
    print(f"   - amana_colis_jour: {amana_colis_jour}", flush=True)
    print(f"   - colis_amana_par_sac: {colis_amana_par_sac}", flush=True)

    for t in taches:
        nom = (t.get("nom_tache") or "N/A").strip()
        nom_lower = nom.lower()
        unite_normalisee = normalize_unit(t.get("unite_mesure", ""))
        moyenne_min = float(t.get("moyenne_min", 0) or 0)

        # flux brut depuis DB (CR/CO/MAG...)
        type_flux_raw = (t.get("type_flux") or "").strip().lower()
        type_flux = FLUX_MAP.get(type_flux_raw, type_flux_raw)

        centre_poste_id = t.get("centre_poste_id") or t.get("centrePosteId") or "NA"

        # Détection courrier / AMANA
        is_courrier_task = (
            "courrier" in nom_lower
            or unite_normalisee in ("courrier", "courriers", "courrier_recommande")
            or type_flux in {"ordinaire", "recommande", "ebarkia", "lrh"}
        )
        has_amana_tag = (
            "amana" in nom_lower
            or type_flux == "amana"
            or unite_normalisee in ("colis_amana", "amana")
        )

        volume_jour = 0.0

        # 🔍 DEBUG: Tracer le calcul pour chaque tâche
        debug_info = {
            "nom": nom,
            "unite": unite_normalisee,
            "type_flux": type_flux,
            "is_courrier": is_courrier_task,
            "has_amana": has_amana_tag,
            "centre_poste_id": centre_poste_id,
        }

        # 🔹 CAS SPÉCIAL : collecte colis
        is_collecte_colis = ("collecte" in nom_lower) and ("colis" in nom_lower)

        if is_collecte_colis:
            colis_input = float(getattr(volumes_obj, "colis", 0) or 0)

            if colis_input > 0:
                raw_colis_par_collecte = getattr(volumes_obj, "colis_par_collecte", None)
                colis_par_collecte = float(raw_colis_par_collecte or 1.0)
                colis_par_collecte = max(1.0, colis_par_collecte)

                # nombre de collectes / jour = total colis / colis_par_collecte
                volume_jour = colis_input / colis_par_collecte
                print(f"🔍 COLLECTE COLIS: {nom} → volume_jour={volume_jour:.4f} (colis_input={colis_input}, ratio={colis_par_collecte})", flush=True)
            else:
                volume_jour = 0.0
                print(f"⚠️  COLLECTE COLIS IGNORÉE: {nom} → colis_input=0", flush=True)

        # 1) COLIS
        elif unite_normalisee in ("colis", "colis_amana", "amana"):
            base_colis_jour = float(getattr(volumes_obj, "colis", 0) or 0)

            if base_colis_jour > 0:
                # Colis classiques saisis en volume/jour
                volume_jour = base_colis_jour
                print(f"🔍 COLIS (classique): {nom} → volume_jour={volume_jour:.4f} (base_colis_jour={base_colis_jour})", flush=True)
            elif amana_colis_jour > 0:
                # AMANA-only ou AMANA présent : on prend le volume AMANA/jour
                volume_jour = amana_colis_jour
                print(f"🔍 COLIS (AMANA): {nom} → volume_jour={volume_jour:.4f} (amana_colis_jour={amana_colis_jour})", flush=True)
            else:
                volume_jour = 0.0
                print(f"⚠️  COLIS IGNORÉ: {nom} → base_colis_jour=0, amana_colis_jour=0", flush=True)

        # 2) SACS (avec prise en compte AMANA + ratio)
        elif unite_normalisee in ("sac", "sacs"):
            base_sacs_jour = float(getattr(volumes_obj, "sacs", 0) or 0)
            base_colis_jour = float(getattr(volumes_obj, "colis", 0) or 0)

            print(f"🔍 SAC DÉTECTÉ: {nom}", flush=True)
            print(f"   → base_sacs_jour={base_sacs_jour}", flush=True)
            print(f"   → base_colis_jour={base_colis_jour}", flush=True)
            print(f"   → amana_colis_jour={amana_colis_jour}", flush=True)
            print(f"   → has_amana_tag={has_amana_tag}", flush=True)
            print(f"   → colis_amana_par_sac={colis_amana_par_sac}", flush=True)

            # 🔹 CORRECTION : Les tâches "sac" peuvent utiliser AMANA même sans tag explicite
            # Car les sacs sont nécessaires pour traiter les colis AMANA !
            
            # Priorité 1 : Sacs saisis directement
            if base_sacs_jour > 0:
                volume_jour = base_sacs_jour
                print(f"   ✅ SAC (direct): volume_jour={volume_jour:.4f} (base_sacs_jour={base_sacs_jour})", flush=True)
            
            # Priorité 2 : Conversion depuis colis classiques
            elif base_colis_jour > 0:
                volume_jour = base_colis_jour / colis_amana_par_sac
                print(f"   ✅ SAC (conversion colis classiques): volume_jour={volume_jour:.4f} (base_colis={base_colis_jour} / ratio={colis_amana_par_sac})", flush=True)
            
            # Priorité 3 : Conversion depuis colis AMANA (utilise amana_sacs_jour déjà calculé avec ED%)
            elif amana_colis_jour > 0:
                volume_jour = amana_sacs_jour  # Utilise directement les sacs calculés avec ED%
                print(f"   ✅ SAC (AMANA avec ED%): volume_jour={volume_jour:.4f} sacs/j (amana_sacs_jour calculé)", flush=True)
            
            # Sinon : 0
            else:
                volume_jour = 0.0
                print(f"   ⚠️  SAC IGNORÉ: Aucun volume disponible (sacs=0, colis=0, amana=0)", flush=True)

        # 3) COURRIERS
        elif unite_normalisee in ("courrier", "courriers", "courrier_recommande"):

            # MAG = admin => jamais calculé
            if type_flux in ADMIN_FLUX:
                volume_jour = 0.0
                print(f"⚠️  COURRIER ADMIN IGNORÉ: {nom} (type_flux={type_flux})", flush=True)
            else:
                # AMANA-only : ignorer toutes les tâches courrier
                if not amana_only:
                    if type_flux == "ordinaire":
                        volume_jour = co_jour
                    elif type_flux == "recommande":
                        volume_jour = cr_jour
                    elif type_flux == "ebarkia":
                        volume_jour = eb_jour
                    elif type_flux == "lrh":
                        volume_jour = lrh_jour
                    else:
                        volume_jour = courrier_total_jour
                    
                    if volume_jour > 0:
                        print(f"🔍 COURRIER: {nom} → volume_jour={volume_jour:.4f} (type_flux={type_flux})", flush=True)
                    else:
                        print(f"⚠️  COURRIER IGNORÉ: {nom} → volume_jour=0 (type_flux={type_flux})", flush=True)
                else:
                    print(f"⚠️  COURRIER IGNORÉ (AMANA-only): {nom}", flush=True)

        # 4) MACHINE
        elif unite_normalisee == "machine":
            volume_jour = 0.0
            print(f"⚠️  MACHINE IGNORÉE: {nom}", flush=True)

        # 5) UNITÉS INCONNUES / AUTRES
        else:
            volume_jour = 0.0
            print(f"⚠️  UNITÉ INCONNUE: {nom} → unite={unite_normalisee}", flush=True)

        # Fallback final AMANA-only (sécurisé)
        # - jamais pour MAG/admin
        # - jamais pour tâches courrier/mixte courrier
        # - uniquement si tag AMANA
        if volume_jour <= 0 and amana_only:
            if (
                type_flux not in ADMIN_FLUX
                and not any(k in nom_lower for k in ADMIN_KEYWORDS)
                and unite_normalisee != "machine"
                and not is_courrier_task
                and has_amana_tag
            ):
                volume_jour = amana_colis_jour
                print(f"🔍 FALLBACK AMANA: {nom} → volume_jour={volume_jour:.4f}", flush=True)


        if volume_jour <= 0:
            # 🔍 DEBUG: Tracer les tâches ignorées
            print(f"⚠️  TÂCHE IGNORÉE: {nom} | unité={unite_normalisee} | volume_jour={volume_jour:.4f} | centre_poste_id={centre_poste_id}", flush=True)
            continue

        minutes_cumulees = moyenne_min * volume_jour
        heures_calculees = minutes_cumulees / 60.0

        # 🆕 Apply complexity to Distribution tasks
        famille = (t.get("famille_uo") or "").lower()
        # ⚠️ Match "distribution" broadly (Distribution, Dist locale, etc.)
        if "distribution" in famille:
             facteur = float(taux_complexite) * float(nature_geo)
             if facteur != 1.0:
                 print(f"   ⚖️ COMPLEXITÉ APPLIQUÉE: {nom} ({famille}) x{facteur:.2f}", flush=True)
                 heures_calculees *= facteur

        total_heures_acc += heures_calculees

        # Vue Centre : centre_poste_id ONLY
        heures_par_poste[centre_poste_id] = (
            heures_par_poste.get(centre_poste_id, 0.0) + heures_calculees
        )

        details_taches.append(
            TacheDetail(
                task=nom,
                phase=(t.get("phase") or "N/A"),
                unit=unite_normalisee,
                avg_sec=moyenne_min * 60.0,
                heures=round(heures_calculees, 2),
                nombre_unite=float(volume_jour),
                poste_id=t.get("poste_id") or t.get("posteId"),
                centre_poste_id=centre_poste_id
                if isinstance(centre_poste_id, (int, str))
                else None,
            )
        )

    total_heures = total_heures_acc
    fte_calcule = total_heures / heures_net if heures_net > 0 else 0.0

    # Arrondi métier aligné VueIntervenant
    if fte_calcule <= 0.1:
        fte_arrondi = 0
    else:
        fte_arrondi = round_half_up(fte_calcule)

    return SimulationResponse(
        details_taches=details_taches,
        total_heures=round(total_heures, 2),
        heures_net_jour=round(heures_net, 2),  # 🔹 heures nettes APRÈS idle
        fte_calcule=round(fte_calcule, 2),
        fte_arrondi=fte_arrondi,
        heures_par_poste=heures_par_poste,
    )



def calculer_simulation_sql(
    db: Session,
    simulation_id: int,
    heures_net_jour: float = 8.0,
    productivite: float = 100.0,
) -> SimulationResponse:
    """
    Calcule les heures nécessaires et ETP via SQL en utilisant VolumeSimulation.
    Joins: VolumeSimulation -> Tache -> CentrePoste -> Poste
    
    Validation stricte :
    - Tâches sans flux/sens/segment (NULL) sont exclues.
    - Warning si volumes sans tâches.
    - Durée nulle si moyenne_min/sec NULL.
    
    Calcul:
    heures = SUM((volume * duree_min) / 60)
    heures_ajustees = heures / (productivite/100)
    etp = heures_ajustees / heures_net_jour
    """

    # 1. Requête principale d'agrégation
    #    Calcule les items + sommes totales
    
    print(f"🔹 [Simulation SQL] Début calcul pour sim_id={simulation_id}. Params: Prod={productivite}, NetH={heures_net_jour}", flush=True)

    sql_query = text("""
        SELECT
            cp.id AS centre_poste_id,
            p.label AS intervenant,
            p.id AS poste_id,
            t.nom_tache,
            t.phase,
            t.unite_mesure,
            t.moyenne_min,
            t.moyenne_sec,
            f.code AS flux_code,
            s.code AS sens_code,
            sg.code AS segment_code,
            vs.volume AS volume_saisi,
            
            -- Calcul Heures Ligne
            -- duree_min = COALESCE(min,0) + COALESCE(sec,0)/60.0
            (vs.volume * (COALESCE(t.moyenne_min, 0) + COALESCE(t.moyenne_sec, 0)/60.0)) / 60.0 AS heures_calculees,
            
            -- Debug Info
            t.flux_id, t.sens_id, t.segment_id
            
        FROM dbo.volume_simulation vs
        JOIN dbo.taches t 
          ON t.centre_poste_id = vs.centre_poste_id
          AND t.flux_id = vs.flux_id
          AND t.sens_id = vs.sens_id
          AND t.segment_id = vs.segment_id
          
        JOIN dbo.centre_postes cp ON cp.id = t.centre_poste_id
        JOIN dbo.postes p ON p.id = cp.poste_id
        
        -- Use LEFT JOIN for reference tables to ensure calculation works 
        -- even if reference labels are missing (integrity issue vs blocking issue)
        LEFT JOIN dbo.flux f ON f.id = t.flux_id
        LEFT JOIN dbo.volume_sens s ON s.id = t.sens_id
        LEFT JOIN dbo.volume_segments sg ON sg.id = t.segment_id
        
        WHERE vs.simulation_id = :sim_id
    """)
    
    rows = db.execute(sql_query, {"sim_id": simulation_id}).mappings().all()
    print(f"🔹 [Simulation SQL] {len(rows)} tâches identifiées et calculées.", flush=True)
    
    details_taches: List[TacheDetail] = []
    heures_par_poste: Dict[int, float] = {}
    total_heures_necessaires = 0.0
    
    # Check for unmatched volumes (Warning)
    # Volumes qui n'ont pas trouvé de tâche correspondante
    sql_unmatched = text("""
        SELECT 
            vs.centre_poste_id, vs.flux_id, vs.sens_id, vs.segment_id, vs.volume 
        FROM dbo.volume_simulation vs
        LEFT JOIN dbo.taches t 
          ON t.centre_poste_id = vs.centre_poste_id
          AND t.flux_id = vs.flux_id
          AND t.sens_id = vs.sens_id
          AND t.segment_id = vs.segment_id
        WHERE vs.simulation_id = :sim_id
          AND t.id IS NULL
    """)
    unmatched_rows = db.execute(sql_unmatched, {"sim_id": simulation_id}).mappings().all()
    
    if unmatched_rows:
        print(f"[Simulation SQL] {len(unmatched_rows)} volumes sans taches correspondantes:", flush=True)
        for u in unmatched_rows:
             print(f"   - Ignored: CP={u['centre_poste_id']} Flux={u['flux_id']} Sens={u['sens_id']} Seg={u['segment_id']} Vol={u['volume']}", flush=True)

        # DEBUG: Show what IS available in Taches for these CentrePostes
        cp_ids = {u['centre_poste_id'] for u in unmatched_rows}
        if cp_ids:
            print(f"[Simulation SQL] Cles disponibles en base pour ces CP ({list(cp_ids)}) :", flush=True)
            sql_avail = text(f"""
                SELECT DISTINCT centre_poste_id, flux_id, sens_id, segment_id 
                FROM dbo.taches 
                WHERE centre_poste_id IN ({','.join(map(str, cp_ids))})
                  AND flux_id IS NOT NULL
            """)
            avail = db.execute(sql_avail).mappings().all()
            for a in avail:
                print(f"   > AVAILABLE: CP={a['centre_poste_id']} Flux={a['flux_id']} Sens={a['sens_id']} Seg={a['segment_id']}", flush=True)

    # Check for invalid tasks (if we were scanning tasks directly, but here we query based on Join)
    # The Join acts as a filter. We only process valid matches.
    
    for row in rows:
        h = float(row["heures_calculees"] or 0)
        
        # Check integrity warnings on the fly ?
        # Logic says: "Si moyenne_min et moyenne_sec sont NULL, considérer duree_min = 0 et logger un warning"
        if row["moyenne_min"] is None and row["moyenne_sec"] is None:
             print(f"⚠️ [Simulation SQL] Tâche durée indéfinie (0) : {row['nom_tache']}", flush=True)
        
        # Log detail for each row
        print(f"   + Tâche: {row['nom_tache']} | Vol={row['volume_saisi']} | DureeMin={row['moyenne_min'] or 0}m{row['moyenne_sec'] or 0}s | Heures={h:.4f}", flush=True)

        total_heures_necessaires += h
        
        cp_id = row["centre_poste_id"]
        heures_par_poste[cp_id] = heures_par_poste.get(cp_id, 0.0) + h
        
        details_taches.append(TacheDetail(
            task=row["nom_tache"],
            phase=row["phase"] or "",
            unit=row["unite_mesure"],
            avg_sec=(float(row["moyenne_min"] or 0) * 60) + float(row["moyenne_sec"] or 0),
            heures=round(h, 2),
            nombre_unite=float(row["volume_saisi"]),
            poste_id=row["poste_id"],
            centre_poste_id=cp_id
        ))
        
    # ETP Calculation Logic
    # 1. Heures Ajustées (selon productivité)
    #    heures_ajustees = heures_necessaires / (productivite/100.0)
    
    prod_factor = productivite / 100.0 if productivite > 0 else 1.0
    heures_ajustees = total_heures_necessaires / prod_factor
    
    # 2. ETP calculé
    #    etp_calcule = heures_ajustees / capacite_nette_h_j
    
    capacity = heures_net_jour if heures_net_jour > 0 else 8.0
    etp_calcule = heures_ajustees / capacity
    
    # 3. Arrondi
    if etp_calcule <= 0.1:
        etp_arrondi = 0.0
    else:
        etp_arrondi = round_half_up(etp_calcule)
        
    print(f"📊 [Simulation SQL] Fin calcul. H_Nec={total_heures_necessaires:.2f}, Prod={productivite}%, H_Ajust={heures_ajustees:.2f}, Cap={capacity}, ETP={etp_calcule:.2f}", flush=True)

    # Note: The SimulationResponse expects 'total_heures' and 'heures_net_jour'.
    # Usually total_heures displayed is "heures nécessaires" (before adjustment) or "heures ajustées"?
    # In legacy flow, 'total_heures' was the sum of task hours. ETP was derived from it.
    # To maintain consistency with VueIntervenant display, we pass 'total_heures_necessaires'.
    
    return SimulationResponse(
        details_taches=details_taches,
        total_heures=round(total_heures_necessaires, 2),
        heures_net_jour=round(capacity, 2), 
        fte_calcule=round(etp_calcule, 2),
        fte_arrondi=int(etp_arrondi),
        heures_par_poste=heures_par_poste
    )
