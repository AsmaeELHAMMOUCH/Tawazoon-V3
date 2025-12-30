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

from app.core.db import engine, Base
from app.models import db_models, scoring_models

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API Simulation Effectifs",
    description="API pour la simulation des effectifs avec flux en cascade",
    version="1.0.0",
    debug=True
)
@app.exception_handler(Exception)
async def debug_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()  # ✅ affiche le traceback complet dans le terminal
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "where": "unhandled_exception"}
    )
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
# Force reload 12/29/2025 14:39:35
