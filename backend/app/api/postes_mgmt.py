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
    
    Retourne la liste des postes (via centre_postes) avec :
    - Label du poste
    - Type (MOD/MOI)
    - Effectif actuel
    - Effectif statutaire
    - Effectif APS
    """
    # Vérifier que le centre existe
    centre = db.query(Centre).filter(Centre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail=f"Centre {centre_id} non trouvé")
    
    # Requête pour récupérer les postes du centre
    query = text("""
        SELECT 
            cp.id as centre_poste_id,
            cp.poste_id,
            COALESCE(p.label, 'N/A') as poste_label,
            COALESCE(p.type_poste, 'MOD') as type_poste,
            COALESCE(cp.effectif_actuel, 0) as effectif_actuel,
            c.aps as effectif_aps
        FROM dbo.centre_postes cp
        LEFT JOIN dbo.postes p ON p.id = cp.poste_id
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


@router.put("/centre-postes/{centre_poste_id}")
def update_poste_effectifs(
    centre_poste_id: int,
    data: PosteCentreUpdate,
    db: Session = Depends(get_db)
):
    """
    Met à jour les effectifs d'un poste dans un centre.
    """
    # Vérifier que le centre_poste existe
    centre_poste = db.query(CentrePoste).filter(CentrePoste.id == centre_poste_id).first()
    if not centre_poste:
        raise HTTPException(status_code=404, detail=f"Centre-Poste {centre_poste_id} non trouvé")
    
    # Mise à jour des champs fournis
    if data.effectif_actuel is not None:
        centre_poste.effectif_actuel = data.effectif_actuel
    
    # NOTE: effectif_statutaire n'existe pas dans la BDD
    # NOTE: effectif_aps est au niveau Centre, pas CentrePoste, donc on ne le modifie pas ici pour l'instant
    
    db.commit()
    db.refresh(centre_poste)
    
    return {
        "success": True,
        "message": f"Effectifs mis à jour pour le poste {centre_poste_id}",
        "data": {
            "centre_poste_id": centre_poste.id,
            "effectif_actuel": centre_poste.effectif_actuel
        }
    }


@router.post("/centres/{centre_id}/postes")
def create_poste_in_centre(
    centre_id: int,
    data: PosteCentreCreate,
    db: Session = Depends(get_db)
):
    """
    Ajoute un nouveau poste à un centre.
    """
    # Vérifier que le centre existe
    centre = db.query(Centre).filter(Centre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail=f"Centre {centre_id} non trouvé")
    
    # Vérifier que le poste existe
    poste = db.query(Poste).filter(Poste.id == data.poste_id).first()
    if not poste:
        raise HTTPException(status_code=404, detail=f"Poste {data.poste_id} non trouvé")
    
    # Vérifier que ce poste n'existe pas déjà dans ce centre
    existing = db.query(CentrePoste).filter(
        CentrePoste.centre_id == centre_id,
        CentrePoste.poste_id == data.poste_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Le poste {poste.label} existe déjà dans ce centre"
        )
    
    # Créer le nouveau centre_poste
    new_centre_poste = CentrePoste(
        centre_id=centre_id,
        poste_id=data.poste_id,
        effectif_actuel=data.effectif_actuel
    )
    
    db.add(new_centre_poste)
    db.commit()
    db.refresh(new_centre_poste)
    
    return {
        "success": True,
        "message": f"Poste {poste.label} ajouté au centre {centre.label}",
        "data": {
            "centre_poste_id": new_centre_poste.id,
            "poste_id": new_centre_poste.poste_id,
            "poste_label": poste.label
        }
    }


@router.delete("/centre-postes/{centre_poste_id}")
def delete_poste_from_centre(
    centre_poste_id: int,
    db: Session = Depends(get_db)
):
    """
    Supprime un poste d'un centre.
    ⚠️ Attention : Cela supprimera aussi toutes les tâches associées.
    """
    centre_poste = db.query(CentrePoste).filter(CentrePoste.id == centre_poste_id).first()
    if not centre_poste:
        raise HTTPException(status_code=404, detail=f"Centre-Poste {centre_poste_id} non trouvé")
    
    # Récupérer les infos avant suppression
    poste_label = centre_poste.poste.label if centre_poste.poste else "N/A"
    centre_label = centre_poste.centre.label if centre_poste.centre else "N/A"
    
    db.delete(centre_poste)
    db.commit()
    
    return {
        "success": True,
        "message": f"Poste {poste_label} supprimé du centre {centre_label}"
    }


@router.get("/postes/available", response_model=List[dict])
def get_available_postes(
    db: Session = Depends(get_db)
):
    """
    Récupère la liste de tous les postes disponibles (pour ajout).
    """
    postes = db.query(Poste).order_by(Poste.label).all()
    
    return [
        {
            "id": p.id,
            "label": p.label,
            "type_poste": p.type_poste
        }
        for p in postes
    ]


@router.post("/import-effectifs")
async def import_effectifs(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Importe un fichier Excel pour mettre à jour les effectifs globalement.
    """
    return await _process_import(file, db, None)


@router.post("/centres/{centre_id}/import-effectifs")
async def import_centre_effectifs(
    centre_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Importe un fichier Excel pour mettre à jour les effectifs d'un centre spécifique.
    """
    return await _process_import(file, db, centre_id)


async def _process_import(file: UploadFile, db: Session, target_centre_id: Optional[int] = None):
    try:
        from sqlalchemy import func
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        df.columns = [str(c).upper().strip() for c in df.columns]
        
        col_centre = next((c for c in ['RATTACHEMENT', 'CENTRE_LABEL', 'CENTRE'] if c in df.columns), None)
        col_poste = next((c for c in ['POSTE', 'POSTE_LABEL'] if c in df.columns), None)
        col_effectif = next((c for c in ['EFFECTIF_ACTUEL', 'EFFECTIF'] if c in df.columns), None)
        
        # Si target_centre_id est fourni, la colonne centre est optionnelle
        if not target_centre_id and not col_centre:
            return {
                "success": False,
                "message": "Le fichier doit contenir une colonne 'RATTACHEMENT' ou 'CENTRE_LABEL' pour un import global."
            }
            
        if not col_poste:
            return {
                "success": False,
                "message": "Le fichier doit contenir une colonne 'POSTE' ou 'POSTE_LABEL'."
            }
            
        # Nettoyage
        def clean_val(x):
            if isinstance(x, str):
                return x.replace(u'\xa0', ' ').strip().upper()
            return str(x).strip().upper() if x is not None else ""

        if col_centre:
            df[col_centre] = df[col_centre].apply(clean_val)
        df[col_poste] = df[col_poste].apply(clean_val)

        # Vérifier si colonne APS existe
        col_aps = next((c for c in ['APS', 'EFFECTIF_APS'] if c in df.columns), None)
        
        # Préparation des données
        data_to_process = []
        group_cols = [col_poste]
        if col_centre and not target_centre_id:
            group_cols.insert(0, col_centre)

        # Ajouter APS aux colonnes à agréger si présent
        agg_dict = {col_effectif: 'sum'} if col_effectif else {}
        if col_aps:
            agg_dict[col_aps] = 'first'  # On prend la première valeur (devrait être identique pour un centre)

        if col_effectif:
            if agg_dict:
                grouped = df.groupby(group_cols).agg(agg_dict).reset_index()
            else:
                grouped = df.groupby(group_cols)[col_effectif].sum().reset_index()
            
            for _, row in grouped.iterrows():
                data_to_process.append({
                    'centre': str(row[col_centre]) if col_centre and not target_centre_id else None,
                    'poste': str(row[col_poste]),
                    'count': float(row[col_effectif] or 0),
                    'aps': float(row[col_aps]) if col_aps and col_aps in row and pd.notna(row[col_aps]) else None
                })
        else:
            grouped = df.groupby(group_cols).size().reset_index(name='count')
            for _, row in grouped.iterrows():
                data_to_process.append({
                    'centre': str(row[col_centre]) if col_centre and not target_centre_id else None,
                    'poste': str(row[col_poste]),
                    'count': int(row['count']),
                    'aps': None
                })
        
        results = {"success": True, "processed": 0, "updated": 0, "created": 0, "errors": []}
        
        def clean_str(s):
            if not isinstance(s, str): return str(s)
            return s.replace(u'\xa0', ' ').strip().upper()

        centres_map = {clean_str(c.label): c.id for c in db.query(Centre).all()}
        postes_map = {clean_str(p.label): p.id for p in db.query(Poste).all()}
        
        processed_poste_ids = []
        aps_value = None
        
        for item in data_to_process:
            raw_poste = item['poste']
            count = item['count']
            poste_key = clean_str(raw_poste)
            
            # Capturer la valeur APS si présente
            if item.get('aps') is not None:
                aps_value = item['aps']
            
            results["processed"] += 1
            
            # Déterminer le centre_id
            centre_id = target_centre_id
            if not centre_id:
                raw_centre = item['centre']
                centre_key = clean_str(raw_centre)
                centre_id = centres_map.get(centre_key)
                if not centre_id:
                    if len(results["errors"]) < 10:
                        results["errors"].append(f"Centre inconnu : {raw_centre}")
                    continue

            # Trouver ou créer le poste
            poste_id = postes_map.get(poste_key)
            if not poste_id:
                try:
                    existing_p = db.query(Poste).filter(func.lower(Poste.label) == func.lower(raw_poste.strip())).first()
                    if existing_p:
                        poste_id = existing_p.id
                        postes_map[poste_key] = poste_id
                    else:
                        new_p_ref = Poste(label=raw_poste.strip(), type_poste="MOD")
                        db.add(new_p_ref)
                        db.flush()
                        poste_id = new_p_ref.id
                        postes_map[poste_key] = poste_id
                        results["created_refs"] = results.get("created_refs", 0) + 1
                except Exception:
                    if len(results["errors"]) < 10:
                        results["errors"].append(f"Erreur avec le poste : {raw_poste}")
                    continue
            
            # Garder trace des postes vus dans le fichier (pour le centre cible)
            if target_centre_id:
                processed_poste_ids.append(poste_id)

            # Mise à jour ou création
            centre_poste = db.query(CentrePoste).filter(
                CentrePoste.centre_id == centre_id,
                CentrePoste.poste_id == poste_id
            ).first()
            
            if centre_poste:
                centre_poste.effectif_actuel = count
                results["updated"] += 1
            else:
                new_cp = CentrePoste(centre_id=centre_id, poste_id=poste_id, effectif_actuel=count)
                db.add(new_cp)
                results["created"] += 1
        
        # 🔴 SYNCHRONISATION : Supprimer les postes du centre qui ne sont plus dans le fichier
        if target_centre_id:
            delete_query = db.query(CentrePoste).filter(
                CentrePoste.centre_id == target_centre_id,
                ~CentrePoste.poste_id.in_(processed_poste_ids)
            )
            deleted_count = delete_query.count()
            delete_query.delete(synchronize_session=False)
            if deleted_count > 0:
                results["deleted"] = deleted_count
        
        # Mise à jour de l'APS si une valeur a été trouvée
        if target_centre_id and aps_value is not None:
            c = db.query(Centre).filter(Centre.id == target_centre_id).first()
            if c:
                c.t_aps = aps_value
                results["aps_updated"] = True
        
        db.commit()
        
        msg = f"Import terminé : {results['updated']} mis à jour, {results['created']} créés."
        if results.get("aps_updated"):
            msg += " L'effectif APS a été mis à jour."
        if results.get("deleted"):
            msg += f" {results['deleted']} postes supprimés (absents du fichier)."
        msg += f" {len(results['errors'])} erreurs."
        
        results["message"] = msg
        return results
        
    except Exception as e:
        print(f"Erreur import: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'import : {str(e)}")



@router.get("/centres/{centre_id}/export-template")
def export_centre_template(centre_id: int, db: Session = Depends(get_db)):
    """Génère un template Excel pour un centre spécifique"""
    try:
        from sqlalchemy.orm import joinedload
        
        # 1. Vérifier existence centre avec eager loading de la région
        centre_info = db.query(Centre).options(joinedload(Centre.region)).filter(Centre.id == centre_id).first()
        if not centre_info:
            raise HTTPException(status_code=404, detail=f"Centre {centre_id} introuvable")

        # 2. Récupérer les données
        query = text("""
            SELECT 
                r.label as region,
                c.label as centre_label,
                p.label as poste,
                COALESCE(cp.effectif_actuel, 0) as effectif_actuel
            FROM dbo.centre_postes cp
            JOIN dbo.centres c ON c.id = cp.centre_id
            LEFT JOIN dbo.regions r ON r.id = c.region_id
            JOIN dbo.postes p ON p.id = cp.poste_id
            WHERE cp.centre_id = :centre_id
            ORDER BY p.label
        """)
        rows = db.execute(query, {"centre_id": centre_id}).mappings().all()
        
        # Récupérer APS
        aps_value = centre_info.aps if centre_info.aps is not None else 0
        
        data = []
        for r in rows:
            data.append({
                "REGION": r["region"] if r["region"] else "",
                "centre_label": r["centre_label"],
                "POSTE": r["poste"],
                "EFFECTIF_ACTUEL": r["effectif_actuel"],
                "APS": aps_value
            })
        
        # Si aucune donnée (centre sans postes), créer une ligne vide modèle
        if not data:
            region_label = centre_info.region.label if centre_info.region else ""
            data = [{
                "REGION": region_label,
                "centre_label": centre_info.label,
                "POSTE": "",
                "EFFECTIF_ACTUEL": 0,
                "APS": aps_value
            }]
            
        df = pd.DataFrame(data)
        
        # Ordonner les colonnes pour que le template soit propre
        cols = ["REGION", "centre_label", "POSTE", "EFFECTIF_ACTUEL", "APS"]
        # S'assurer que les colonnes existent
        for c in cols:
            if c not in df.columns:
                df[c] = ""
        df = df[cols]
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Effectifs Centre')
        
        output.seek(0)
        filename = f"template_effectifs_{centre_id}.xlsx"
        
        return StreamingResponse(
            output, 
            headers={'Content-Disposition': f'attachment; filename="{filename}"'}, 
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Erreur export template centre: {str(e)}")
        # Renvoyer une erreur 500 explicite
        raise HTTPException(status_code=500, detail=f"Erreur technique génération Excel: {str(e)}")


@router.get("/export-template")
def export_template(db: Session = Depends(get_db)):
    """Génère un template Excel global"""
    try:
        query = text("""
            SELECT 
                r.label as region,
                c.label as centre_label,
                p.label as poste,
                COALESCE(cp.effectif_actuel, 0) as effectif_actuel
            FROM dbo.centre_postes cp
            JOIN dbo.centres c ON c.id = cp.centre_id
            JOIN dbo.regions r ON r.id = c.region_id
            JOIN dbo.postes p ON p.id = cp.poste_id
            ORDER BY r.label, c.label, p.label
        """)
        rows = db.execute(query).mappings().all()
        
        df = pd.DataFrame([{
            "REGION": r["region"],
            "centre_label": r["centre_label"],
            "POSTE": r["poste"],
            "EFFECTIF_ACTUEL": r["effectif_actuel"]
        } for r in rows])
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Effectifs')
        
        output.seek(0)
        return StreamingResponse(output, headers={'Content-Disposition': 'attachment; filename="template_effectifs_global.xlsx"'}, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



class ApsUpdate(BaseModel):
    aps: float

@router.put("/centres/{centre_id}/aps")
def update_centre_aps(
    centre_id: int,
    update: ApsUpdate,
    db: Session = Depends(get_db)
):
    centre = db.query(Centre).filter(Centre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre non trouvé")
    
    centre.t_aps = update.aps
    db.commit()
    return {"success": True, "aps": centre.t_aps}


class PosteRefUpdate(BaseModel):
    label: Optional[str] = None
    type_poste: Optional[str] = None

@router.put("/postes/{poste_id}")
def update_poste_ref(
    poste_id: int,
    data: PosteRefUpdate,
    db: Session = Depends(get_db)
):
    """
    Met à jour un poste du référentiel (Global).
    """
    poste = db.query(Poste).filter(Poste.id == poste_id).first()
    if not poste:
        raise HTTPException(status_code=404, detail="Poste non trouvé")
    
    if data.label is not None:
        poste.label = data.label
    if data.type_poste is not None:
        poste.type_poste = data.type_poste
        
    db.commit()
    return {"success": True, "message": "Poste mis à jour"}

@router.delete("/postes/{poste_id}")
def delete_poste_ref(
    poste_id: int,
    db: Session = Depends(get_db)
):
    """
    Supprime un poste du référentiel (Global).
    ATTENTION: Supprime aussi les liens dans les centres (cascade) si configuré, 
    sinon il faut gérer manuellement. Ici on supprime manuellement les dépendances pour éviter les erreurs FK.
    """
    poste = db.query(Poste).filter(Poste.id == poste_id).first()
    if not poste:
        raise HTTPException(status_code=404, detail="Poste non trouvé")
    
    # Suppression manuelle des dépendances connues
    # 1. CentrePoste
    db.query(CentrePoste).filter(CentrePoste.poste_id == poste_id).delete()
    
    # 2. Le poste lui-même
    db.delete(poste)
    db.commit()
    
    return {"success": True, "message": f"Poste {poste.label} supprimé définitivement"}

