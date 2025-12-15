from pydantic import BaseModel
from typing import Optional

class VolumesAnnuels(BaseModel):
    courrier_ordinaire: float = 0
    courrier_recommande: float = 0
    ebarkia: float = 0
    lrh: float = 0
    amana: float = 0

class SimulationRequest(BaseModel):
    centre_id: Optional[int] = None
    poste_id: Optional[int] = None
    volumes: dict  # Volumes journaliers
    productivite: float = 100
    heures_net: Optional[float] = None
    volumes_annuels: Optional[VolumesAnnuels] = None  # Gardez la structure détaillée en entrée
    # 🔹 Nouveau : marge d'inactivité en minutes / jour
    idle_minutes: Optional[float] = 0.0