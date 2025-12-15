from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.refs import router as refs_router
from app.api.simulate import router as simulate_router
from app.api.views import router as views_router
from app.api.auth import router as auth_router
from app.api.choixActivite import router as activite_router
from app.api.directions import router as directions_router
from app.api.simuler_centre_par_type import router as simuler_centre_par_type_router

from app.api import refs
from app.api.simulation import router as simulation_router

app = FastAPI(
    title="API Simulation Effectifs",
    description="API pour la simulation des effectifs avec flux en cascade",
    version="1.0.0"
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
