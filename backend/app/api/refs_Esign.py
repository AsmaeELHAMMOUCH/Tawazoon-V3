from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from app.core.db import get_db
from app.schemas.refs import RegionOut, CategorieOut

router = APIRouter(tags=["refs"])

@router.get("/regions", response_model=List[RegionOut])
def list_regions(db: Session = Depends(get_db)):
    """Retourne toutes les régions depuis la BDD"""
    rows = db.execute(text("""
        SELECT id, label
        FROM dbo.regions
        ORDER BY label
    """)).mappings().all()
    return [dict(r) for r in rows]

@router.get("/centres")
def list_centres(
    region_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Liste les centres, optionnellement filtrés par région"""
    sql = """
        SELECT c.id, c.label, c.region_id, c.categorie_id
        FROM dbo.centres c
        WHERE 1=1
    """
    params = {}
    if region_id is not None:
        sql += " AND c.region_id = :region_id"
        params["region_id"] = region_id

    sql += " ORDER BY c.label"

    rows = db.execute(text(sql), params).mappings().all()
    return [dict(r) for r in rows]

@router.get("/postes")
def list_postes(
    centre_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Liste les postes, optionnellement filtrés par centre"""
    if centre_id is not None:
        sql = """
            SELECT p.id, p.label
            FROM dbo.postes p
            INNER JOIN dbo.centre_postes cp ON cp.poste_id = p.id
            WHERE cp.centre_id = :centre_id
            ORDER BY p.label
        """
        rows = db.execute(text(sql), {"centre_id": centre_id}).mappings().all()
    else:
        sql = "SELECT id, label FROM dbo.postes ORDER BY label"
        rows = db.execute(text(sql)).mappings().all()
    return [{"id": r["id"], "label": r["label"]} for r in rows]

@router.get("/categories", response_model=List[CategorieOut])
def list_categories(db: Session = Depends(get_db)):
    """Liste toutes les catégories"""
    rows = db.execute(text("""
        SELECT id, label
        FROM dbo.categories
        ORDER BY label
    """)).mappings().all()
    return [dict(r) for r in rows]

from sqlalchemy.orm import Session
from sqlalchemy import text

@router.get("/taches")
def get_taches(centre_id: int, poste_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = """
        SELECT
            t.id,
            t.nom_tache,
            t.phase,
            t.unite_mesure,
            t.moyenne_min,
            t.centre_poste_id
        FROM dbo.taches t
        INNER JOIN dbo.centre_postes cp ON cp.id = t.centre_poste_id
        WHERE cp.centre_id = :centre_id
    """
    params = {"centre_id": centre_id}

    if poste_id is not None:
        query += " AND cp.poste_id = :poste_id"
        params["poste_id"] = poste_id

    rows = db.execute(text(query), params).mappings().all()
    return [dict(r) for r in rows]

        

   