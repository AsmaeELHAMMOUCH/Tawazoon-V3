from typing import List, Dict, Optional, Union
import os
import sys
import logging

from app.schemas.models import VolumesInput, SimulationResponse, TacheDetail
from app.services.utils import normalize_unit, round_half_up

JOURS_OUVRES_AN = 264  # 22 jours * 12 mois

logger = logging.getLogger("uvicorn.error")
# Ensure logs always visible even si config Uvicorn minimale
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False


def log(*args):
    logger.info(" ".join(str(a) for a in args))


def _coerce_volumes(volumes: Union[VolumesInput, Dict]) -> VolumesInput:
    return volumes if isinstance(volumes, VolumesInput) else VolumesInput(**volumes)


def _normalize_annual(
    volumes_annuels: Optional[Dict],
    volumes_mensuels: Optional[Dict],
) -> Dict[str, float]:
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
    if heures_net_input and heures_net_input > 0:
        return float(heures_net_input)
    return (8.0 * float(productivite or 0)) / 100.0


def calculer_simulation(
    taches: List[Dict],
    volumes: Union[VolumesInput, Dict],
    productivite: float,
    heures_net_input: Optional[float] = None,
    *,
    volumes_annuels: Optional[Dict[str, float]] = None,
    volumes_mensuels: Optional[Dict[str, float]] = None,
) -> SimulationResponse:

    print("calculer_simulation() start")
    print("Fichier en cours =", os.path.abspath(__file__))
    print(f"Nb taches={len(taches)} | productivite={productivite} | heures_net_input={heures_net_input}")
    print(f"Volumes payload brut={volumes}")
    print(f"Volumes annuels={volumes_annuels} | volumes mensuels={volumes_mensuels}")
    print("------ Nouvelle simulation ------")

    volumes_obj = _coerce_volumes(volumes)

    colis_amana_par_sac = float(volumes_obj.colis_amana_par_sac or 5)
    courriers_par_sac = float(volumes_obj.courriers_par_sac or 4500)

    log(f"Parametres colis_amana_par_sac={colis_amana_par_sac} | courriers_par_sac={courriers_par_sac}")

    # 1) volumes annuels normalisés
    annual = _normalize_annual(volumes_annuels, volumes_mensuels)
    if not volumes_annuels and not volumes_mensuels:
        annual = {
            "courrier_ordinaire": float(getattr(volumes_obj, "courrier_ordinaire", 0) or 0),
            "courrier_recommande": float(getattr(volumes_obj, "courrier_recommande", 0) or 0),
            "ebarkia": float(getattr(volumes_obj, "ebarkia", 0) or 0),
            "lrh": float(getattr(volumes_obj, "lrh", 0) or 0),
            "amana": float(getattr(volumes_obj, "amana", 0) or 0),
        }

    log(f"Volumes annuels normalises={annual}")

    co_an = annual["courrier_ordinaire"]
    cr_an = annual["courrier_recommande"]
    eb_an = annual["ebarkia"]
    lrh_an = annual["lrh"]
    amana_an = annual["amana"]

    # 2) volumes /jour
    co_jour = co_an / JOURS_OUVRES_AN if co_an > 0 else 0.0
    cr_jour = cr_an / JOURS_OUVRES_AN if cr_an > 0 else 0.0
    eb_jour = eb_an / JOURS_OUVRES_AN if eb_an > 0 else 0.0
    lrh_jour = lrh_an / JOURS_OUVRES_AN if lrh_an > 0 else 0.0
   # courrier_total_jour = co_jour + cr_jour + eb_jour + lrh_jour

   # has_courrier_volumes = courrier_total_jour > 0

    amana_colis_jour = amana_an / JOURS_OUVRES_AN if amana_an > 0 else 0.0
    amana_sacs_jour = amana_colis_jour / colis_amana_par_sac if amana_colis_jour > 0 else 0.0

    # 3) heures nettes
    heures_net = calculer_heures_nettes(productivite, heures_net_input)

    print("Volumes / jour => CO:", co_jour, " CR:", cr_jour, " EB:", eb_jour, " LRH:", lrh_jour)
    print("AMANA => Colis/j:", amana_colis_jour, " Sacs/j:", amana_sacs_jour)
    print("Heures nettes calculees:", heures_net)

    details_taches: List[TacheDetail] = []
    heures_par_poste: Dict[Union[str, int], float] = {}
    total_heures_acc = 0.0

    # amana only
    amana_only = (
        amana_colis_jour > 0
        and co_an == 0
        and cr_an == 0
        and eb_an == 0
        and lrh_an == 0
        and float(getattr(volumes_obj, "colis", 0) or 0) == 0
        and float(getattr(volumes_obj, "sacs", 0) or 0) == 0
    )

    ADMIN_KEYWORDS = {
        "suivi", "etat", "pointage", "rapport", "canevas", "bp intelligente",
        "gardiennage", "femmes de menage", "realisations commerciales", "absences",
    }

    FLUX_MAP = {
        "co": "ordinaire",
        "cr": "recommande",
        "eb": "ebarkia",
        "lrh": "lrh",
    }

    # flux admin à exclure
    ADMIN_FLUX = {"mag"}

    # flux courrier "connus" (même si unité mal codée)
    COURRIER_FLUX_SET = {
        "co", "cr", "eb", "lrh",
        "ordinaire", "recommande", "ebarkia", "lrh",
        "mag",
    }

    for t in taches:
        nom = (t.get("nom_tache") or "N/A").strip()
        nom_lower = nom.lower()

        unite_raw = (t.get("unite_mesure") or "").strip().lower()
        unite_normalisee = normalize_unit(unite_raw)

        # si le texte brut contient "courrier", on force l'unité courrier
        is_courrier_unit = (
            unite_normalisee in ("courrier", "courriers", "courrier_recommande")
            or "courrier" in unite_raw
        )

        moyenne_min = float(t.get("moyenne_min", 0) or 0)

        # 🔹 ignore tâches sans temps (évite le bruit)
        if moyenne_min <= 0:
            log(f"[SKIP ZERO TIME] {nom} moyenne_min={moyenne_min}")
            continue

        # normaliser type_flux
        type_flux_raw = (t.get("type_flux") or "").strip().lower()
        type_flux = FLUX_MAP.get(type_flux_raw, type_flux_raw)

        # Tâche courrier ? (même si l'unité est mal codée)
        is_courrier_task = (
            "courrier" in nom_lower
            or is_courrier_unit
            or type_flux in {"ordinaire", "recommande", "ebarkia", "lrh"}
        )

       

        centre_poste_id = t.get("centre_poste_id") or t.get("centrePosteId") or "NA"
        real_poste_id = t.get("poste_id") or t.get("posteId") or None

        # Barid Pro ne doit rien compter dans cette vue (poste ignoré systématiquement)
        if "barid pro" in nom_lower:
            print(f"[SKIP BARID PRO] {nom} (flux={type_flux_raw or 'None'})")
            continue

        # ✅ Détection robuste "courrier"
        # même si unité est vide/incorrecte
        is_courrier_task = (
            is_courrier_unit
            or type_flux in COURRIER_FLUX_SET
            or "courrier" in nom_lower
        )

        
        volume_jour = 0.0

        # -------------------- COLIS --------------------
        if unite_normalisee in ("colis", "colis_amana", "amana"):
            is_amana_task = (
                "amana" in nom_lower
                or type_flux == "amana"
                or unite_normalisee in ("colis", "amana")
            )
            if is_amana_task:
                volume_jour = amana_colis_jour
            else:
                volume_jour = float(getattr(volumes_obj, "colis", 0) or 0)
                if volume_jour <= 0 and amana_colis_jour > 0:
                    volume_jour = amana_colis_jour

        # -------------------- SACS --------------------
        elif unite_normalisee in ("sac", "sacs"):
            is_amana_task = ("amana" in nom_lower) or (type_flux == "amana")

            if is_amana_task:
                volume_jour = amana_sacs_jour
            elif float(getattr(volumes_obj, "sacs", 0) or 0) > 0:
                volume_jour = float(getattr(volumes_obj, "sacs", 0) or 0)
            elif float(getattr(volumes_obj, "colis", 0) or 0) > 0:
                volume_jour = float(getattr(volumes_obj, "colis", 0) or 0) / colis_amana_par_sac
            elif amana_colis_jour > 0:
                volume_jour = amana_sacs_jour

        # -------------------- COURRIERS --------------------
        elif is_courrier_task:
            if type_flux in ADMIN_FLUX:  # MAG
                volume_jour = 0.0
            else:
                if type_flux == "ordinaire":
                    volume_jour = co_jour
                elif type_flux == "recommande":
                    volume_jour = cr_jour
                elif type_flux == "ebarkia":
                    volume_jour = eb_jour
                elif type_flux == "lrh":
                    volume_jour = lrh_jour
                else:
                    volume_jour = 0

            # ❌ aucun fallback AMANA sur courrier

        # -------------------- MACHINE --------------------
        elif unite_normalisee == "machine":
            volume_jour = 0.0

        # -------------------- AUTRES --------------------
        else:
            volume_jour = 0.0

        # ✅ fallback AMANA-only FINAL
        # MAIS jamais pour courrier
        if volume_jour <= 0 and amana_only:
            if (
                type_flux not in ADMIN_FLUX
                and not any(k in nom_lower for k in ADMIN_KEYWORDS)
                and unite_normalisee != "machine"
                and not is_courrier_task
            ):
                volume_jour = amana_colis_jour

        if volume_jour <= 0:
            log(f"[SKIP] {nom} (unit_raw={unite_raw}, unit_norm={unite_normalisee}, flux={type_flux_raw}) volume=0")
            continue

        minutes_cumulees = moyenne_min * volume_jour
        heures_calculees = minutes_cumulees / 60.0

        total_heures_acc += heures_calculees
        heures_par_poste[centre_poste_id] = heures_par_poste.get(centre_poste_id, 0.0) + heures_calculees

        print(
            f"Tache: {nom} | unit_raw={unite_raw} | unit_norm={unite_normalisee} | "
            f"courrier?={is_courrier_task} | flux={type_flux_raw}->{type_flux} | "
            f"vol={volume_jour} | min={moyenne_min} | heures={round(heures_calculees, 2)} "
            f"| poste={centre_poste_id}"
        )

        details_taches.append(
            TacheDetail(
                task=nom,
                phase=(t.get("phase") or "N/A"),
                unit=unite_normalisee,
                avg_sec=moyenne_min * 60.0,
                heures=round(heures_calculees, 2),
                nombre_unite=float(volume_jour),
                poste_id=real_poste_id,
                centre_poste_id=centre_poste_id,
            )
        )

    print("--- Heures par poste ---")
    for pid, h in heures_par_poste.items():
        print(f"Poste {pid} => {round(h, 2)} h")

    total_heures = total_heures_acc
    fte_calcule = total_heures / heures_net if heures_net > 0 else 0.0
    fte_arrondi = round_half_up(fte_calcule)

    print("TOTAL heures =", total_heures)
    print("FTE calcule =", fte_calcule, " | arrondi =", fte_arrondi)

    return SimulationResponse(
        details_taches=details_taches,
        total_heures=round(total_heures, 2),
        heures_net_jour=round(heures_net, 2),
        fte_calcule=round(fte_calcule, 2),
        fte_arrondi=fte_arrondi,
        heures_par_poste=heures_par_poste,
    )
