"""Pydantic models describing the simulation globale payloads."""
from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field, validator


class SimulationGlobaleRequest(BaseModel):
    sacs: float = Field(..., ge=0)
    dossiers_mois: float = Field(..., ge=0)
    productivite: float = Field(...)

    @validator("productivite")
    def positive_productivite(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("La productivité doit être strictement supérieure à 0.")
        return v


class SimulationGlobaleRow(BaseModel):
    position: str
    actuel: int
    calcule: int
    recommande: int
    ecart_calcule_vs_actuel: int
    ecart_recommande_vs_actuel: int
    ecart_recommande_vs_calcule: int


class SimulationGlobaleTotal(SimulationGlobaleRow):
    pass


class SimulationGlobaleChart(BaseModel):
    categories: List[str]
    actuel: List[int]
    calcule: List[int]
    recommande: List[int]


class SimulationGlobaleResponse(BaseModel):
    sacs: float
    dossiers_mois: float
    productivite: float
    dossiers_jour: float
    heures_net: float
    rows: List[SimulationGlobaleRow]
    total: SimulationGlobaleTotal
    chart: SimulationGlobaleChart
