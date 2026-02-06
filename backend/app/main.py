# Force Reload Timestamp: 2025-12-25 09:35
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import traceback

from app.api.refs import router as refs_router
from app.api.simulation import router as simulation_router
from app.api.views import router as views_router
from app.api.auth import router as auth_router
from app.api.choixActivite import router as activite_router
from app.api.directions import router as directions_router
from app.api.simuler_centre_par_type import router as simuler_centre_par_type_router
from app.api.scoring import router as scoring_router
from app.api.export import router as export_router # 🆕 Ajoût
from app.api.volumes import router as volumes_router # 🆕 Nouvelle architecture Flux/Sens/Segment
from app.api.simulation_direct import router as simulation_direct_router # 🆕 Simulation directe sans VolumeSimulation
from app.api.simulation_data_driven import router as simulation_data_driven_router # 🆕 Architecture 100% data-driven
from app.api.national import router as national_router # 🆕 Simulation nationale
from app.api.categorisation import router as categorisation_router # 🆕 Catégorisation
from app.api.ccp import router as ccp_router # 🆕 CCP Standalone Module
from app.api.cna import router as cna_router # 🆕 CNA Standalone Module
from app.api.cci import router as cci_router # 🆕 CCI Standalone Module

from app.core.db import engine, Base
from app.models import db_models, scoring_models, categorisation_models

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)


# Force Reload Trigger
app = FastAPI(
    title="Simulateur RH API",
    description="API pour la simulation des effectifs avec flux en cascade",
    version="1.0.0",
    debug=True
)


@app.exception_handler(Exception)
async def debug_exception_handler(request: Request, exc: Exception):
    import traceback
    with open("backend_error.log", "a", encoding="utf-8") as f:
        f.write("-" * 80 + "\n")
        f.write(f"Exception: {str(exc)}\n")
        traceback.print_exc(file=f)
    traceback.print_exc()  # ✅ affiche le traceback complet dans le terminal
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "where": "unhandled_exception"}
    )
@app.middleware("http")
async def log_requests(request: Request, call_next):
    with open("backend_requests.log", "a", encoding="utf-8") as f:
        f.write(f"REQUEST: {request.method} {request.url}\n")
    response = await call_next(request)
    with open("backend_requests.log", "a", encoding="utf-8") as f:
        f.write(f"RESPONSE: {response.status_code}\n")
    return response

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],# à restreindre plus tard si besoin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure les routeurs
app.include_router(auth_router, prefix="/api")
app.include_router(activite_router, prefix="/api")
app.include_router(directions_router, prefix="/api")

app.include_router(refs_router, prefix="/api")
# 👇 Router "simulation" : /simulate, /vue-centre-optimisee, /vue-centre-sans-regroupement, etc.
app.include_router(simulation_router, prefix="/api")    
app.include_router(scoring_router, prefix="/api")
app.include_router(export_router, prefix="/api") # ✅ Ajoût correct ici
app.include_router(volumes_router) # ✅ Nouvelle architecture Flux/Sens/Segment
app.include_router(simulation_direct_router) # ✅ Simulation directe sans VolumeSimulation
app.include_router(simulation_data_driven_router) # ✅ Architecture 100% data-driven
app.include_router(national_router, prefix="/api") # ✅ Simulation nationale
app.include_router(categorisation_router, prefix="/api") # ✅ Catégorisation
app.include_router(ccp_router, prefix="/api") # ✅ CCP Standalone Module
app.include_router(cna_router, prefix="/api") # ✅ CNA Standalone Module
app.include_router(cci_router, prefix="/api") # ✅ CCI Standalone Module
#app.include_router(views_router, prefix="/api")
#app.include_router(simuler_centre_par_type_router, prefix="/api")

@app.get("/")
def root():
    """Point d'entrée principal de l'API"""
    return {
        "message": "API Simulation Effectifs",
        "version": "1.0.0",
        "endpoints": [
           "/api/regions",
            "/api/centres",
            "/api/postes",
            "/api/taches",
            "/api/categories",
            "/api/simulate",
            "/api/login",
            "/api/me",
            "/api/activites"
        ]
    }

@app.get("/ping")
def ping():
    return {"message": "pong"}

VERSION = "Version B"
# Force reload
# Force reload 01/05/2026 17:18:00
