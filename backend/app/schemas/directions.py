#schemas/directions.py
from typing import List, Optional
from pydantic import BaseModel, conint, confloat

class DirectionOut(BaseModel):
    id: int
    label: str
    region_id: Optional[int] = None

class Volume(BaseModel):
    sacs: conint(ge=0) = 0
    colis: conint(ge=0) = 0
    courrier: conint(ge=0) = 0
    scelles: conint(ge=0) = 0

class TableRow(BaseModel):
    direction_id: int
    sacs: int = 0
    colis: int = 0
    courrier: int = 0
    scelles: int = 0

class DirectionsSimIn(BaseModel):
    mode: str  # "single" | "uniform" | "table" | "direction"
    direction_id: Optional[int] = None
    volume: Optional[Volume] = None
    vol_unique: Optional[Volume] = None
    volumes_par_direction: Optional[List[TableRow]] = None
    imported_volumes: Optional[List[dict]] = None
    productivite_pct: confloat(ge=0, le=200) = 100.0
    heures_net_jour: confloat(gt=0, le=24) = 8.0
    # aliases if needed for robustness
    heures_net: Optional[float] = None  # alias for heures_net_jour

class DirectionsSimRow(BaseModel):
    direction_id: int
    label: str
    heures: float
    fte_calcule: float
    fte_arrondi: int

class DirectionsSimTotaux(BaseModel):
    heures_total: float
    fte_total: float
    fte_total_arrondi: int
    heures_net_jour: float

class DirectionsSimOut(BaseModel):
    par_direction: List[DirectionsSimRow]
    totaux: DirectionsSimTotaux
    details_taches: Optional[List[dict]] = None  # Added for frontend compatibility