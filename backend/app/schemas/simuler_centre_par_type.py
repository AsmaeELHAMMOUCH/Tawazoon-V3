from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, ConfigDict, model_validator

class VolumesParType(BaseModel):
    arrivee_particulier: float = Field(0, ge=0)
    arrivee_pro_b2b: float = Field(0, ge=0)
    arrivee_axes: float = Field(0, ge=0)
    depot_retrait: float = Field(0, ge=0)
    depart_particulier: float = Field(0, ge=0)
    depart_pro_b2b: float = Field(0, ge=0)
    depart_axes: float = Field(0, ge=0)

class SimulerCentreParTypeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    centre_id: Optional[int] = Field(None, alias="centreId")
    volumes: VolumesParType
    heures_net_disponibles: float = Field(8.0, gt=0, alias="heuresNetDisponibles")

    @model_validator(mode="before")
    def _normalize(cls, values: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(values, dict):
            return values
        # accepter centre_id OU centreId
        if values.get("centre_id") is None and values.get("centreId") is not None:
            values["centre_id"] = values["centreId"]
        # forcer volumes en objet
        vols = values.get("volumes")
        if vols is not None and not isinstance(vols, VolumesParType) and isinstance(vols, dict):
            values["volumes"] = VolumesParType(**vols)
        return values


class TacheParType(BaseModel):
    tache_id: Optional[int]
    centre_poste_id: Optional[int]
    poste_id: Optional[int]
    poste_label: Optional[str]
    task_label: str
    type_volume: str
    moyenne_min: float
    volume: float
    heures: float


class PosteResultat(BaseModel):
    poste_id: Optional[int]
    centre_poste_id: Optional[int]
    poste_label: Optional[str]
    total_heures: float
    etp_calcule: float


class SimulerCentreParTypeResponse(BaseModel):
    centre_id: int
    centre_label: str
    volumes_by_type: Dict[str, float]
    total_heures: float
    fte_global: float
    postes: List[PosteResultat]
    taches: List[TacheParType]
