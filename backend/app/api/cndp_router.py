# backend/app/api/cndp_router.py
"""
Dedicated API router for CNDP simulation.
Provides a clean, isolated endpoint separate from the main simulation flow.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
import io

from app.core.db import get_db
from app.models.db_models import Centre, Poste, CentrePoste, Tache, HierarchiePostes
from app.services.cndp_engine import (
    run_cndp_simulation,
    CNDPInputVolumes,
    CNDPParameters,
    CNDPSimulationResult,
    CNDPTaskResult
)


router = APIRouter(prefix="/cndp", tags=["CNDP Simulation"])


# ==================== Pydantic Models ====================

class CNDPVolumesIn(BaseModel):
    """Input volumes for CNDP simulation."""
    amana_import: float = Field(0.0, ge=0, description="Annual Amana Import volume")
    amana_export: float = Field(0.0, ge=0, description="Annual Amana Export volume")


class CNDPParamsIn(BaseModel):
    """CNDP-specific parameters."""
    pct_sac: float = Field(60.0, ge=0, le=100, description="% of volume in Sacs")
    pct_ed: float = Field(40.0, ge=0, le=100, description="% of volume in ED (Hors Sac / Colis)")
    pct_retenue: float = Field(1.0, ge=0, le=100, description="% Customs retention")
    pct_echantillon: float = Field(5.0, ge=0, le=100, description="% Sampling")
    colis_par_sac: float = Field(5.0, ge=1, description="Number of parcels per sac")
    nb_jours_ouvres_an: int = Field(264, ge=1, description="Working days per year")
    productivite: float = Field(100.0, ge=1, le=200, description="Productivity %")
    heures_par_jour: float = Field(8.0, ge=1, le=24, description="Hours per day")
    idle_minutes: float = Field(0.0, ge=0, description="Dead time in minutes")
    shift: int = Field(1, ge=1, description="Number of shifts")


class CNDPSimulateRequest(BaseModel):
    """Request payload for CNDP simulation."""
    centre_id: int = Field(1965, description="CNDP Centre ID")
    poste_id: Optional[int] = Field(None, description="DEPRECATED: Use poste_code instead")
    poste_code: Optional[str] = Field(None, description="Optional: Filter by poste code (code_resp)")
    volumes: CNDPVolumesIn = Field(default_factory=CNDPVolumesIn)
    params: CNDPParamsIn = Field(default_factory=CNDPParamsIn)


class CNDPTaskOut(BaseModel):
    """Output model for a single task result."""
    task_id: int
    task_name: str
    unite_mesure: str
    produit: str
    moyenne_min: float
    volume_source: str
    volume_annuel: float
    volume_journalier: float
    heures_calculees: float
    formule: str


class CNDPSimulateResponse(BaseModel):
    """Response payload for CNDP simulation."""
    tasks: List[CNDPTaskOut]
    total_heures: float
    heures_net_jour: float
    fte_calcule: float
    fte_arrondi: int
    debug_info: dict = {}


# ==================== Endpoints ====================

@router.post("/simulate", response_model=CNDPSimulateResponse)
def simulate_cndp(request: CNDPSimulateRequest, db: Session = Depends(get_db)):
    """
    Run CNDP simulation with the provided volumes and parameters.
    
    This endpoint is isolated from the main /simulate endpoint for clarity.
    The calculation logic is strictly based on the unite_mesure column:
    - SAC -> Apply %Sac and divide by colis_par_sac
    - COLIS -> Apply %ED
    - Other -> 100% of volume
    """
    try:
        # Convert Pydantic models to dataclasses
        volumes = CNDPInputVolumes(
            amana_import=request.volumes.amana_import,
            amana_export=request.volumes.amana_export
        )
        
        params = CNDPParameters(
            pct_sac=request.params.pct_sac,
            pct_ed=request.params.pct_ed,
            pct_retenue=request.params.pct_retenue,
            pct_echantillon=request.params.pct_echantillon,
            colis_par_sac=request.params.colis_par_sac,
            nb_jours_ouvres_an=request.params.nb_jours_ouvres_an,
            productivite=request.params.productivite,
            heures_par_jour=request.params.heures_par_jour,
            idle_minutes=request.params.idle_minutes,
            shift=request.params.shift
        )
        
        # Run simulation
        result: CNDPSimulationResult = run_cndp_simulation(
            db=db,
            centre_id=request.centre_id,
            volumes=volumes,
            params=params,
            poste_code_filter=request.poste_code
        )
        
        # Convert to response
        tasks_out = [
            CNDPTaskOut(
                task_id=t.task_id,
                task_name=t.task_name,
                unite_mesure=t.unite_mesure,
                produit=t.produit,
                moyenne_min=t.moyenne_min,
                volume_source=t.volume_source,
                volume_annuel=t.volume_annuel,
                volume_journalier=t.volume_journalier,
                heures_calculees=t.heures_calculees,
                formule=t.formule
            )
            for t in result.tasks
        ]
        
        return CNDPSimulateResponse(
            tasks=tasks_out,
            total_heures=result.total_heures,
            heures_net_jour=result.heures_net_jour,
            fte_calcule=result.fte_calcule,
            fte_arrondi=result.fte_arrondi,
            debug_info=result.debug_info
        )
        
    except Exception as e:
        import traceback
        print(f"❌ CNDP Simulation Error: {e}", flush=True)
        print(traceback.format_exc(), flush=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks")
def get_cndp_tasks(
    centre_id: int = 1965,
    poste_code: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get the list of tasks for CNDP centre (for debugging/inspection).
    """
    
    query = (
        db.query(Tache)
        .join(CentrePoste)
        .filter(CentrePoste.centre_id == centre_id)
    )
    
    if poste_code:
        query = query.filter(CentrePoste.code_resp == poste_code)
    
    taches = query.all()
    
    return {
        "count": len(taches),
        "tasks": [
            {
                "id": t.id,
                "nom_tache": t.nom_tache,
                "unite_mesure": t.unite_mesure,
                "produit": t.produit,
                "moyenne_min": t.moyenne_min,
                "centre_poste_id": t.centre_poste_id
            }
            for t in taches
        ]
    }


@router.get("/postes")
def list_cndp_postes(
    centre_id: int = Query(1965, description="ID du centre CNDP"),
    db: Session = Depends(get_db),
):
    """
    Retourne la liste des postes pour le centre CNDP, identifiés par code_resp.
    """
    try:
        query = (
            db.query(
                Poste.id,
                CentrePoste.id.label("centre_poste_id"),
                Poste.label,
                Poste.type_poste,
                func.coalesce(CentrePoste.effectif_actuel, 0).label("effectif_actuel"),
                CentrePoste.code_resp.label("code"),
                func.coalesce(HierarchiePostes.label, "Autre").label("categorie")
            )
            .join(CentrePoste, CentrePoste.code_resp == Poste.Code)
            .outerjoin(HierarchiePostes, Poste.hie_poste == HierarchiePostes.code)
            .filter(CentrePoste.centre_id == centre_id)
            .order_by(Poste.label)
        )
         
        rows = query.all()
        return [dict(r._asdict()) for r in rows]

    except Exception as e:
        import traceback
        print(f"❌ Error fetching CNDP postes: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import_tasks")
async def import_cndp_tasks(
    file: UploadFile = File(...),
    centre_id: int = Form(1965),
    db: Session = Depends(get_db)
):
    """
    Import tasks from an Excel file, replacing specific tasks for the CNDP center.
    This effectively clears old tasks for this center and imports the new ones.
    
    Expected Excel Columns:
    - nom_tache
    - responsable 1 (Poste Name)
    - responsable 2 (Optional, second Poste Name)
    - unite_mesure
    - moyenne_min
    - produit (Import/Export)
    - famille_uo (Optional)
    - moy_sec (Optional)
    """
    VALID_EXTENSIONS = {".xlsx", ".xls"}
    import os
    filename, ext = os.path.splitext(file.filename)
    if ext.lower() not in VALID_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload an Excel file (.xlsx, .xls)")

    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Clean column names: lower() and strip()
        df.columns = df.columns.astype(str).str.lower().str.strip()
        
        required_cols = ["nom_tache", "unite_mesure"]
        # check if at least one responsible column exists
        has_resp1 = "responsable 1" in df.columns
        has_resp2 = "responsable 2" in df.columns
        if not (has_resp1 or has_resp2) and "responsable" not in df.columns:
             raise HTTPException(status_code=400, detail="Missing 'responsable' column (or 'responsable 1'/'responsable 2')")
             
        # Basic validation
        for col in required_cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Missing required column: {col}")

        # 1. Clear existing tasks for this center
        # Find all CentrePoste for this center
        existing_cp = db.query(CentrePoste).filter(CentrePoste.centre_id == centre_id).all()
        cp_ids = [cp.id for cp in existing_cp]
        
        if cp_ids:
            # Delete tasks linked to these CentrePoste
            db.query(Tache).filter(Tache.centre_poste_id.in_(cp_ids)).delete(synchronize_session=False)
            db.commit() # Commit deletion

        # 2. Iterate and Create
        created_count = 0
        
        # Helper to get or create Link
        # Cache Postes to avoid DB spam
        all_postes = {p.label.lower(): p for p in db.query(Poste).all()}
        
        # Cache CentrePostes for this center
        # (PosteID -> CentrePosteObj)
        cp_map = {cp.poste_id: cp for cp in existing_cp}
        
        def get_or_create_cp(poste_label):
            if not poste_label or pd.isna(poste_label):
                return None
            
            clean_label = str(poste_label).strip()
            lower_label = clean_label.lower()
            
            # Find Poste
            poste = all_postes.get(lower_label)
            if not poste:
                # Try simple fuzzy match or create? For now, create if flexible, but maybe just log warning
                # Let's create a new Poste if it doesn't exist for flexibility
                poste = Poste(label=clean_label, type_poste="MOD") # Default to MOD
                db.add(poste)
                db.flush() # get ID
                all_postes[lower_label] = poste
            
            # Find CentrePoste
            if poste.id in cp_map:
                return cp_map[poste.id]
            else:
                # Create link
                new_cp = CentrePoste(centre_id=centre_id, poste_id=poste.id, effectif_actuel=0)
                db.add(new_cp)
                db.flush()
                cp_map[poste.id] = new_cp
                return new_cp

        for _, row in df.iterrows():
            nom = row.get("nom_tache")
            if pd.isna(nom): continue
            
            unite = row.get("unite_mesure", "Colis")
            moy_min = pd.to_numeric(row.get("moyenne_min"), errors='coerce') or 0.0
            produit = row.get("produit", "")
            famille = row.get("famille_uo", "")
            moy_sec = pd.to_numeric(row.get("moy_sec"), errors='coerce') or 0.0
            
            # Determine responsibles to process
            responsables = []
            
            # Handle 'responsable 1' and 'responsable 2'
            if "responsable 1" in df.columns and not pd.isna(row["responsable 1"]):
                responsables.append(row["responsable 1"])
            
            if "responsable 2" in df.columns and not pd.isna(row["responsable 2"]):
                responsables.append(row["responsable 2"])
                
            # Fallback to simple 'responsable' or 'poste' if specific cols missing
            if not responsables:
                if "responsable" in df.columns and not pd.isna(row["responsable"]):
                     responsables.append(row["responsable"])
                elif "poste" in df.columns and not pd.isna(row["poste"]):
                     responsables.append(row["poste"])

            # Create task for each responsible
            for resp_label in responsables:
                cp = get_or_create_cp(resp_label)
                if cp:
                    new_tache = Tache(
                        centre_poste_id=cp.id,
                        nom_tache=str(nom),
                        unite_mesure=str(unite),
                        moyenne_min=float(moy_min),
                        produit=str(produit) if not pd.isna(produit) else None,
                        famille_uo=str(famille) if not pd.isna(famille) else None,
                        moy_sec=float(moy_sec),
                        etat='ACTIF' 
                    )
                    db.add(new_tache)
                    created_count += 1
        
        db.commit()
        return {"status": "success", "imported_tasks": created_count, "message": f"Successfully imported {created_count} tasks."}

    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
