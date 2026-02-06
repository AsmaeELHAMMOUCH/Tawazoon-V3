from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import text, func, select
from typing import List, Optional
from pydantic import BaseModel

from app.core.db import get_db
from app.models import db_models

router = APIRouter(tags=["Builder"])

# --- Schemes ---

class DistinctItem(BaseModel):
    label: str
    value: str

class TaskItem(BaseModel):
    nom_tache: str
    famille_uo: str
    produit: str
    unite_mesure: str
    moyenne_min: float
    # We might need to store more reference info to clone it

class CreateCentreRequest(BaseModel):
    nom_centre: str
    region_id: int
    postes: List[str] # List of Poste Labels to attach
    taches: List[TaskItem] # List of items to insert for RELEVANT postes? 
    # The user request is vague on linking Tasks to Postes. 
    # "puis liste des taches ... pui donne la main pour renter les volume"
    # Usually tasks are specific to a Poste.
    # We will assume for now that tasks are replicated to ALL added postes OR we might need a better strcuture.
    # However, to start simple: Creates Centre, Links Postes. 
    # Tasks: Maybe the user selects tasks to be added to the *Centre*?
    # But DB requires Tache -> CentrePoste.
    # Strategy: For each selected Poste, we check if the selected Tasks are "compatible" (start simple: add all selected tasks to all selected postes? No, that's wrong).
    # Better Strategy: The UI should probably ask to Map Tasks to Postes.
    # But sticking to user request: "liste des taches... affecter a ce produit et famille".
    
    # We will accept a simplified structure for now.
    
    selected_tasks_map: List[dict] 
    # Expected: [{ "poste_label": "GUICHETIER", "tasks": [ {nom_tache, ...} ] }]

# --- Endpoints ---

@router.get("/ref/postes", response_model=List[DistinctItem])
def get_ref_postes(db: Session = Depends(get_db)):
    """Retourne la liste complète des types de postes distincts (Labels)"""
    results = db.execute(text("SELECT DISTINCT label, type_poste FROM dbo.postes ORDER BY label")).all()
    return [{"label": r[0], "value": r[0]} for r in results]

@router.get("/ref/produits", response_model=List[DistinctItem])
def get_ref_produits(db: Session = Depends(get_db)):
    """Retourne la liste des produits distincts"""
    results = db.execute(text("SELECT DISTINCT produit FROM dbo.taches WHERE produit IS NOT NULL ORDER BY produit")).all()
    return [{"label": r[0], "value": r[0]} for r in results]

@router.get("/ref/familles", response_model=List[DistinctItem])
def get_ref_familles(db: Session = Depends(get_db)):
    """Retourne la liste des familles distinctes"""
    results = db.execute(text("SELECT DISTINCT famille_uo FROM dbo.taches WHERE famille_uo IS NOT NULL ORDER BY famille_uo")).all()
    return [{"label": r[0], "value": r[0]} for r in results]

@router.get("/ref/categories", response_model=List[DistinctItem])
def get_ref_categories(db: Session = Depends(get_db)):
    """Retourne la liste des catégories (Typologies)"""
    results = db.execute(text("SELECT id, label FROM dbo.categories ORDER BY label")).all()
    # Note: DistinctItem expects 'value' as string. We'll cast ID to string for value.
    return [{"label": r.label, "value": str(r.id)} for r in results]

@router.get("/ref/directions", response_model=List[DistinctItem])
def get_ref_directions(db: Session = Depends(get_db)):
    """Retourne la liste des directions"""
    results = db.execute(text("SELECT id, label FROM dbo.directions ORDER BY label")).all()
    return [{"label": r.label, "value": str(r.id)} for r in results]

@router.get("/ref/taches")
def get_ref_taches_catalog(
    produit: Optional[str] = None, 
    famille: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    """
    Retourne un catalogue de tâches uniques filtré.
    On regroupe par nom_tache pour éviter les doublons (même tâche dans plusieurs centres).
    On prend la moyenne des temps (ou le max/min/avg ?).
    """
    query = """
    SELECT 
        nom_tache, 
        MAX(famille_uo) as famille_uo, 
        MAX(produit) as produit, 
        MAX(unite_mesure) as unite_mesure, 
        AVG(moyenne_min) as moyenne_min
    FROM dbo.taches
    WHERE 1=1
    """
    params = {}
    if produit:
        query += " AND produit = :produit"
        params["produit"] = produit
    if famille:
        query += " AND famille_uo = :famille"
        params["famille_uo"] = famille
        
    query += " GROUP BY nom_tache ORDER BY nom_tache"
    
    results = db.execute(text(query), params).mappings().all()
    return [dict(r) for r in results]


class NewCentrePayload(BaseModel):
    nom: str
    region_id: int
    direction_id: Optional[int] = None # New
    categorie_id: Optional[int] = None # New (Typologie)
    postes_labels: List[str]
    tasks_mapping: Optional[List[dict]] = [] # Made optional as we remove task step

@router.post("/create")
def create_new_centre(payload: NewCentrePayload, db: Session = Depends(get_db)):
    # 1. Create Centre
    # Check if exists
    existing = db.execute(text("SELECT id FROM dbo.centres WHERE label = :label"), {"label": payload.nom}).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Un centre avec ce nom existe déjà.")

    # Insert Centre
    new_centre = db_models.Centre(
        label=payload.nom,
        region_id=payload.region_id,
        categorie_id=payload.categorie_id,
        direction_id=payload.direction_id, # Added direction_id
        t_aps=0
    )
    db.add(new_centre)
    db.flush() # Get ID
    
    created_postes_map = {} # label -> centre_poste_id

    # 2. Create Postes
    # For each label, find the 'Poste' reference ID.
    for p_label in payload.postes_labels:
        # Find Ref Poste
        ref_poste = db.query(db_models.Poste).filter(db_models.Poste.label == p_label).first()
        if not ref_poste:
            # Create if not exists in Ref? Maybe safer not to pollute Ref.
            # Assuming picking from existing.
            continue
            
        # Link CentrePoste
        cp = db_models.CentrePoste(
            centre_id=new_centre.id,
            poste_id=ref_poste.id,
            effectif_actuel=0
        )
        db.add(cp)
        db.flush()
        created_postes_map[p_label] = cp.id

    # 3. Create Tasks (Optional now)
    # AUTOMATIC IMPORT from default Excel file as logic requested by User ("automatiqment en backend")
    # Path to reference file. Relative to execution or absolute.
    # We'll try to find a known template.
    import os
    from app.api.taches_mgmt import _process_import_taches
    
    # Potential locations for the referentiel
    # Note: cwd is usually backend/ root when running uvicorn
    
    # Determine template based on typology
    template_filename = "template_taches.xlsx" # Default
    
    # Check category label
    if payload.categorie_id:
        cat_rec = db.execute(text("SELECT label FROM dbo.categories WHERE id = :cid"), {"cid": payload.categorie_id}).fetchone()
        if cat_rec:
            cat_label = (cat_rec[0] or "").upper().strip()
            if cat_label.startswith("AM"):
                template_filename = "template_taches_am.xlsx"
    
    # We could also check payload.nom or other fields if needed, but category is safest.
    
    possible_paths = [
        f"../frontend/public/{template_filename}"
    ]
    
    ref_file_path = None
    for p in possible_paths:
        if os.path.exists(p):
            ref_file_path = p
            break
            
    if ref_file_path:
        print(f"Auto-importing tasks from {ref_file_path} for Centre {new_centre.id}")
        try:
            with open(ref_file_path, "rb") as f:
                content = f.read()
            _process_import_taches(content, new_centre.id, db)
        except Exception as e:
            print(f"Error auto-importing tasks: {e}")
    else:
        print("Warning: No referentiel_taches.xlsx found for auto-import.")

    db.commit()
    return {"status": "success", "id": new_centre.id, "label": new_centre.label}


class UpdateCentrePayload(BaseModel):
    nom: str
    region_id: int
    direction_id: Optional[int] = None
    categorie_id: Optional[int] = None

@router.put("/update/{centre_id}")
def update_centre(centre_id: int, payload: UpdateCentrePayload, db: Session = Depends(get_db)):
    centre = db.query(db_models.Centre).filter(db_models.Centre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre non trouvé")
    
    centre.label = payload.nom
    centre.region_id = payload.region_id
    centre.direction_id = payload.direction_id
    centre.categorie_id = payload.categorie_id
    
    db.commit()
    return {"status": "success", "id": centre.id, "label": centre.label}

@router.get("/find_similar/{categorie_id}")
def find_similar_centre(categorie_id: int, db: Session = Depends(get_db)):
    print(f"DEBUG: find_similar_centre hit with {categorie_id}")
    """Trouve un centre existant avec la même typologie pour simulation"""
    # On cherche un centre de cette catégorie qui a des données (optionnel)
    # Trié par ID DESC pour avoir le plus récent
    query = text("""
        SELECT TOP 1 id, label 
        FROM dbo.centres 
        WHERE categorie_id = :cid
        ORDER BY id DESC
    """)
    
    result = db.execute(query, {"cid": categorie_id}).fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="Aucun centre similaire trouvé pour cette typologie.")
        
    return {"id": result.id, "label": result.label}
