from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class SimulationInput(BaseModel):
    sacs_jour: float = 50
    dossiers_mois: float = 6500
    productivite: float = 100

class DerivedValues(BaseModel):
    dossiers_jours: float
    heures_net_jour: float

class ComparisonResponse(BaseModel):
    derived: DerivedValues
    comparaison: List[List[str]]
    ecarts: List[List[str]]

class GraphSeries(BaseModel):
    name: str
    value: float
    color: str

class GraphResponse(BaseModel):
    labels: List[str]
    series: List[GraphSeries]
