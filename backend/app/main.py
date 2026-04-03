from app.api.effectifs_par_position3 import router as effectifs_par_position3_router
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import logging
import traceback

from app.api.refs import router as refs_router
from app.api.simulation import router as simulation_router
from app.api.views import router as views_router
from app.api.auth import router as auth_router
from app.api.choixActivite import router as activite_router
from app.api.directions import router as directions_router
from app.api.simuler_centre_par_type import router as simuler_centre_par_type_router
from app.api.scoring import router as scoring_router
from app.api.export import router as export_router
from app.api.volumes import router as volumes_router
from app.api.simulation_direct import router as simulation_direct_router
from app.api.simulation_data_driven import router as simulation_data_driven_router
from app.api.national import router as national_router
from app.api.categorisation import router as categorisation_router
from app.api.builder import router as builder_router
from app.api.cndp_router import router as cndp_router #  CNDP Isolation
from app.api.bandoeng_router import router as bandoeng_router #  Bandoeng Isolation
from app.api.ccp import router as ccp_router #  CCP Standalone Module
from app.api.cna import router as cna_router #  CNA Standalone Module
from app.api.cci import router as cci_router #  CCI Standalone Module
from app.api.comparaison_effectif import router as comparaison_effectif_router
from app.api.effectif_global import router as effectif_global_router
from app.api.normes import router as normes_router
from app.api.capacite_nominale import router as capacite_nominale_router
from app.api.chronogramme import router as chronogramme_router
from app.api.schema_process import (
    schema_router as schema_process_router,
    assets_router as schema_assets_router,
)
from app.api.referentiel import router as referentiel_router
from app.api.recommande import router as recommande_router
from app.api.comparaison_actuel_reco import router as comparaison_actuel_reco_router
from app.api.recommande_capacite import router as recommande_capacite_router
from app.api.recommande_schema import router as recommande_schema_router
from app.api.recommande_chronogramme import router as recommande_chronogramme_router
from app.api.routes.ratios_productivite import router as ratios_productivite_router
from app.api.economies_budgetaires import router as economies_budgetaires_router
from app.api.simulation_globale import router as simulation_globale_router
from app.api.comparatif_positions import router as comparatif_positions_router

from app.core.config import settings
from app.core.db import engine, Base, get_db
from app.models import db_models, scoring_models, categorisation_models
# ...

logger = logging.getLogger("uvicorn.error")


# Create tables if they don't exist
Base.metadata.create_all(bind=engine)


# Force Reload Trigger
app = FastAPI(
    title="Simulateur RH API",
    description="API pour la simulation des effectifs avec flux en cascade",
    version="1.0.0",
    debug=True
)


@app.on_event("startup")
def dump_routes():
    for r in app.router.routes:
        try:
            logger.warning(
                "ROUTE %s %s name=%s endpoint=%s",
                getattr(r, "methods", None),
                getattr(r, "path", None),
                getattr(r, "name", None),
                getattr(r, "endpoint", None),
            )
        except Exception:
            pass

app.mount("/assets", StaticFiles(directory=settings.assets_dir), name="assets")

@app.get("/debug/routes")
def get_routes():
    routes = []
    for route in app.routes:
        if hasattr(route, "path"):
            routes.append(route.path)
    return routes


@app.exception_handler(Exception)
async def debug_exception_handler(request: Request, exc: Exception):
    import traceback
    with open("backend_error.log", "a", encoding="utf-8") as f:
        f.write("-" * 80 + "\n")
        f.write(f"Exception: {str(exc)}\n")
        traceback.print_exc(file=f)
    traceback.print_exc()  #  affiche le traceback complet dans le terminal
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
    allow_origins=["*"],#  restreindre plus tard si besoin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure les routeurs
app.include_router(auth_router, prefix="/api")
app.include_router(activite_router, prefix="/api")
app.include_router(directions_router, prefix="/api")

app.include_router(refs_router, prefix="/api")
#  Router "simulation" : /simulate, /vue-centre-optimisee, /vue-centre-sans-regroupement, etc.
app.include_router(simulation_router, prefix="/api")    
app.include_router(scoring_router, prefix="/api")
app.include_router(export_router, prefix="/api") #  Ajot correct ici
app.include_router(volumes_router) #  Nouvelle architecture Flux/Sens/Segment
app.include_router(simulation_direct_router) #  Simulation directe sans VolumeSimulation
app.include_router(simulation_data_driven_router) #  Architecture 100% data-driven
#  Builder (Mounted explicitly) - Moved UP to ensure priority/loading check
#  Builder (Mounted explicitly) - Moved UP to ensure priority/loading check
print(f">>>> REGISTERING BUILDER ROUTER AT /api/builder. Routes count: {len(builder_router.routes)}")
app.include_router(builder_router, prefix="/api/builder") 




app.include_router(national_router, prefix="/api") #  Simulation nationale
print(f" [MAIN] National Router included. Routes starting with /api/simulation/template:")
for route in app.routes:
    if hasattr(route, "path") and "/simulation/template" in route.path:
        print(f"   -> {route.path} [{route.methods}]")

app.include_router(categorisation_router, prefix="/api") #  Catgorisation
app.include_router(cndp_router, prefix="/api") #  CNDP Isolation
app.include_router(bandoeng_router, prefix="/api") #  Bandoeng Isolation
app.include_router(ccp_router, prefix="/api") #  CCP Standalone Module
app.include_router(cna_router, prefix="/api") #  CNA Standalone Module
app.include_router(cci_router, prefix="/api") #  CCI Standalone Module
app.include_router(effectif_global_router, prefix="/api")
app.include_router(comparaison_effectif_router, prefix="/api")
app.include_router(effectifs_par_position3_router, prefix="/api")
app.include_router(normes_router, prefix="/api")
app.include_router(capacite_nominale_router, prefix="/api")
app.include_router(chronogramme_router, prefix="/api")
app.include_router(schema_process_router, prefix="/api")
app.include_router(schema_assets_router, prefix="/api")
app.include_router(referentiel_router, prefix="/api")
app.include_router(recommande_router, prefix="/api")
app.include_router(comparaison_actuel_reco_router, prefix="/api")
app.include_router(recommande_capacite_router, prefix="/api")
app.include_router(recommande_schema_router, prefix="/api")
app.include_router(recommande_chronogramme_router, prefix="/api")
app.include_router(simulation_globale_router, prefix="/api")
app.include_router(ratios_productivite_router, prefix="/api")
app.include_router(economies_budgetaires_router)
app.include_router(comparatif_positions_router)

#app.include_router(views_router, prefix="/api")
from app.api.taches_mgmt import router as taches_mgmt_router #  Taches Management
from app.api.postes_mgmt import router as postes_mgmt_router #  Postes Management

# ... (imports)

# ...

# Inclure les routeurs
# ...
app.include_router(taches_mgmt_router, prefix="/api")

print("--- MOUNTING POSTES MGMT ROUTER ---")
app.include_router(postes_mgmt_router, prefix="/api")
print("--- POSTES MGMT ROUTER MOUNTED ---")

app.include_router(simuler_centre_par_type_router, prefix="/api")


# Import Fallback
from app.api.postes_mgmt import get_all_centre_postes as fallback_get_all

@app.get("/secours")
def secours_global_postes(db: Session = Depends(get_db)):
    return fallback_get_all(db)

@app.on_event("startup")
async def startup_event():
    print("\n" + "="*50)
    print("REGISTERED ROUTES:")
    for route in app.routes:
        if hasattr(route, "path"):
            methods = getattr(route, "methods", ["ANY"])
            print(f" - {route.path} [{methods}]")
    print("="*50 + "\n")


@app.get("/")
def root():

    """Point d'entre principal de l'API"""
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

VERSION = "Version D"
# Force reload
# Force reload 01/05/2026 17:18:00
# FORCE API RESTART
