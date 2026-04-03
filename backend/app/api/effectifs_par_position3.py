from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from app.core.db import get_db
from app.schemas.effectifs_par_position3 import (
    MetierOut,
    TacheOut,
    SimulerPayload,
    SimulerResponse,
    ResultRow,
    Totaux,
)

router = APIRouter(prefix="/simulateur", tags=["simulateur"])

EXCLUS = {"chef service", "client", "agence"}

# Coefficients spéciaux pour le poste "Chargé Réception Dossier"
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


@router.get("/metiers", response_model=List[MetierOut])
def get_metiers(db: Session = Depends(get_db)):
    rows = db.execute(
        text("SELECT id_metier, nom_metier FROM metier ORDER BY id_metier")
    ).fetchall()
    result = []
    for id_metier, nom_metier in rows:
        nom_clean = (nom_metier or "").strip()
        if nom_clean.lower() in EXCLUS:
            continue
        result.append({"id_metier": int(id_metier), "nom_metier": nom_clean})
    if not result:
        raise HTTPException(status_code=404, detail="Aucun métier disponible")
    return result


@router.get("/taches", response_model=List[TacheOut])
def get_taches(metier_id: int, db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT t.nom_tache, t.minutes_tache, t.secondes_tache, t.unite
            FROM tache t
            WHERE t.id_metier = :mid
            ORDER BY t.id_tache
            """
        ),
        {"mid": metier_id},
    ).fetchall()

    tasks = []
    for nom_tache, minutes_tache, secondes_tache, unite in rows:
        total_seconds = (minutes_tache or 0) * 60 + (secondes_tache or 0)
        minutes_norm = int(total_seconds // 60)
        secondes_norm = int(total_seconds % 60)
        tasks.append(
            {
                "nom_tache": nom_tache,
                "minutes": minutes_norm,
                "secondes": secondes_norm,
                "unite": unite,
            }
        )
    if not tasks:
        raise HTTPException(status_code=404, detail="Aucune tâche pour ce métier")
    return tasks


@router.get("/taches/all")
def get_all_taches(db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT t.nom_tache, t.minutes_tache, t.secondes_tache, t.unite, m.nom_metier
            FROM tache t
            JOIN metier m ON t.id_metier = m.id_metier
            ORDER BY m.id_metier, t.id_tache
            """
        )
    ).fetchall()
    return [
        {
            "nom_tache": r[0],
            "minutes": int((r[1] or 0) + (r[2] or 0) // 60),
            "secondes": int((r[2] or 0) % 60),
            "unite": r[3],
            "metierNom": r[4]
        }
        for r in rows
    ]


@router.post("/simuler", response_model=SimulerResponse)
def simuler(payload: SimulerPayload, db: Session = Depends(get_db)):
    sacs = int(payload.sacs_jour)
    dossiers_mois = int(payload.dossiers_mois)
    prod = float(payload.productivite_pct)

    dossiers_jour = dossiers_mois / 22
    heures_net = (8 * prod) / 100
    if heures_net == 0:
        raise HTTPException(status_code=400, detail="heures_net_jour = 0 (productivité nulle)")

    # Récupérer les tâches pour ce métier
    tasks_rows = get_taches(metier_id=payload.metier_id, db=db)

    unit_map = {"Sac": sacs, "Demande": dossiers_jour}
    position = (payload.metier_nom or "").strip().lower()
    is_chargereception = position == "chargé réception dossier"

    result_rows: List[ResultRow] = []
    total_heures = 0.0

    for task in tasks_rows:
        nom = task["nom_tache"]
        m = task["minutes"]
        s = task["secondes"]
        unite = task["unite"]

        unites = round(unit_map.get(unite, 0))
        duree_sec = (m * 60) + s
        coef = COEFFICIENTS.get(nom.strip(), 1) if is_chargereception else 1
        heures = (duree_sec * unites * coef) / 3600
        total_heures += heures
        result_rows.append(
            {
                "nom": nom,
                "unites": unites,
                "heures": float(f"{heures:.2f}"),
            }
        )

    effectif = total_heures / heures_net if heures_net else 0
    response = {
        "dossiers_jour": float(f"{dossiers_jour:.2f}"),
        "heures_net_jour": float(f"{heures_net:.2f}"),
        "result_rows": result_rows,
        "totaux": {
            "total_heures": float(f"{total_heures:.2f}"),
            "effectif": float(f"{effectif:.2f}"),
            "effectif_arrondi": int(round(effectif)),
            "base_hr": float(f"{heures_net:.2f}"),
        },
    }
    return response

