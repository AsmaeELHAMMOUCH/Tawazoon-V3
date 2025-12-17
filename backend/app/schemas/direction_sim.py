#schemas/direction_sim.py
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field, conint, confloat

# --- Inputs ---

class CentreVolume(BaseModel):
    """
    Represents a row from the uploaded file.
    Can identify centre by ID (preferred) or Label (fuzzy match fallback).
    """
    centre_id: Optional[int] = None
    centre_label: Optional[str] = None
    
    # Volumes (daily or annual handling depends on service logic, usually treated as annual inputs or mix)
    sacs: float = 0
    colis: float = 0
    courrier_ordinaire: float = 0
    courrier_recommande: float = 0
    ebarkia: float = 0
    lrh: float = 0
    amana: float = 0

    # Ratios override per centre (optional)
    colis_amana_par_sac: Optional[float] = None
    courriers_par_sac: Optional[float] = None

class GlobalParams(BaseModel):
    productivite: float = Field(100.0, ge=1, le=200)
    heures_par_jour: float = Field(8.0, ge=1, le=24)
    idle_minutes: float = Field(0.0, ge=0)


class DirectionSimRequest(BaseModel):
    direction_id: int
    mode: str = Field("actuel", pattern="^(actuel|recommande)$")
    volumes: List[CentreVolume]
    global_params: GlobalParams = GlobalParams()

# --- Outputs ---

class KPICard(BaseModel):
    label: str
    value: float
    unit: str = ""
    trend: Optional[float] = None # e.g. difference

class DirectionKPIs(BaseModel):
    nb_centres: int
    etp_actuel: float
    etp_calcule: float
    ecart_global: float

class CentreResultRow(BaseModel):
    centre_id: int
    centre_label: str
    categorie: str = "N/A" # MOI / MOD
    etp_actuel: float
    etp_calcule: float
    ecart: float
    # Debug/Details
    heures_calc: float = 0.0

class ChartDataPoint(BaseModel):
    name: str
    value: float

class ImportReport(BaseModel):
    total_lignes: int
    matched_centres: int
    unknown_centres: List[str] # labels that failed to match
    ignored_centres: int # matched but not in this direction

class DirectionSimResponse(BaseModel):
    direction_id: int
    direction_label: str
    mode: str
    
    kpis: DirectionKPIs
    rows: List[CentreResultRow]
    
    # Ready-to-use chart data
    chart_distribution_moi_mod: List[ChartDataPoint]
    chart_top_gaps: List[ChartDataPoint] # Top 5 ecart positif
    
    report: ImportReport
