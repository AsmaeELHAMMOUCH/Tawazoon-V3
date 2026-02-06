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
    colis_par_collecte: Optional[float] = None

class VolumeMatriciel(BaseModel):
    """
    Format matriciel pour les volumes (nouveau format)
    Basé sur Flux × Sens × Segment
    """
    centre_id: Optional[int] = None
    centre_label: Optional[str] = None
    flux_id: Optional[int] = None  # 1=Amana, 2=CO, 3=CR, 4=E-Barkia, 5=LRH, null pour guichet
    sens_id: int  # 1=Arrivée, 2=Guichet, 3=Départ
    segment_id: int  # 1=GLOBAL, 2=PART, 3=PRO, 4=DIST, 5=AXES, 6=DÉPÔT, 7=RÉCUP
    volume: float = 0

class CentreParams(BaseModel):
    productivite: Optional[float] = None
    temps_mort: Optional[float] = None
    coeff_circ: Optional[float] = None
    coeff_geo: Optional[float] = None
    capacite_nette: Optional[float] = None
    colis_amana_par_sac: Optional[float] = None
    ed_percent: Optional[float] = None
    pct_axes_arr: Optional[float] = None
    pct_axes_dep: Optional[float] = None
    pct_collecte: Optional[float] = None
    pct_retour: Optional[float] = None
    courriers_co_par_sac: Optional[float] = None
    courriers_cr_par_sac: Optional[float] = None
    cr_par_caisson: Optional[float] = None

class CentreSimulationData(BaseModel):
    """
    Données complètes pour la simulation d'un centre (Volumes + Paramètres)
    """
    centre_id: Optional[int] = None
    centre_label: str
    volumes: List[VolumeMatriciel] 
    params: Optional[CentreParams] = None

class GlobalParams(BaseModel):
    productivite: float = Field(100.0, ge=1, le=200)
    heures_par_jour: float = Field(8.0, ge=1, le=24)
    idle_minutes: float = Field(0.0, ge=0)
    taux_complexite: float = Field(0.0, ge=0)
    nature_geo: float = Field(0.0, ge=0)


class DirectionSimRequest(BaseModel):
    direction_id: int
    mode: str = Field("actuel", pattern="^(actuel|recommande|database|data_driven)$")
    volumes: Optional[List[CentreVolume]] = []  # Ancien format (compatibilité)
    volumes_matriciels: Optional[List[VolumeMatriciel]] = []  # Nouveau format matriciel
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

class PosteDetail(BaseModel):
    label: str
    code: str
    effectif_actuel: float
    etp_calcule: float
    ecart: float
    type_poste: str = ""

class CentreResultRow(BaseModel):
    centre_id: int
    centre_label: str
    categorie: str = "N/A" # MOI / MOD
    etp_actuel: float
    etp_calcule: float
    ecart: float
    # Debug/Details
    heures_calc: float = 0.0
    details_postes: List[PosteDetail] = []

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

# --- National Simulation Schemas ---

class NationalSimRequest(BaseModel):
    # Similar to GlobalParams but we might want explicit fields if passed from UI
    productivite: float = 100.0
    heures_par_jour: float = 8.0
    year: Optional[int] = 2024
    scenario: Optional[str] = "Standard" # "Standard" or "Optimisé"
    
    # 🆕 Support Data-Driven (Import Excel)
    mode: Optional[str] = "database" # "database" ou "data_driven"
    centres_data: Optional[List[CentreSimulationData]] = []
    global_params: Optional[GlobalParams] = None

class NationalKPIs(BaseModel):
    etpActuelTotal: float
    etpRecommandeTotal: float
    surplusDeficit: float
    tauxProductiviteMoyen: float
    fte_calcule: float
    volumes: Dict[str, float] = {}

class NationalRegionStats(BaseModel):
    id: int
    code: str
    nom: str
    centres: int
    etpActuel: float
    etpRecommande: float
    tauxOccupation: float = 0
    lat: float = 0.0
    lng: float = 0.0
    # Breakdown
    etpActuelMoi: Optional[float] = 0.0
    etpActuelMod: Optional[float] = 0.0
    etpActuelAps: Optional[float] = 0.0

class NationalCentreStats(BaseModel):
    id: int
    nom: str
    direction_id: int
    direction_label: str
    typologie: str = "N/A"
    etp_actuel: float = 0.0
    etp_calcule: float = 0.0
    heures_calculees: float = 0.0
    ecart: float = 0.0

class NationalPosteStats(BaseModel):
    poste_label: str
    type_poste: str = "MOD"
    centre_id: Optional[int] = None
    nom_centre: Optional[str] = None
    etp_actuel: float = 0.0
    etp_calcule: float = 0.0
    ecart: float = 0.0

class NationalSimResponse(BaseModel):
    kpisNationaux: NationalKPIs
    regionsData: List[NationalRegionStats]
    centres: Optional[List[NationalCentreStats]] = []
    postes: Optional[List[NationalPosteStats]] = []