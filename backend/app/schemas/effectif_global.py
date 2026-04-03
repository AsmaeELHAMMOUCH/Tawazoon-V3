from pydantic import BaseModel, Field
from typing import List, Optional


class EffectifGlobalRequest(BaseModel):
    sacs_jour: int = Field(..., ge=0)
    dossiers_mois: int = Field(..., ge=0)
    productivite_pct: float = Field(..., gt=0)


class EffectifGlobalRow(BaseModel):
    position: str
    heures: float
    fte: float
    fte_arrondi: int


class EffectifGlobalTotals(BaseModel):
    total_heures: float
    total_fte: float
    total_fte_arrondi: int
    total_heures_calculees: float
    effectif_fixe_total: int
    effectif_total_global: float
    net_jrs: float


class EffectifGlobalResponse(BaseModel):
    dossiers_jour: float
    heures_net_jour: float
    rows: List[EffectifGlobalRow]
    totaux: EffectifGlobalTotals

