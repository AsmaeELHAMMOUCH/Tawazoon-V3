from sqlalchemy import text
from sqlalchemy.orm import Session
import math
from typing import List, Dict, Any

ROLES_A_IGNORER = {"client", "agence"}
ROLES_FIXES_FTE_1 = {
    "chef service",
    "chargé stock",
    "chargé réclamation et reporting",
    "chargé contrôle",
    "détaché agence",
}

COEFFICIENTS = {
    "Passation avec BO BAM": 0.5,
    "Ouverture sac": 0.1,
    "Mise en chemise": 0.1,
    "Vérification reçu de paiement /BC renseignement": 0.9,
    "Réception numérique sur système": 1.0,
    "Préparation état non-conformité": 0.8,
    "Création fichier Excel": 0.1,
    "Affectation": 0.5,
    "Passation": 0.0,
}


def math_round(val: float, decimals: int = 0) -> float:
    """Arrondi mathématique standard (0.5 -> 1), comme Math.round en JS."""
    multiplier = 10 ** decimals
    return math.floor(val * multiplier + 0.5) / multiplier


def load_metiers(db: Session):
    sql = text("SELECT id_metier, nom_metier FROM metier ORDER BY id_metier")
    return db.execute(sql).fetchall()


def load_taches(db: Session, metier_id: int):
    sql = text(
        """
        SELECT nom_tache, minutes_tache, secondes_tache, unite
        FROM tache
        WHERE id_metier = :mid
        """
    )
    return db.execute(sql, {"mid": metier_id}).fetchall()


def compute_effectif_global(db: Session, sacs_jour: int, dossiers_mois: int, productivite_pct: float) -> Dict[str, Any]:
    nb_sac = int(sacs_jour)
    nb_dossier_mensuel = int(dossiers_mois)
    prod = float(productivite_pct)

    nb_dossier_journalier = nb_dossier_mensuel / 22
    net_jrs = (8 * prod) / 100
    if net_jrs <= 0:
        raise ValueError("Productivité doit être > 0")

    resultat: List[Dict[str, Any]] = []
    total_heures_calculees = 0.0
    effectif_fixe_total = 0

    metiers = load_metiers(db)
    for id_metier, nom_metier in metiers:
        nom_lower = (nom_metier or "").strip().lower()
        if nom_lower in ROLES_A_IGNORER:
            continue

        taches = load_taches(db, id_metier)
        total_heures_metier = 0.0
        for nom_tache, minutes_tache, secondes_tache, unite in taches:
            duree_sec = (minutes_tache or 0) * 60 + (secondes_tache or 0)
            volume = nb_sac if unite == "Sac" else nb_dossier_journalier
            coef = 1.0
            if nom_lower == "chargé réception dossier":
                coef = COEFFICIENTS.get((nom_tache or "").strip(), 1)
            total_heures_metier += (duree_sec * volume * coef) / 3600

        if nom_lower in ROLES_FIXES_FTE_1:
            fte = 1.0
            fte_arrondi = 1
            heures_affiche = 0.0
            effectif_fixe_total += 1
        else:
            fte = total_heures_metier / net_jrs if net_jrs > 0 else 0
            heures_affiche = total_heures_metier
            if math_round(fte, 2) <= 0.1:
                fte = 0.0
                fte_arrondi = 0
            else:
                fte_arrondi = math_round(fte)
            total_heures_calculees += total_heures_metier

        resultat.append(
            {
                "position": nom_metier,
                "heures": math_round(heures_affiche, 2),
                "fte": math_round(fte, 2),
                "fte_arrondi": int(fte_arrondi),
            }
        )

    total_heures = sum(r["heures"] for r in resultat)
    total_fte = sum(r["fte"] for r in resultat)
    total_fte_arrondi = sum(r["fte_arrondi"] for r in resultat)

    effectif_calcule_a_partir_heures = total_heures_calculees / net_jrs if net_jrs > 0 else 0
    effectif_total_global = effectif_calcule_a_partir_heures + effectif_fixe_total

    response = {
        "dossiers_jour": float(f"{nb_dossier_journalier:.2f}"),
        "heures_net_jour": float(f"{net_jrs:.2f}"),
        "rows": resultat,
        "totaux": {
            "total_heures": math_round(total_heures, 2),
            "total_fte": math_round(total_fte, 2),
            "total_fte_arrondi": int(total_fte_arrondi),
            "total_heures_calculees": math_round(total_heures_calculees, 2),
            "effectif_fixe_total": int(effectif_fixe_total),
            "effectif_total_global": math_round(effectif_total_global, 2),
            "net_jrs": float(f"{net_jrs:.2f}"),
        },
    }
    return response


def insert_simulation(db: Session, rows: List[Dict[str, Any]], dossiers_jour: float, heures_net_jour: float):
    insert_sim = text("INSERT INTO SimulationResult (date_simulation) OUTPUT INSERTED.id_simulation VALUES (GETDATE())")
    result = db.execute(insert_sim).fetchone()
    sim_id = result[0] if result else None
    if not sim_id:
        db.rollback()
        raise RuntimeError("Impossible d'insérer SimulationResult")

    insert_detail = text(
        """
        INSERT INTO SimulationDetail (id_simulation, nom_metier, heures, fte, fte_arrondi)
        VALUES (:id_sim, :nom, :heures, :fte, :fte_arrondi)
        """
    )
    for r in rows:
        db.execute(
            insert_detail,
            {
                "id_sim": sim_id,
                "nom": r["position"],
                "heures": r["heures"],
                "fte": r["fte"],
                "fte_arrondi": r["fte_arrondi"],
            },
        )
    db.commit()

