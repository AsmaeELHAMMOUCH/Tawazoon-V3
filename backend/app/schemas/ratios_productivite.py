from typing import List, Literal

from pydantic import BaseModel, Field


class SimulationParams(BaseModel):
    sacs_jour: int = Field(..., ge=0, description="Volume de sacs par jour saisie par l'utilisateur")
    dossiers_mois: int = Field(..., ge=0, description="Volume mensuel de dossiers")
    productivite: float = Field(..., gt=0, description="Productivité en pourcentage")


class CalculatedFields(BaseModel):
    dossiers_par_jour: float
    heures_net_par_jour: float
    volume_activites_par_heure_total: float


class RatioRow(BaseModel):
    position: str
    effectif_actuel: float
    effectif_calcule: float
    effectif_recommande: float
    volume_moyen_mois_actuel: float
    volume_moyen_mois_calcule: float
    volume_moyen_mois_recommande: float
    volume_moyen_jour_actuel: float
    volume_moyen_jour_calcule: float
    volume_moyen_jour_recommande: float
    volume_moyen_heure_actuel: float
    volume_moyen_heure_calcule: float
    volume_moyen_heure_recommande: float


class SummaryRow(RatioRow):
    is_total: bool = True


class AdequationIndex(BaseModel):
    effectif_actuel: float
    effectif_calcule: float
    effectif_recommande: float
    indice_calc_vs_actuel: float
    indice_reco_vs_actuel: float
    indice_reco_vs_calc: float


class ChartPoint(BaseModel):
    position: str
    actuel: float
    calcule: float
    recommande: float
    is_total: bool = False


class ChartSeries(BaseModel):
    type: Literal["mois", "jour", "heure"]
    title: str
    points: List[ChartPoint]


class RatiosSimulationResponse(BaseModel):
    params: SimulationParams
    calculated_fields: CalculatedFields
    rows: List[RatioRow]
    summary: SummaryRow
    adequation: AdequationIndex
    charts: List[ChartSeries]


class ExportPayload(SimulationParams):
    scope: Literal["global", "mois", "jour", "heure"] = Field(
        "global",
        description="Portée de l'export pour adapter les colonnes ou le nom de fichier",
    )
    format: Literal["csv", "excel"] = Field("csv", description="Format cible de l'export")
