from pydantic import BaseModel, Field
from typing import List


class ComparaisonEffectifRequest(BaseModel):
    sacs_jour: int = Field(..., ge=0)
    dossiers_mois: int = Field(..., ge=0)
    productivite_pct: float = Field(..., gt=0)


class ComparaisonEffectifRow(BaseModel):
    position: str
    effectif_actuel: float
    fte_calcule: float
    fte_arrondi: int
    ecart_fte: float
    ecart_arrondi: int


class ComparaisonEffectifTotal(BaseModel):
    effectif_actuel: float
    fte: float
    fte_arrondi: int
    ecart_fte: float
    ecart_arrondi: int


class ComparaisonEffectifResponse(BaseModel):
    dossiers_jour: float
    heures_net_jour: float
    rows: List[ComparaisonEffectifRow]
    total: ComparaisonEffectifTotal
