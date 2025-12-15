from pydantic import BaseModel, ConfigDict
from typing import Optional

class RegionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    label: str

class CategorieOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    label: str

class CentreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    label: str
    region_id: int
    categorie_id: Optional[int] = None

class PosteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    label: str
    type_poste: Optional[str] = None

class CentrePosteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    poste_id: int
    label: str
    type_poste: Optional[str] = None
    effectif_actuel: float = 0

class TacheOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nom_tache: str
    phase: Optional[str] = None
    unite_mesure: str
    moyenne_min: float
    centre_poste_id: int
