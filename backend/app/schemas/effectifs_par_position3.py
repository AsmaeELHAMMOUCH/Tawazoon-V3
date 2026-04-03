from pydantic import BaseModel, Field
from typing import List


class MetierOut(BaseModel):
    id_metier: int
    nom_metier: str


class TacheOut(BaseModel):
    nom_tache: str
    minutes: int
    secondes: int
    unite: str


class SimulerPayload(BaseModel):
    metier_id: int = Field(..., alias="metier_id")
    metier_nom: str
    sacs_jour: int
    dossiers_mois: int
    productivite_pct: float


class ResultRow(BaseModel):
    nom: str
    unites: int
    heures: float


class Totaux(BaseModel):
    total_heures: float
    effectif: float
    effectif_arrondi: int
    base_hr: float


class SimulerResponse(BaseModel):
    dossiers_jour: float
    heures_net_jour: float
    result_rows: List[ResultRow]
    totaux: Totaux


__all__ = [
    "MetierOut",
    "TacheOut",
    "SimulerPayload",
    "ResultRow",
    "Totaux",
    "SimulerResponse",
]
