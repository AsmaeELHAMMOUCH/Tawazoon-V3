"""Entrypoint for the FastAPI backend."""
from fastapi import FastAPI

from app.api.routes.simulation_globale import router as simulation_router


app = FastAPI(title="Simulateur RH Backend", version="1.0.0")

app.include_router(simulation_router, prefix="/api")
