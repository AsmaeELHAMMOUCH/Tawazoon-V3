from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
import openpyxl
import pandas as pd
import io
from io import BytesIO

from app.core.db import get_db
from app.models import db_models

router = APIRouter(tags=["taches_mgmt"])

# Models
class TacheCreate(BaseModel):
    centre_id: Optional[int] = None
    nom_tache: str
    famille_uo: Optional[str] = None
    phase: Optional[str] = None
    unite_mesure: str
    moyenne_min: Optional[float] = 0.0
    produit: Optional[str] = None
    base_calcul: Optional[int] = 100
    poste_label: Optional[str] = None
    centre_poste_id: Optional[int] = None

class TacheUpdate(BaseModel):
    nom_tache: Optional[str] = None
    famille_uo: Optional[str] = None
    phase: Optional[str] = None
    unite_mesure: Optional[str] = None
    moyenne_min: Optional[float] = None
    produit: Optional[str] = None
    base_calcul: Optional[int] = None
    centre_poste_id: Optional[int] = None
    min_min: Optional[float] = None
    moy_sec: Optional[float] = None
    # min_sec removed as it is not in DB

@router.post("/taches")
def create_tache(tache: TacheCreate, db: Session = Depends(get_db)):
    cp = None
    
    if tache.centre_poste_id:
        cp = db.query(db_models.CentrePoste).filter(db_models.CentrePoste.id == tache.centre_poste_id).first()
        if not cp:
            raise HTTPException(404, detail=f"CentrePoste {tache.centre_poste_id} introuvable.")
            
    elif tache.centre_id and tache.poste_label:
        # Find CentrePoste via Label
        cp = db.query(db_models.CentrePoste).join(db_models.Poste).filter(
            db_models.CentrePoste.centre_id == tache.centre_id,
            db_models.Poste.label == tache.poste_label
        ).first()
        
        if not cp:
            # Check global Poste
            poste = db.query(db_models.Poste).filter(db_models.Poste.label == tache.poste_label).first()
            if not poste:
                raise HTTPException(404, detail=f"Poste '{tache.poste_label}' introuvable.")
                
            # Create CentrePoste
            cp = db_models.CentrePoste(centre_id=tache.centre_id, poste_id=poste.id)
            db.add(cp)
            db.commit()
            db.refresh(cp)
    else:
        raise HTTPException(400, detail="Veuillez fournir centre_poste_id OU (centre_id + poste_label).")
    
    new_tache = db_models.Tache(
        centre_poste_id=cp.id,
        nom_tache=tache.nom_tache,
        famille_uo=tache.famille_uo,
        phase=tache.phase,
        unite_mesure=tache.unite_mesure,
        moyenne_min=tache.moyenne_min,
        produit=tache.produit,
        base_calcul=tache.base_calcul,
        etat="ACTIF"
    )
    db.add(new_tache)
    db.commit()
    db.refresh(new_tache)
    return {"status": "created", "id": new_tache.id}

@router.put("/taches/{tache_id}")
def update_tache(tache_id: int, update: TacheUpdate, db: Session = Depends(get_db)):
    t = db.query(db_models.Tache).filter(db_models.Tache.id == tache_id).first()
    if not t:
        raise HTTPException(404, "Tache not found")
        
    if update.nom_tache is not None: t.nom_tache = update.nom_tache
    if update.famille_uo is not None: t.famille_uo = update.famille_uo
    if update.phase is not None: t.phase = update.phase
    if update.unite_mesure is not None: t.unite_mesure = update.unite_mesure
    # moyenne_min handled in specific block below to ensure Priority over duplicates
    if update.produit is not None: t.produit = update.produit
    if update.base_calcul is not None: t.base_calcul = update.base_calcul
    if update.centre_poste_id is not None: t.centre_poste_id = update.centre_poste_id
    
    # SIMPLIFIED LOGIC (User Directive: Step 1735)
    # Strict Direct Mapping:
    # Input 'moyenne_min' -> DB Field 'moyenne_min'
    # Input 'moy_sec' -> DB Field 'moy_sec'
    
    print(f"DEBUG UPDATE TACHE {tache_id}: payload={update.dict()}")
    
    if update.moyenne_min is not None:
        t.moyenne_min = update.moyenne_min
            
    if update.moy_sec is not None:
        # User refers to Second column as moy_sec, mapping to DB field moy_sec
        try:
            t.moy_sec = int(update.moy_sec)
        except:
            t.moy_sec = 0

    # No auto-calculation. We trust the inputs are mapped to the correct columns as requested.
    
    db.commit()
    return {"status": "updated"}

@router.delete("/taches/{tache_id}")
def delete_tache(tache_id: int, db: Session = Depends(get_db)):
    t = db.query(db_models.Tache).filter(db_models.Tache.id == tache_id).first()
    if not t:
        raise HTTPException(404, "Tache not found")
    
    db.delete(t)
    db.commit()
    return {"status": "deleted"}

@router.delete("/taches/centre/{centre_id}")
def delete_taches_by_centre(centre_id: int, db: Session = Depends(get_db)):
    # Find all CentrePoste IDs for this centre
    cp_ids = [res.id for res in db.query(db_models.CentrePoste.id).filter(db_models.CentrePoste.centre_id == centre_id).all()]
    
    if not cp_ids:
        return {"status": "deleted", "count": 0}
         
    # Delete tasks associated with these CentrePoste IDs
    result = db.query(db_models.Tache).filter(db_models.Tache.centre_poste_id.in_(cp_ids)).delete(synchronize_session=False)
    db.commit()
    return {"status": "deleted", "count": result}

def _process_import_taches(content: bytes, centre_id: int, db: Session, poste_id: Optional[int] = None):
    # This function isolates the logic of processing the excel file from bytes.
    wb = openpyxl.load_workbook(BytesIO(content))
    ws = wb.active
    
    rows = list(ws.rows)
    if not rows:
        return {"count": 0}
        
    header = [c.value for c in rows[0]]
    idx_map = {}
    for i, h in enumerate(header):
        if not h: continue
        h_clean = str(h).lower().strip()
        idx_map[h_clean] = i
    
    # Helper pour trouver l'index avec exclusion
    def get_idx(candidates, exclude=None):
        if exclude is None: exclude = []
        for c in candidates:
            for k in idx_map:
                # Vérifie si le mot clé est dans la colonne
                if c in k:
                    # Vérifie les exclusions
                    if any(exc in k for exc in exclude):
                        continue
                    return idx_map[k]
        return None

    # Mapping des colonnes
    col_seq = get_idx(["seq"])
    col_ordre = get_idx(["ordre", "order", "tri", "seq"]) # Ajout mapping Ordre et Seq en fallback
    col_etat = get_idx(["etat"])
    col_prod = get_idx(["produit"])
    # Famille peut matcher famille_uo
    col_fam = get_idx(["famille"])
    col_phase = get_idx(["phase", "ph"]) # 🆕 Colonne Phase
    
    # Min/Sec : On exclut 'moyenne' pour ne pas confondre avec 'moyenne_min'
    col_min = get_idx(["min", "minutes", "mn"], exclude=["moyenne", "moy"])
    col_sec = get_idx(["sec", "secondes"], exclude=["moyenne", "moy"])
    
    # Si pas de colonnes Min/Sec stricte, on tente de voir si on a juste 'moyenne_min'
    col_moyenne = get_idx(["moyenne", "moy"]) # Fallback ?
    
    col_nom = get_idx(["taches", "tâches", "designation", "libellé", "libelle"])
    col_unit = get_idx(["unité", "unite"]) 
    col_base = get_idx(["base"]) 
    col_resp1 = get_idx(["responsable 1", "resp 1", "responsable", "poste"]) 
    col_resp2 = get_idx(["responsable 2", "resp 2"])
    
    count = 0
    errors = []
    
    # Cache pour les Postes et CentrePostes pour éviter N requêtes
    # Dict[str_label, poste_id]
    postes_cache = {p.label.upper().strip(): p.id for p in db.query(db_models.Poste).all()}

    def secure_float(v):
        if v is None: return 0.0
        if isinstance(v, (int, float)): return float(v)
        try:
            return float(str(v).replace(',', '.').strip())
        except:
            return 0.0
    
    for r_idx, row in enumerate(rows[1:], start=2):
        def val(idx): 
            return row[idx].value if idx is not None and idx < len(row) else None
            
        nom_tache = val(col_nom)
        if not nom_tache: continue # Skip empty lines
        
        # Données communes
        etat = str(val(col_etat) or "ACTIF")
        produit = str(val(col_prod) or "")
        famille = str(val(col_fam) or "")
        phase_val = str(val(col_phase) or "") # 🆕 Lecture Phase
        unite = str(val(col_unit) or "uo")
        
        # Ordre
        ordre_val = val(col_ordre)
        if ordre_val is None:
             # Fallback sur seq si ordre n'est pas trouvé par index direct
             ordre_val = val(col_seq)
        try: ordre_val = int(ordre_val) if ordre_val is not None else None
        except: ordre_val = None
        
        base_calc = val(col_base)
        try: base_calc = secure_float(base_calc) if base_calc is not None else 100
        except: base_calc = 100
        
        # Temps
        v_min = 0.0
        v_sec = 0.0
        moyenne = 0.0
        
        # Cas 1: Colonnes Min et Sec explicites trouvées (et ne sont pas moyenne)
        if col_min is not None or col_sec is not None:
            v_min = secure_float(val(col_min))
            v_sec = secure_float(val(col_sec))
            moyenne = v_min + (v_sec / 60.0)
            
        # Cas 2: Pas de Min/Sec mais une colonne "Moyenne"
        elif col_moyenne is not None:
             moy_brut = secure_float(val(col_moyenne))
             v_min = int(moy_brut)
             v_sec = (moy_brut - v_min) * 60.0
             moyenne = moy_brut
        
        # Responsables
        resps = []
        r1 = val(col_resp1)
        if r1: resps.append(str(r1).strip())
        r2 = val(col_resp2)
        if r2: resps.append(str(r2).strip())
        
        if not resps:
            # Fallback: si pas de responsable dans le fichier mais poste_id fourni dans l'URL (contexte)
            if poste_id:
                # On utilise le poste_id du contexte, il faut trouver son label pour la logique commune ou juste l'ID
                # Mais ici on a besoin de créer le Tache liée.
                # On triche un peu : on crée un "fake" label pour passer dans la boucle, ou on gère direct.
                # Simplifions : On traite direct l'ID
                resps = ["__CONTEXT__"]
            else:
                errors.append(f"Ligne {r_idx}: Aucun responsable défini pour '{nom_tache}'")
                continue
                
        for resp_label in resps:
            target_cp_id = None
            
            if resp_label == "__CONTEXT__" and poste_id:
                # Cas fallback paramètre URL
                # Vérifier/Créer CP
                cp = db.query(db_models.CentrePoste).filter(
                    db_models.CentrePoste.centre_id == centre_id,
                    db_models.CentrePoste.poste_id == poste_id
                ).first()
                if not cp:
                    cp = db_models.CentrePoste(centre_id=centre_id, poste_id=poste_id)
                    db.add(cp)
                    db.commit()
                    db.refresh(cp)
                target_cp_id = cp.id
                
            else:
                # Cas normal : Label dans Excel
                p_id = postes_cache.get(resp_label.upper())
                if not p_id:
                    # Tenter de créer le poste Ref ? (Optionnel, comme demandé précédemment)
                    # Pour l'instant on skip ou on crée. Soyons proactifs comme pour Postes.
                    try:
                        new_p = db_models.Poste(label=resp_label, type_poste="MOD")
                        db.add(new_p)
                        db.flush()
                        p_id = new_p.id
                        postes_cache[resp_label.upper()] = p_id
                    except:
                        errors.append(f"Ligne {r_idx}: Impossible de créer le poste '{resp_label}'")
                        continue
                
                # Vérifier/Créer CentrePoste
                cp = db.query(db_models.CentrePoste).filter(
                    db_models.CentrePoste.centre_id == centre_id,
                    db_models.CentrePoste.poste_id == p_id
                ).first()
                if not cp:
                    cp = db_models.CentrePoste(centre_id=centre_id, poste_id=p_id)
                    db.add(cp)
                    db.commit()
                    db.refresh(cp)
                target_cp_id = cp.id
            
            # Création de la Tache
            if target_cp_id:
                tache = db_models.Tache(
                    centre_poste_id=target_cp_id,
                    nom_tache=str(nom_tache),
                    famille_uo=famille,
                    phase=phase_val, # 🆕 Save Phase
                    unite_mesure=unite,
                    produit=produit,
                    etat=etat,
                    base_calcul=base_calc,
                    min_min=v_min,
                    moy_sec=v_sec,
                    moyenne_min=moyenne,
                    ordre=ordre_val
                )
                db.add(tache)
                count += 1

    db.commit()
    return {
        "status": "imported", 
        "count": count, 
        "errors": errors[:10] # Top 10 errors
    }


@router.post("/taches/import/{centre_id}")
async def import_taches(
    centre_id: int, 
    poste_id: Optional[int] = Query(None),
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    """
    Importe les tâches depuis un fichier Excel (Format spécifique).
    """
    content = await file.read()
    return _process_import_taches(content, centre_id, db, poste_id)

@router.get("/taches/export-template")
def export_template():
    """Génère un template Excel pour l'import des tâches"""
    try:
        data = [{
            "Seq": 1,
            "Ordre": 10,
            "ETAT": "ACTIF",
            "Produit": "Exemple Produit",
            "Famille": "Exemple Famille",
            "Phase": "Exemple Phase",
            "min": 1,
            "sec": 30,
            "taches": "Exemple de tâche",
            "Unité Mesure": "uo",
            "base de calcul": 100,
            "Responsable 1": "CAB",
            "Responsable 2": "GUICHET"
        }]
            
        df = pd.DataFrame(data)
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Taches')
        
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=modele_import_taches.xlsx"}
        )
    except Exception as e:
        print(f"Error generating template: {e}")
        return {"error": str(e)}
    


