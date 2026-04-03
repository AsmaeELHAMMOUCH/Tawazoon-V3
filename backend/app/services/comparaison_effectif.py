from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import Dict, Any, List

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


def load_metiers(db: Session):
    sql = text("SELECT id_metier, nom_metier, effectif_actuel FROM metier ORDER BY id_metier")
    return db.execute(sql).fetchall()


def load_taches(db: Session, metier_id: int):
    sql = text(
        """
        SELECT nom_tache, minutes_tache, secondes_tache, unite
        FROM tache
        WHERE id_metier = :mid
        ORDER BY id_tache
        """
    )
    return db.execute(sql, {"mid": metier_id}).fetchall()


def compute_comparaison_effectif(db: Session, sacs_jour: int, dossiers_mois: int, productivite_pct: float) -> Dict[str, Any]:
    sacs = int(sacs_jour)
    dossiers_mois = int(dossiers_mois)
    prod = float(productivite_pct)

    dossiers_jour = dossiers_mois / 22
    heures_net = (8 * prod) / 100
    if heures_net <= 0:
        raise ValueError("productivite must be > 0")

    rows: List[Dict[str, Any]] = []
    total_actuel = 0.0
    total_fte = 0.0
    total_fte_arrondi = 0
    total_ecart_fte = 0.0
    total_ecart_arrondi = 0
    total_heures_calculees = 0.0
    effectif_fixe_total = 0

    for id_metier, nom_metier, effectif_actuel in load_metiers(db):
        nom_lower = (nom_metier or "").strip().lower()
        if nom_lower in ROLES_A_IGNORER:
            continue

        heures_metier = 0.0
        for nom_tache, minutes_tache, secondes_tache, unite in load_taches(db, id_metier):
            duree_sec = (minutes_tache or 0) * 60 + (secondes_tache or 0)
            volume = sacs if (unite or "") == "Sac" else dossiers_jour
            coef = COEFFICIENTS.get((nom_tache or "").strip(), 1.0) if nom_lower == "chargé réception dossier" else 1.0
            heures_metier += (duree_sec * volume * coef) / 3600

        if nom_lower in ROLES_FIXES_FTE_1:
            fte = 1.0
            heures_metier = 0.0
            effectif_fixe_total += 1
        else:
            fte = heures_metier / heures_net if heures_net > 0 else 0.0
            total_heures_calculees += heures_metier

        fte_arrondi = round(fte)
        actuel = effectif_actuel or 0
        ecart_fte = round(fte - actuel, 2)
        ecart_arrondi = int(fte_arrondi - actuel)

        rows.append(
            {
                "position": nom_metier,
                "effectif_actuel": float(actuel),
                "fte_calcule": round(fte, 2),
                "fte_arrondi": int(fte_arrondi),
                "ecart_fte": ecart_fte,
                "ecart_arrondi": ecart_arrondi,
            }
        )

        total_actuel += actuel
        total_fte += fte
        total_fte_arrondi += fte_arrondi
        total_ecart_fte += ecart_fte
        total_ecart_arrondi += ecart_arrondi

    effectif_calcule = total_heures_calculees / heures_net if heures_net > 0 else 0.0
    effectif_total_global = effectif_calcule + effectif_fixe_total

    return {
        "dossiers_jour": round(dossiers_jour, 1),
        "heures_net_jour": round(heures_net, 2),
        "rows": rows,
        "total": {
            "effectif_actuel": round(total_actuel, 2),
            "fte": round(effectif_total_global, 2),
            "fte_arrondi": int(total_fte_arrondi),
            "ecart_fte": round(total_ecart_fte, 2),
            "ecart_arrondi": int(total_ecart_arrondi),
        },
    }
