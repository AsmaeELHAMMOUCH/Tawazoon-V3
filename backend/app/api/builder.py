from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import text, func, select
from typing import List, Optional
from pydantic import BaseModel

from app.core.db import get_db
from app.models import db_models
from app.services.bandoeng_engine import (
    BandoengInputVolumes, BandoengParameters, run_bandoeng_simulation
)
import openpyxl
import os

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

class VirtualSimulationRequest(BaseModel):
    typology: str
    volumes: dict
    params: dict

@router.post("/simulate-test")
def simulate_test(payload: VirtualSimulationRequest, db: Session = Depends(get_db)):
    """
    Lance une simulation 'virtuelle' basée uniquement sur le référentiel Excel de la typologie.
    Ne touche pas à la base de données.
    """
    # Extract short code (e.g., 'AM' from 'AM- Agence Messagerie')
    typo_code = payload.typology.split("-")[0].split(" ")[0].upper().strip()
    template_name = f"{typo_code}.xlsx"
    
    # Correction : Le dossier resources/typologies contient les fichiers
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # app/ 
    template_path = os.path.join(base_dir, "resources", "typologies", template_name)
    
    # Fallback pour Standard
    if not os.path.exists(template_path):
        template_path = os.path.join(base_dir, "resources", "typologies", "Standard.xlsx")
        
    if not os.path.exists(template_path):
        raise HTTPException(status_code=500, detail=f"Référentiel {template_name} introuvable.")

    try:
        wb = openpyxl.load_workbook(template_path, data_only=True)
        ws = wb.active
        
        # Mapping des colonnes (Basé sur le format observé)
        # Headers: ['Nom de tâche', 'Produit', 'Famille', 'Phase', 'Unité de mesure', 'base de calcul', 'Responsable 1', 'Responsable 2', 'Temps_min', 'Temps_sec']
        
        virtual_tasks = []
        rows = list(ws.rows)
        header = [str(cell.value).lower().strip() for cell in rows[0]]
        
        def find_idx(candidates):
            for c in candidates:
                if c in header: return header.index(c)
            return None

        idx_nom = find_idx(["nom de tâche", "nom de tache", "tâche", "tache"])
        idx_prod = find_idx(["produit"])
        idx_fam = find_idx(["famille"])
        idx_phase = find_idx(["phase"])
        idx_unit = find_idx(["unité de mesure", "unite de mesure", "unité", "unite"])
        idx_base = find_idx(["base de calcul", "base"])
        idx_resp1 = find_idx(["responsable 1", "responsable"])
        idx_resp2 = find_idx(["responsable 2"])
        idx_min = find_idx(["temps_min", "min", "minutes"])
        idx_sec = find_idx(["temps_sec", "sec", "secondes"])

        # 1.5 Récupérer les libellés des postes MOI pour les exclure
        moi_labels = [r[0] for r in db.execute(text("SELECT label FROM dbo.postes WHERE type_poste = 'MOI'")).all()]
        moi_labels_norm = [str(l).strip().upper() for l in moi_labels]

        for r_idx, row in enumerate(rows[1:]):
            nom = str(row[idx_nom].value) if idx_nom is not None else None
            if not nom or nom == "None": continue
            
            # Temps
            t_min = float(row[idx_min].value or 0) if idx_min is not None else 0
            t_sec = float(row[idx_sec].value or 0) if idx_sec is not None else 0
            moy_sec = t_sec
            
            # Create a mock task object compatible with calculate_task_duration
            class VirtualTask:
                def __init__(self, **kwargs):
                    self.__dict__.update(kwargs)
                    self.id = 0
                    self.centre_poste_id = 0
                    self.centre_poste = None # Handled by hasattr in engine

            # Base de calcul normalization (Excel might store 100% as 1.0)
            base_val_raw = row[idx_base].value if idx_base is not None else 100
            try:
                base_val = float(base_val_raw) if base_val_raw is not None else 100.0
                if base_val <= 1.0 and base_val > 0:
                    base_val *= 100.0
            except:
                base_val = 100.0

            # Common attributes
            task_attrs = {
                "nom_tache": nom,
                "produit": str(row[idx_prod].value or "") if idx_prod is not None else "",
                "famille_uo": str(row[idx_fam].value or "") if idx_fam is not None else "",
                "phase": str(row[idx_phase].value or "") if idx_phase is not None else "",
                "unite_mesure": str(row[idx_unit].value or "uo") if idx_unit is not None else "uo",
                "base_calcul": str(base_val),
                "moy_sec": moy_sec,
            }

            # Responsables
            resps = []
            if idx_resp1 is not None and row[idx_resp1].value:
                resps.append(str(row[idx_resp1].value))
            if idx_resp2 is not None and row[idx_resp2].value:
                resps.append(str(row[idx_resp2].value))
            
            if not resps:
                resps = ["N/A"]

            for resp_label in resps:
                # Exclusion MOI
                if str(resp_label).strip().upper() in moi_labels_norm:
                    continue
                    
                vt = VirtualTask(responsable_label=resp_label, **task_attrs)
                virtual_tasks.append(vt)

        # 2. Préparer les inputs pour le moteur
        input_volumes = BandoengInputVolumes(**payload.volumes)
        input_params = BandoengParameters(**payload.params)
        
        # 3. Lancer la simulation
        result = run_bandoeng_simulation(
            db=db,
            centre_id=None,
            volumes=input_volumes,
            params=input_params,
            tasks_override=virtual_tasks
        )
        
        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur simulation virtuelle: {str(e)}")

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
