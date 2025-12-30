# app/services/simulation.py  (le mouteur de simulation)
from typing import List, Dict, Optional, Union, Any

from app.schemas.models import VolumesInput, SimulationResponse, TacheDetail
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
    """

    volumes_obj = _coerce_volumes(volumes)
    print(
        "DEBUG ratios >>> colis_amana_par_sac=",
        volumes_obj.colis_amana_par_sac,
        "courriers_par_sac=",
        volumes_obj.courriers_par_sac,
    )

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

    amana_colis_jour = amana_an / JOURS_OUVRES_AN if amana_an > 0 else 0.0
    amana_sacs_jour = amana_colis_jour / colis_amana_par_sac if amana_colis_jour > 0 else 0.0

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
            
            # Priorité 3 : Conversion depuis colis AMANA (NOUVEAU !)
            elif amana_colis_jour > 0:
                volume_jour = amana_colis_jour / colis_amana_par_sac
                print(f"   ✅ SAC (conversion AMANA): volume_jour={volume_jour:.4f} (amana_colis={amana_colis_jour} / ratio={colis_amana_par_sac})", flush=True)
            
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
