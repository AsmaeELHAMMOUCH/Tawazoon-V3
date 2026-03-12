# app/api/postes_mgmt.py
"""
API pour la gestion CRUD des postes par centre.
Permet de gérer la relation centre_postes (effectifs actuels par poste dans un centre).
"""
# Force reload
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from fastapi.responses import StreamingResponse
import pandas as pd
import io
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from app.core.db import get_db
from app.models.db_models import CentrePoste, Poste, Centre

router = APIRouter(prefix="/pm", tags=["Postes Management"])

@router.get("/global/postes", response_model=List[dict])
def get_all_centre_postes(db: Session = Depends(get_db)):
    """
    Récupère tous les postes de tous les centres.
    """
    centre_postes = db.query(CentrePoste).all()
    
    result = []
    for cp in centre_postes:
        c = cp.centre
        p = cp.poste
        
        if not c or not p: continue
        
        region_label = "N/A"
        if c.region:
             region_label = c.region.label
        
        result.append({
            "centre_poste_id": cp.id,
            "poste_id": p.id,
            "poste_label": p.label,
            "centre_id": c.id,
            "centre_label": c.label,
            "region_label": region_label,
            "effectif_actuel": cp.effectif_actuel,
            "effectif_aps": c.t_aps if c.t_aps is not None else 0
        })
    return result

class ApsUpdate(BaseModel):
    aps: float

@router.put("/centres/{centre_id}/aps")
def update_centre_aps(centre_id: int, update: ApsUpdate, db: Session = Depends(get_db)):
    """
    Met à jour l'APS d'un centre spécifié.
    """
    centre = db.query(Centre).filter(Centre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre non trouvé")
    
    centre.aps = update.aps
    db.commit()
    return {"status": "success", "message": f"APS du centre {centre.label} mis à jour"}

@router.get("/aps/export-template")
def export_aps_template(
    region_id: Optional[int] = Query(None),
    typologie_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Exporte un template Excel des centres filtrés avec leur APS actuel.
    """
    query = db.query(Centre)
    if region_id:
        query = query.filter(Centre.region_id == region_id)
    if typologie_id:
        query = query.filter(Centre.categorie_id == typologie_id)
    
    centres = query.all()
    
    data = []
    for c in centres:
        data.append({
            "Région": c.region.label if c.region else "N/A",
            "Centre": c.label,
            "APS Actuel": c.aps if c.aps is not None else 0.0
        })
    
    df = pd.DataFrame(data)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Update_APS')
    
    output.seek(0)
    
    filename = "template_aps_global.xlsx"
    if region_id:
        region = db.query(text("label from dbo.regions where id = :id")).params(id=region_id).first()
        if region:
            filename = f"template_aps_{region[0]}.xlsx"
            
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/aps/import")
async def import_aps(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Importe un fichier Excel pour mettre à jour les APS des centres par lot.
    """
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        required_cols = ["Centre", "APS Actuel"]
        if not all(col in df.columns for col in required_cols):
            raise HTTPException(status_code=400, detail=f"Colonnes manquantes. Requis: {required_cols}")
        
        updated_count = 0
        errors = []
        
        for index, row in df.iterrows():
            centre_name_raw = str(row["Centre"]).strip()
            new_aps_raw = row["APS Actuel"]
            
            try:
                if pd.isna(new_aps_raw) or str(new_aps_raw).strip() == "":
                    new_aps_float = 0.0
                else:
                    new_aps_float = float(str(new_aps_raw).replace(',', '.'))
            except ValueError:
                errors.append(f"Ligne {index+2}: Valeur APS invalide '{new_aps_raw}'")
                continue
            
            # Recherche du centre par nom (normalisé)
            centre = db.query(Centre).filter(text("LOWER(REPLACE(label, ' ', '')) = LOWER(REPLACE(:name, ' ', ''))")).params(name=centre_name_raw).first()
            
            if centre:
                centre.aps = new_aps_float
                updated_count += 1
            else:
                errors.append(f"Ligne {index+2}: Centre '{centre_name_raw}' non trouvé")
        
        db.commit()
        
        if errors:
            error_data = [{"Erreur": err} for err in errors]
            df_errors = pd.DataFrame(error_data)
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df_errors.to_excel(writer, index=False, sheet_name='Lignes_Rejetees')
            output.seek(0)
            
            headers = {
                "Content-Disposition": "attachment; filename=rejets_import_aps.xlsx",
                "Access-Control-Expose-Headers": "X-Error-Count, X-Updated-Count",
                "X-Error-Count": str(len(errors)),
                "X-Updated-Count": str(updated_count)
            }
            return StreamingResponse(
                output,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers=headers
            )
            
        return {
            "status": "success", 
            "message": f"{updated_count} centres mis à jour",
            "errors": []
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/effectifs/export-template")
def export_effectifs_template(
    region_id: Optional[int] = Query(None),
    typologie_id: Optional[int] = Query(None),
    centre_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Exporte un template Excel des postes par centre selon les filtres.
    """
    if centre_id:
        # Si un centre est spécifié, on utilise LEFT JOIN pour qu'il apparaisse même s'il n'a pas encore de postes
        query = text("""
            SELECT 
                r.label as region,
                c.label as centre,
                p.label as poste,
                COALESCE(cp.effectif_actuel, 0) as effectif
            FROM dbo.centres c
            JOIN dbo.regions r ON r.id = c.region_id
            LEFT JOIN dbo.centre_postes cp ON cp.centre_id = c.id
            LEFT JOIN dbo.postes p ON p.Code = cp.code_resp
            WHERE c.id = :centre_id
        """)
        rows = db.execute(query, {"centre_id": centre_id}).mappings().all()
    else:
        # Sinon, on liste tous les couples Centre/Poste existants filtrés par région/typologie
        filters = []
        params = {}
        if region_id:
            filters.append("c.region_id = :region_id")
            params["region_id"] = region_id
        if typologie_id:
            filters.append("c.categorie_id = :typologie_id")
            params["typologie_id"] = typologie_id
        
        filter_str = " AND ".join(filters) if filters else "1=1"
        
        query = text(f"""
            SELECT 
                r.label as region,
                c.label as centre,
                p.label as poste,
                COALESCE(cp.effectif_actuel, 0) as effectif
            FROM dbo.centres c
            JOIN dbo.regions r ON r.id = c.region_id
            LEFT JOIN dbo.centre_postes cp ON cp.centre_id = c.id
            LEFT JOIN dbo.postes p ON p.id = cp.poste_id
            WHERE {filter_str}
            ORDER BY c.label, p.label
        """)
        rows = db.execute(query, params).mappings().all()

    data = []
    for row in rows:
        data.append({
            "Région": row["region"],
            "Centre": row["centre"],
            "Poste": row["poste"] if row["poste"] else "",
            "Effectif Actuel": row["effectif"]
        })
    
    # Sincérité des colonnes même si data est vide
    df = pd.DataFrame(data, columns=["Région", "Centre", "Poste", "Effectif Actuel"])
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Update_Effectifs')
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=template_effectifs.xlsx"}
    )

@router.post("/effectifs/import")
async def import_effectifs(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Importe un fichier Excel pour mettre à jour ou ajouter des effectifs (Upsert).
    """
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        required_cols = ["Centre", "Poste", "Effectif Actuel"]
        if not all(col in df.columns for col in required_cols):
            raise HTTPException(status_code=400, detail=f"Colonnes manquantes. Requis: {required_cols}")
        
        updated_count = 0
        created_count = 0
        errors = []
        
        # Track processed combinations to prevent IntegrityError on duplicates
        processed_combinations = set()
        
        # Pré-charger les centres et les postes pour éviter trop de requêtes unitaires
        all_centres = {(c.label.lower().replace(' ', '') if c.label else ''): c.id for c in db.query(Centre).all()}
        all_postes = {(p.label.lower().replace(' ', '') if p.label else ''): (p.id, p.Code) for p in db.query(Poste).all()}
        
        for index, row in df.iterrows():
            centre_name_raw = str(row["Centre"]).strip()
            poste_label_raw = str(row["Poste"]).strip()
            new_val = row["Effectif Actuel"]
            try:
                if pd.isna(new_val) or str(new_val).strip() == "":
                    new_val_float = 0.0
                else:
                    new_val_float = float(str(new_val).replace(',', '.'))
            except ValueError:
                errors.append(f"Ligne {index+2}: Valeur d'effectif invalide '{new_val}'")
                continue
            
            centre_key = centre_name_raw.lower().replace(' ', '')
            poste_key = poste_label_raw.lower().replace(' ', '')
            
            centre_id = all_centres.get(centre_key)
            poste_info = all_postes.get(poste_key)
            
            if not centre_id:
                errors.append(f"Ligne {index+2}: Centre '{centre_name_raw}' non trouvé")
                continue
            if not poste_info:
                errors.append(f"Ligne {index+2}: Poste '{poste_label_raw}' non trouvé dans le référentiel")
                continue
            
            poste_id, poste_code = poste_info
            
            combo_key = (centre_id, poste_id)
            if combo_key in processed_combinations:
                errors.append(f"Ligne {index+2}: Doublon ignoré pour le centre '{centre_name_raw}' et le poste '{poste_label_raw}'")
                continue
            
            processed_combinations.add(combo_key)
            
            # Recherche de l'association existante
            # On cherche par poste_id ou par code_resp pour être résilient
            cp = db.query(CentrePoste).filter(
                CentrePoste.centre_id == centre_id,
                (CentrePoste.poste_id == poste_id) | (CentrePoste.code_resp == poste_code)
            ).first()
            
            if cp:
                cp.effectif_actuel = new_val_float
                updated_count += 1
            else:
                # Création d'une nouvelle association
                new_cp = CentrePoste(
                    centre_id=centre_id,
                    poste_id=poste_id,
                    code_resp=poste_code,
                    effectif_actuel=new_val_float
                )
                db.add(new_cp)
                created_count += 1
        
        db.commit()
        
        if errors:
            # S'il y a des erreurs, on génère un fichier excel de rejets
            error_data = []
            for err_msg in errors:
                # Extraire la ligne si possible pour le contexte, sinon on met juste l'erreur
                error_data.append({
                    "Erreur": err_msg
                })
            
            df_errors = pd.DataFrame(error_data)
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df_errors.to_excel(writer, index=False, sheet_name='Lignes_Rejetees')
            output.seek(0)
            
            headers = {
                "Content-Disposition": "attachment; filename=rejets_import_effectifs.xlsx",
                "Access-Control-Expose-Headers": "X-Error-Count, X-Updated-Count, X-Created-Count",
                "X-Error-Count": str(len(errors)),
                "X-Updated-Count": str(updated_count),
                "X-Created-Count": str(created_count)
            }
            return StreamingResponse(
                output,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers=headers
            )
            
        return {
            "status": "success", 
            "message": f"{updated_count} effectifs mis à jour, {created_count} nouveaux postes affectés.",
            "errors": []
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/effectifs/clear")
def clear_effectifs(
    region_id: Optional[int] = Query(None),
    typologie_id: Optional[int] = Query(None),
    centre_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Supprime massivement les effectifs (entrées centre_postes) selon les filtres.
    ATTENTION: Cette opération est destructive et supprimera aussi les tâches associées.
    """
    try:
        if centre_id:
            # Cas d'un centre unique
            db.query(CentrePoste).filter(CentrePoste.centre_id == centre_id).delete(synchronize_session=False)
        else:
            # Cas filtré par région ou typologie
            # On récupère les IDs des centres concernés
            centres_query = db.query(Centre.id)
            if region_id:
                centres_query = centres_query.filter(Centre.region_id == region_id)
            if typologie_id:
                centres_query = centres_query.filter(Centre.categorie_id == typologie_id)
            
            centre_ids = [c[0] for c in centres_query.all()]
            
            if centre_ids:
                db.query(CentrePoste).filter(CentrePoste.centre_id.in_(centre_ids)).delete(synchronize_session=False)
        
        db.commit()
        return {"status": "success", "message": "Les effectifs pour le périmètre sélectionné ont été réinitialisés."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SCHEMAS ====================
class PosteCentreItem(BaseModel):
    """Représente un poste dans un centre avec ses effectifs."""
    centre_poste_id: int
    poste_id: int
    poste_label: str
    type_poste: Optional[str] = "MOD"
    effectif_actuel: float = 0.0
    effectif_aps: Optional[float] = None


class PosteCentreUpdate(BaseModel):
    """Données pour mise à jour d'un poste dans un centre."""
    effectif_actuel: Optional[float] = None


class PosteCentreCreate(BaseModel):
    """Données pour créer un nouveau poste dans un centre."""
    poste_id: int
    effectif_actuel: float = 0.0


# ==================== ENDPOINTS ====================




@router.get("/centres/{centre_id}/postes", response_model=List[PosteCentreItem])
def get_postes_by_centre(
    centre_id: int,
    db: Session = Depends(get_db)
):
    """
    Récupère tous les postes d'un centre avec leurs effectifs.
    """
    centre = db.query(Centre).filter(Centre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail=f"Centre {centre_id} non trouvé")
    
    query = text("""
        SELECT 
            cp.id as centre_poste_id,
            cp.poste_id,
            COALESCE(p.label, 'N/A') as poste_label,
            COALESCE(p.type_poste, 'MOD') as type_poste,
            COALESCE(cp.effectif_actuel, 0) as effectif_actuel,
            c.aps as effectif_aps
        FROM dbo.centre_postes cp
        LEFT JOIN dbo.postes p ON p.Code = cp.code_resp
        LEFT JOIN dbo.centres c ON c.id = cp.centre_id
        WHERE cp.centre_id = :centre_id
        ORDER BY p.label
    """)
    
    rows = db.execute(query, {"centre_id": centre_id}).mappings().all()
    
    return [
        PosteCentreItem(
            centre_poste_id=row["centre_poste_id"],
            poste_id=row["poste_id"],
            poste_label=row["poste_label"],
            type_poste=row["type_poste"],
            effectif_actuel=float(row["effectif_actuel"] or 0),
            effectif_aps=float(row["effectif_aps"]) if row["effectif_aps"] is not None else None
        )
        for row in rows
    ]


@router.get("/postes/available", response_model=List[dict])
def get_available_postes(
    db: Session = Depends(get_db)
):
    """
    Récupère la liste de tous les postes référencés.
    """
    postes = db.query(Poste).order_by(Poste.label).all()
    
    return [
        {
            "id": p.id,
            "label": p.label,
            "type_poste": p.type_poste,
            "Code": p.Code
        }
        for p in postes
    ]

