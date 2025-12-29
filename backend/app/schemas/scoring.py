from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ScoringTier(BaseModel):
    min: float
    max: float
    points: float

class ScoringIndicatorConfig(BaseModel):
    key: str
    label: str
    weight: float
    unit: str
    tiers: List[ScoringTier]

class ScoringDetail(BaseModel):
    key: str
    label: str
    value: float
    unit: str
    tier_range: str
    points: float
    weight: float
    score: float

class ScoringResult(BaseModel):
    centre_id: int
    centre_label: str
    code: Optional[str] = None
    region_id: Optional[int] = None
    
    # Categories
    current_classe: str
    simulated_classe: str
    global_score: float
    
    # Comparison
    impact: str # "Promotion", "Reclassement", "Stable"
    
    # Details
    details: List[ScoringDetail]
    top_contributors: List[ScoringDetail]

class ScoringResponse(BaseModel):
    scenario_id: str
    date: str
    results: List[ScoringResult]
    summary: Dict[str, Any] # KPI stats

# --- NEW: Single Centre Simulation Schemas ---

class CentreSimulationInput(BaseModel):
    centre_id: int
    type_site: Optional[str] = None
    # Volumes map: { "courrier_ordinaire": 123, "lrh": 50, ... }
    indicators: Dict[str, float]
    # The ETP calculated by Layer 1
    effectif_global: float

class CentreSimulationOutput(BaseModel):
    global_score: float
    simulated_class: str
    impact: str
    details: List[ScoringDetail]
