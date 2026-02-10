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
import os

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
    ordre: Optional[int] = 999

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
    ordre: Optional[int] = None
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
        ordre=tache.ordre,
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
    if update.ordre is not None: t.ordre = update.ordre
    
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
        
    # Recherche robuste de la ligne d'en-tête (on cherche parmi les 10 premières lignes)
    header_row_idx = 0
    idx_map = {}
    
    for r_idx in range(min(15, len(rows))):
        current_header = [str(c.value or "").lower().strip() for c in rows[r_idx]]
        # Si on trouve un des mots clés principaux, c'est notre ligne d'en-tête
        if any(key in current_header for key in ["tache", "tâches", "produit", "famille", "unite", "unité", "phase", "seq", "ordre"]):
            header_row_idx = r_idx
            for i, h in enumerate(rows[r_idx]):
                if not h.value: continue
                h_clean = str(h.value).lower().strip()
                idx_map[h_clean] = i
            break
            
    # Si on a trouvé une ligne d'entête plus loin, on ajuste rows
    actual_data_rows = rows[header_row_idx + 1:]
    
    # Fallback si idx_map est vide
    if not idx_map:
        for i, h in enumerate(rows[0]):
            if not h.value: continue
            h_clean = str(h.value).lower().strip()
            idx_map[h_clean] = i
    
    with open("debug_import.log", "w", encoding="utf-8") as f:
        f.write(f"DEBUG: Header Row found at index: {header_row_idx}\n")
        f.write(f"DEBUG: Headers found: {list(idx_map.keys())}\n")
    
    # Helper pour trouver l'index avec priorité exacte
    def get_idx(candidates, exclude=None):
        if exclude is None: exclude = []
        # Phase 1 : Match Exact (insensible à la casse)
        for c in candidates:
            for k, i in idx_map.items():
                if c == k:
                    return i
        # Phase 2 : Contient le mot clé (insensible à la casse)
        for c in candidates:
            for k, i in idx_map.items():
                # On évite les match trop courts comme 'ph' dans 'téléphone' 
                # sauf si c'est 'phase' ou match exact déjà géré.
                if c in k:
                    if any(exc in k for exc in exclude):
                        continue
                    # Si le candidat est court (ex: 'ph'), on veut qu'il soit un mot isolé ou au début
                    if len(c) <= 2 and not (k.startswith(c) or f" {c}" in k):
                        continue
                    return i
        return None

    # Mapping des colonnes
    col_seq = get_idx(["seq"])
    col_ordre = get_idx(["ordre", "order", "tri", "seq"]) # Ajout mapping Ordre et Seq en fallback
    col_etat = get_idx(["etat"])
    col_prod = get_idx(["produit"])
    # Famille peut matcher famille_uo
    col_fam = get_idx(["famille"])
    col_phase = get_idx(["phase", "ph", "étape", "etape", "step"]) # 🆕 Colonne Phase
    
    # Min/Sec : On exclut 'moyenne' pour ne pas confondre avec 'moyenne_min'
    col_min = get_idx(["min", "minutes", "mn"], exclude=["moyenne", "moy"])
    col_sec = get_idx(["sec", "secondes"], exclude=["moyenne", "moy"])
    
    # Si pas de colonnes Min/Sec stricte, on tente de voir si on a juste 'moyenne_min'
    col_moyenne = get_idx(["moyenne", "moy"]) # Fallback ?
    
    col_nom = get_idx(["taches", "tâches", "tache", "tâche", "designation", "libellé", "libelle"])
    col_unit = get_idx(["unité", "unite"]) 
    col_base = get_idx(["base"]) 
    col_resp1 = get_idx(["responsable 1", "resp 1", "responsable", "resp", "poste"]) 
    col_resp2 = get_idx(["responsable 2", "resp 2"])
    
    count = 0
    errors = []
    
    print(f"DEBUG: Import Taches - Columns detected: Nom={col_nom}, Unit={col_unit}, Base={col_base}, Min={col_min}, Sec={col_sec}, Moy={col_moyenne}, Resp1={col_resp1}, Phase={col_phase}")
    print(f"DEBUG: Headers found in file: {list(idx_map.keys())}")
    
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
    
    def clean_val(v):
        """Standardizes values for DB insertion (Strings)."""
        if v is None: return None
        if isinstance(v, float):
             if v.is_integer():
                return str(int(v))
             return str(v)
        return str(v)
        
    with open("debug_import.log", "w", encoding="utf-8") as f:
        f.write(f"DEBUG: Headers found: {list(idx_map.keys())}\n")
        f.write(f"DEBUG: Column Phase: {col_phase}\n")
        f.write(f"DEBUG: Column Nom: {col_nom}\n")
    
    for r_idx, row in enumerate(actual_data_rows, start=header_row_idx + 2):
        try:
            def val(idx): 
                return row[idx].value if idx is not None and idx < len(row) else None
                
            nom_tache = val(col_nom)
            if not nom_tache:
                continue 
            
            # Données communes
            etat = str(val(col_etat) or "ACTIF")
            produit = str(val(col_prod) or "")
            famille = str(val(col_fam) or "")
            
            # Lecture Phase
            phase_val = clean_val(val(col_phase))
            if phase_val: phase_val = phase_val.strip()
            
            with open("debug_import.log", "a", encoding="utf-8") as f:
                f.write(f"Ligne {r_idx}: tache='{nom_tache}', phase='{phase_val}'\n")
            
            unite = str(val(col_unit) or "uo")
            
            base_calc = val(col_base)
            if base_calc is None:
                base_calc = 100.0
            else:
                if isinstance(base_calc, str):
                    base_calc = base_calc.replace('%', '').replace(',', '.').strip()
                try:
                    base_calc = float(base_calc)
                except:
                    base_calc = 100.0
                if 0.0 < base_calc <= 1.0:
                    base_calc = base_calc * 100.0
            
            # Temps
            v_min = 0.0
            v_sec = 0.0
            moyenne = 0.0
            
            if col_min is not None or col_sec is not None:
                v_min = secure_float(val(col_min))
                v_sec = secure_float(val(col_sec))
                moyenne = v_min + (v_sec / 60.0)
            elif col_moyenne is not None:
                moy_brut = secure_float(val(col_moyenne))
                v_min = int(moy_brut)
                v_sec = (moy_brut - v_min) * 60.0
                moyenne = moy_brut
            
            v_min_db = str(int(v_min)) 
            base_calc_db = clean_val(base_calc)
            v_sec_db = clean_val(v_sec)
            moyenne_db = clean_val(moyenne)
            
            # Responsables
            resps = []
            r1 = val(col_resp1)
            if r1: resps.append(str(r1).strip())
            r2 = val(col_resp2)
            if r2: resps.append(str(r2).strip())
            
            if not resps:
                if poste_id:
                    resps = ["__CONTEXT__"]
                else:
                    errors.append(f"Ligne {r_idx}: Aucun responsable défini pour '{nom_tache}'")
                    continue
                    
            for resp_label in resps:
                target_cp_id = None
                
                if resp_label == "__CONTEXT__" and poste_id:
                    cp = db.query(db_models.CentrePoste).filter(
                        db_models.CentrePoste.centre_id == centre_id,
                        db_models.CentrePoste.poste_id == poste_id
                    ).first()
                    if not cp:
                        cp = db_models.CentrePoste(centre_id=centre_id, poste_id=poste_id)
                        db.add(cp)
                        db.flush()
                    target_cp_id = cp.id
                else:
                    p_id = postes_cache.get(resp_label.upper())
                    if not p_id:
                        try:
                            new_p = db_models.Poste(label=resp_label, type_poste="MOD")
                            db.add(new_p)
                            db.flush()
                            p_id = new_p.id
                            postes_cache[resp_label.upper()] = p_id
                        except Exception as e:
                            errors.append(f"Ligne {r_idx}: Impossible de créer le poste '{resp_label}' ({str(e)})")
                            continue
                    
                    cp = db.query(db_models.CentrePoste).filter(
                        db_models.CentrePoste.centre_id == centre_id,
                        db_models.CentrePoste.poste_id == p_id
                    ).first()
                    if not cp:
                        cp = db_models.CentrePoste(centre_id=centre_id, poste_id=p_id)
                        db.add(cp)
                        db.flush()
                    target_cp_id = cp.id
                
                if target_cp_id:
                    tache = db_models.Tache(
                        centre_poste_id=target_cp_id,
                        nom_tache=str(nom_tache),
                        famille_uo=famille,
                        phase=phase_val,
                        unite_mesure=unite,
                        produit=produit,
                        etat=etat,
                        base_calcul=base_calc_db,
                        min_min=v_min_db,
                        moy_sec=v_sec_db,
                        moyenne_min=moyenne_db,
                        ordre=int(secure_float(val(col_ordre))) if col_ordre is not None else 999
                    )
                    db.add(tache)
                    count += 1
        except Exception as e:
            errors.append(f"Ligne {r_idx}: Erreur inattendue : {str(e)}")
            print(f"ERROR: Import Taches Line {r_idx}: {str(e)}")

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        return {
            "status": "error",
            "message": f"Erreur lors de la validation finale en base : {str(e)}",
            "errors": errors[:10]
        }
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
    

class InitTemplateInput(BaseModel):
    typologie: str  # "AM" or "CCC"

@router.post("/centres/{centre_id}/taches/init-from-template")
def init_taches_from_template(centre_id: int, input: InitTemplateInput, db: Session = Depends(get_db)):
    """
    Initialise les tâches d'un centre à partir d'un template Excel selon la typologie spécifiée.
    """
    # 1. Vérifier si le centre existe
    centre = db.query(db_models.Centre).filter(db_models.Centre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre introuvable")

    # 2. Vérifier si le centre a déjà des tâches (Idempotence)
    cp_ids = [res.id for res in db.query(db_models.CentrePoste.id).filter(db_models.CentrePoste.centre_id == centre_id).all()]
    if cp_ids:
        taches_count = db.query(db_models.Tache).filter(db_models.Tache.centre_poste_id.in_(cp_ids)).count()
        if taches_count > 0:
            return {"status": "skipped", "reason": "already_has_tasks"}
    
    # 3. Choisir le fichier Excel selon la typologie
    typo = input.typologie.upper()
    if typo == "AM":
        template_name = "template_taches_am.xlsx"
    elif typo == "CCC":
        template_name = "template_taches.xlsx"
    else:
        raise HTTPException(status_code=400, detail="Typologie invalide. Valeurs attendues: AM ou CCC")

    # Construction du chemin absolu (public/ à la racine du projet ou à la racine du backend)
    # On privilégie le dossier public du backend
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    template_path = os.path.join(base_dir, "public", template_name)
    
    if not os.path.exists(template_path):
        # Fallback chemin relatif
        template_path = os.path.join("public", template_name)
        if not os.path.exists(template_path):
            raise HTTPException(status_code=500, detail=f"Fichier template {template_name} introuvable.")

    # 4. Charger et traiter le fichier (Transactionnel par défaut dans _process_import_taches via session)
    try:
        with open(template_path, "rb") as f:
            content = f.read()
        
        result = _process_import_taches(content, centre_id, db)
        return {
            "status": "imported",
            "imported_count": result.get("taches_creees", 0),
            "template_used": template_name
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import des tâches échoué : {str(e)}")

 







