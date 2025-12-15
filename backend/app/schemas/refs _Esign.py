from pydantic import BaseModel

class RegionOut(BaseModel):
    id: int
    label: str

class CategorieOut(BaseModel):
    id: int
    label: str

class CentreOut(BaseModel):
    id: int
    label: str
    region_id: int
    categorie_id: int

class PosteOut(BaseModel):
    id: int
    label: str

class TacheOut(BaseModel):
    id: int
    nom_tache: str
    phase: str
    unite_mesure: str
    moyenne_min: float
    centre_poste_id: int
