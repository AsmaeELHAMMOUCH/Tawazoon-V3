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

# --- Volumes ANNUELS (CO/CR/ebarkia/lrh/amana)
class VolumesAnnuels(BaseModel):
    courrier_ordinaire: float = Field(0, ge=0)
    courrier_recommande: float = Field(0, ge=0)
    ebarkia: float = Field(0, ge=0)
    lrh: float = Field(0, ge=0)
    amana: float = Field(0, ge=0)

class SimulationRequest(BaseModel):
    centre_id: Optional[int] = None
    poste_id: Optional[int] = None
    productivite: float = Field(ge=0)
    heures_net: Optional[float] = Field(None, ge=0)

    volumes: VolumesInput                          # journaliers
    volumes_annuels: Optional[VolumesAnnuels] = None  # annuels (optionnel)
     # 🔹 Nouveau : marge d'inactivité en minutes / jour
    idle_minutes: Optional[float] = 0.0

class TacheDetail(BaseModel):
    task: str
    phase: Optional[str] = None
    unit: str
    avg_sec: float
    heures: Optional[float] = None
    nombre_unite: Optional[float] = None
    role: Optional[str] = None
    poste_id: Optional[int] = None
    centre_poste_id: Optional[int] = None

class SimulationResponse(BaseModel):
    total_heures: float
    fte_calcule: float
    fte_arrondi: float
    heures_net_jour: float
    details_taches: List[TacheDetail]
    heures_par_poste: Optional[dict] = None
    