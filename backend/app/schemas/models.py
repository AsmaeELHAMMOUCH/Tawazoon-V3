# app/schemas/models.py
from pydantic import BaseModel, Field
from typing import Optional, List

# --- Volumes JOURNALIERS (inputs en haut de page)
class VolumesInput(BaseModel):
    sacs: float = Field(ge=0)
    colis: float = Field(ge=0)
    # Paramètres configurables pour le calcul (avec valeurs par défaut)
    colis_amana_par_sac: Optional[float] = None  # 👈 IMPORTANT
    courriers_par_sac: Optional[float] = None
     # 🔹 nouveau champ pour la collecte colis
    colis_par_collecte: float = Field(1.0, ge=1)  # min 1, défaut 1
    # 🆕 Pourcentage de colis traités en dehors des sacs
    ed_percent: Optional[float] = Field(0.0, ge=0, le=100)  # 0-100%

# --- Volumes ANNUELS (CO/CR/ebarkia/lrh/amana)
class VolumesAnnuels(BaseModel):
    courrier_ordinaire: float = Field(0, ge=0)
    courrier_recommande: float = Field(0, ge=0)
    ebarkia: float = Field(0, ge=0)
    lrh: float = Field(0, ge=0)
    amana: float = Field(0, ge=0)

    # 🔹 Nouveau : marge d'inactivité en minutes / jour
    idle_minutes: Optional[float] = 0.0
    # 🆕 Pourcentage de colis traités en dehors des sacs
    ed_percent: Optional[float] = Field(0.0, ge=0, le=100)  # 0-100%
    
    # 🆕 Coefficients de complexité (envoyés par le frontend)
    taux_complexite: float = Field(1.0, ge=1.0)
    nature_geo: float = Field(1.0, ge=1.0)

class VolumeItem(BaseModel):
    centre_poste_id: int
    flux_id: int
    sens_id: int
    segment_id: int
    volume: float = Field(ge=0)

class VolumeItemUI(BaseModel):
    flux: str
    sens: str
    segment: str
    volume: float = Field(ge=0)

class BulkVolumeUpsertRequest(BaseModel):
    """Requête pour upsert bulk de volumes dans VolumeSimulation"""
    simulation_id: int
    centre_poste_id: int
    volumes: List[VolumeItem]
    
class SimulationRequest(BaseModel):
    centre_id: Optional[int] = None
    poste_id: Optional[int] = None
    productivite: float = Field(ge=0)
    heures_net: Optional[float] = Field(None, ge=0)

    volumes: Optional[VolumesInput] = None             # Legacy
    volumes_annuels: Optional[VolumesAnnuels] = None  # Legacy
    
    # New detailed volumes
    volumes_details: Optional[List[VolumeItem]] = None
    
    # New Volume UI (String based)
    volumes_ui: Optional[List[VolumeItemUI]] = None

    idle_minutes: Optional[float] = 0.0
    nbr_courrier_liasse: Optional[float] = None
    pct_retour: Optional[float] = None
    courriers_par_sac: Optional[float] = None  # 🆕 Added for flat access
    pct_reclamation: Optional[float] = None   # 🆕 Added for flat access
    annotes: Optional[float] = None            # 🆕 Added for flat access
    
    # 🆕 CO/CR-specific fields (Centre 1952 only)
    courriers_co_par_sac: Optional[float] = None
    courriers_cr_par_sac: Optional[float] = None
    nb_courrier_liasse_co: Optional[float] = None
    nb_courrier_liasse_cr: Optional[float] = None
    pct_retour_co: Optional[float] = None
    pct_retour_cr: Optional[float] = None
    annotes_co: Optional[float] = None
    annotes_cr: Optional[float] = None
    pct_reclam_co: Optional[float] = None
    pct_reclam_cr: Optional[float] = None
    
    # 🆕 Shift Logic (Requested for CCI/CNA/CCP)
    shift_param: Optional[float] = Field(1.0, ge=0.0)
    pct_international: Optional[float] = Field(0.0, ge=0.0) # For CCP international logic

class TacheDetail(BaseModel):
    id: Optional[int] = None  # 🆕 ID unique de la tâche pour matching précis
    task: str
    phase: Optional[str] = None
    unit: str
    base_calcul: Optional[int] = None  # 🆕 Base de calcul (60, 100, 40) pour affichage frontend
    produit: Optional[str] = None  # 🆕 Produit (AMANA, CO, CR, etc.) pour différenciation
    famille_uo: Optional[str] = None  # 🆕 Famille UO (CO, CR, etc.) pour différenciation des tâches dupliquées
    avg_sec: float
    heures: Optional[float] = None
    nombre_unite: Optional[float] = None
    formule: Optional[str] = None  # 🆕 Formule de calcul avec valeurs réelles
    role: Optional[str] = None
    poste_id: Optional[int] = None
    centre_poste_id: Optional[int] = None

class PosteResultat(BaseModel):
    id: int
    centre_poste_id: int
    poste_label: str
    etp_calcule: float
    etp_arrondi: int
    total_heures: float
    effectif_actuel: float = 0.0
    ecart: float = 0.0
    type_poste: str = "MOD"
    effectif_statutaire: float = 0.0
    effectif_aps: float = 0.0

class SimulationResponse(BaseModel):
    total_heures: float
    fte_calcule: float
    fte_arrondi: float
    heures_net_jour: float
    details_taches: List[TacheDetail]
    heures_par_poste: Optional[dict] = None
    etp_par_poste: Optional[dict] = None
    postes: Optional[List[PosteResultat]] = []
    
    # 🆕 Totaux globaux (pour affichage Synthèse)
    # Identical to older fields but explicit 'actuel'
    total_mod_actuel: Optional[float] = 0
    total_moi_actuel: Optional[float] = 0
    total_aps_actuel: Optional[float] = 0
    
    total_moi: Optional[int] = 0
    total_aps: Optional[int] = 0
    
    # 🆕 Proposed Breakdown (Arrondi / Optimized Logic)
    # Target Values after Optimization (APS Reduced etc.)
    total_mod_target: Optional[float] = 0
    total_moi_target: Optional[float] = 0
    total_aps_target: Optional[float] = 0
    
    # Calculated Logic Breakdown
    total_mod_calcule: Optional[float] = 0 # Simulated Workload
    