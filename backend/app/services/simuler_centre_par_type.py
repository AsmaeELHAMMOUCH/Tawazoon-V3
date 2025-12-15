from typing import Any, Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.schemas.simuler_centre_par_type import (
    SimulerCentreParTypeRequest,
    SimulerCentreParTypeResponse,
    TacheParType,
    PosteResultat,
)

# Mock mapping en attendant les types réels en base
MOCK_TYPE_BY_TACHE = {
    "arrivee particulier": "arrivee_particulier",
    "arrivée particulier": "arrivee_particulier",
    "arrivee pro": "arrivee_pro_b2b",
    "arrivée pro": "arrivee_pro_b2b",
    "arrivee axe": "arrivee_axes",
    "arrivée axe": "arrivee_axes",
    "depot": "depot_retrait",
    "dépot": "depot_retrait",
    "retrait": "depot_retrait",
    "depart particulier": "depart_particulier",
    "départ particulier": "depart_particulier",
    "depart pro": "depart_pro_b2b",
    "départ pro": "depart_pro_b2b",
    "depart axe": "depart_axes",
    "départ axe": "depart_axes",
}
DEFAULT_TYPE = "arrivee_particulier"


def _centre_label(db: Session, centre_id: int) -> str:
    sql = text("SELECT COALESCE(label, name) FROM dbo.centres WHERE id = :cid")
    return db.execute(sql, {"cid": centre_id}).scalar() or f"Centre {centre_id}"


def _taches_centre(db: Session, centre_id: int) -> List[Dict[str, Any]]:
    sql = text(
        """
        SELECT t.id, t.nom_tache, t.moyenne_min, t.centre_poste_id,
               cp.poste_id, p.label AS poste_label
        FROM dbo.taches t
        INNER JOIN dbo.centre_postes cp ON cp.id = t.centre_poste_id
        LEFT JOIN dbo.postes p ON p.id = cp.poste_id
        WHERE cp.centre_id = :cid
        """
    )
    rows = db.execute(sql, {"cid": centre_id}).mappings().all()
    return [dict(r) for r in rows] if rows else []


def _infer_type(task_name: str) -> str:
    name = (task_name or "").lower()
    for key, type_key in MOCK_TYPE_BY_TACHE.items():
        if key in name:
            return type_key
    return DEFAULT_TYPE


def simuler_centre_par_type_service(
    db: Session, req: SimulerCentreParTypeRequest
) -> SimulerCentreParTypeResponse:
    centre_label = _centre_label(db, req.centre_id)
    taches = _taches_centre(db, req.centre_id)

    volumes_dict = req.volumes.dict()
    heures_net = float(req.heures_net_disponibles)

    taches_out: List[TacheParType] = []
    heures_par_poste: Dict[Any, float] = {}

    for t in taches:
        type_volume = _infer_type(t.get("nom_tache"))
        volume = float(volumes_dict.get(type_volume, 0) or 0)
        moyenne_min = float(t.get("moyenne_min") or 0)
        heures = (moyenne_min * volume) / 60.0
        if heures <= 0:
            continue

        cp_id = t.get("centre_poste_id")
        poste_id = t.get("poste_id")
        poste_label = t.get("poste_label") or f"Poste {poste_id}"

        heures_par_poste[cp_id] = heures_par_poste.get(cp_id, 0.0) + heures

        taches_out.append(
            TacheParType(
                tache_id=t.get("id"),
                centre_poste_id=cp_id,
                poste_id=poste_id,
                poste_label=poste_label,
                task_label=t.get("nom_tache") or "N/A",
                type_volume=type_volume,
                moyenne_min=moyenne_min,
                volume=volume,
                heures=round(heures, 4),
            )
        )

    total_heures = sum(heures_par_poste.values())
    fte_global = total_heures / heures_net if heures_net > 0 else 0.0

    postes_out = [
        PosteResultat(
            poste_id=None,
            centre_poste_id=cp_id,
            poste_label="Poste" if not taches_out else taches_out[0].poste_label,
            total_heures=round(h, 4),
            etp_calcule=round(h / heures_net, 4) if heures_net > 0 else 0.0,
        )
        for cp_id, h in heures_par_poste.items()
    ]

    return SimulerCentreParTypeResponse(
        centre_id=req.centre_id,
        centre_label=centre_label,
        volumes_by_type=volumes_dict,
        total_heures=round(total_heures, 4),
        fte_global=round(fte_global, 4),
        postes=postes_out,
        taches=taches_out,
    )
