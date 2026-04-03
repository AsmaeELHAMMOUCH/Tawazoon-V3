from pydantic import BaseModel
from typing import List

class ComparatifRow(BaseModel):
    positions_actuelles: str
    positions_recommandees: str
    commentaire: str

class ComparatifResponse(BaseModel):
    columns: List[str]
    rows: List[List[str]]
