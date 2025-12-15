# app/api/refs.py
from typing import List, Optional, Literal
from pydantic import BaseModel

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas.refs import RegionOut, CategorieOut
#from app.services.simulation import calculer_simulation  # Import du service
#from app.schemas.models import VolumesInput, VolumesAnnuels
# Un seul router pour tout : refs + analyse
router = APIRouter(tags=["refs", "analyse"])

# ---------------------------
# Schémas pour les données siége
# ---------------------------
class AnalyseUniteOut(BaseModel):
    id: int
    unite: str
    fte_actuel: float
    postes: int
    fte_calcule: float

class ConsolideSiegeOut(BaseModel):
    key: str
    label: str
    type_poste: str
    etp_total: float
# ---------------------------
# Fonction helper pour regrouper les courriers
# ---------------------------
def _regrouper_courriers_annuels(courrier_ordinaire: float, courrier_recommande: float, 
                               ebarkia: float, lrh: float) -> dict:
    """Regroupe tous les types de courriers en une seule unitÃ©"""
    total_courrier_annuel = courrier_ordinaire + courrier_recommande + ebarkia + lrh
    
    return {
        "courrier_annuel": total_courrier_annuel,
        "courrier_mensuel": total_courrier_annuel / 12,
        "courrier_journalier": total_courrier_annuel / 260  # Approximation
    }

# ---------------------------
# Endpoint pour simuler par centre
# ---------------------------


# ---------------------------
# Endpoints pour VueSiège
# ---------------------------

@router.get("/analyse-unite", response_model=List[AnalyseUniteOut])
def get_analyse_unite(db: Session = Depends(get_db)):
    """
    Retourne les donnÃ©es d'analyse par unitÃ© pour le siÃ¨ge.
    RÃ©cupÃ¨re les unitÃ©s (centres) de type siÃ¨ge avec leurs effectifs.
    """
    try:
        sql = """
           SELECT 
    c.id,
    c.label AS unite,
    c.region_id,
    r.label AS region_label,
    COALESCE(SUM(cp.effectif_actuel), 0) AS fte_actuel,
    COUNT(DISTINCT cp.poste_id) AS postes,
    COALESCE(SUM(cp.effectif_actuel), 0) AS fte_calcule
FROM dbo.centres c
LEFT JOIN dbo.centre_postes cp 
    ON cp.centre_id = c.id
LEFT JOIN dbo.regions r
    ON r.id = c.region_id
WHERE c.region_id = 21   -- âœ… filtre rÃ©gion (ex: SIEGE)
GROUP BY 
    c.id, c.label, c.region_id, r.label
ORDER BY c.label;
        """
        rows = db.execute(text(sql)).mappings().all()
        
        return [
            {
                "id": r["id"],
                "unite": r["unite"],
                "fte_actuel": float(r["fte_actuel"]),
                "postes": int(r["postes"]),
                "fte_calcule": float(r["fte_calcule"])
            }
            for r in rows
        ]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la rÃ©cupÃ©ration des donnÃ©es siÃ¨ge: {str(e)}")

@router.get("/consolide-siege", response_model=List[ConsolideSiegeOut])
def get_consolide_siege(
    region_id: int = Query(21, description="ID rÃ©gion siÃ¨ge (par dÃ©faut 21)"),
    db: Session = Depends(get_db)
):
    """
    Retourne les donnÃ©es consolidÃ©es par poste pour le siÃ¨ge.
    AgrÃ¨ge les ETP actuels par poste (filtre par rÃ©gion).
    """
    try:
        sql = """
            SELECT 
                p.id AS poste_id,
                p.label,
                p.type_poste,
                SUM(COALESCE(cp.effectif_actuel, 0)) AS etp_total
            FROM dbo.centre_postes cp
            INNER JOIN dbo.postes p ON p.id = cp.poste_id
            INNER JOIN dbo.centres c ON c.id = cp.centre_id
            WHERE c.region_id = :region_id
            GROUP BY p.id, p.label, p.type_poste
            ORDER BY etp_total DESC;
        """
        rows = db.execute(text(sql), {"region_id": region_id}).mappings().all()

        return [
            {
                "key": f"poste_{r['poste_id']}",
                "label": r["label"],
                "type_poste": r["type_poste"] or "MOI",
                "etp_total": float(r["etp_total"] or 0),
            }
            for r in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la rÃ©cupÃ©ration du consolidÃ© siÃ¨ge: {str(e)}")



@router.get("/siege-postes")
def get_siege_postes(
    unite_id: int = Query(..., description="ID de l'unitÃ© siÃ¨ge"),
    db: Session = Depends(get_db)
):
    """
    Retourne les postes dÃ©taillÃ©s pour une unitÃ© siÃ¨ge spÃ©cifique (ETP actuel uniquement).
    """
    try:
        sql = """
            SELECT
                p.id        AS poste_id,
                p.label     AS poste_label,
                p.type_poste,
                COALESCE(cp.effectif_actuel, 0) AS effectif_actuel
            FROM dbo.centre_postes cp
            JOIN dbo.postes p   ON p.id = cp.poste_id
            WHERE cp.centre_id = :unite_id
            ORDER BY p.label;
        """
        rows = db.execute(text(sql), {"unite_id": unite_id}).mappings().all()

        return [
            {
                "poste_id": r["poste_id"],
                "poste_label": r["poste_label"],
                "type_poste": r["type_poste"] or "MOI",
                "effectif_actuel": float(r["effectif_actuel"]),
            }
            for r in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la rÃ©cupÃ©ration des postes: {str(e)}")


@router.get("/directions")
def get_directions(db: Session = Depends(get_db)):
    """
    Retourne la liste des directions (pour compatibilitÃ© avec le frontend).
    """
    try:
        sql = """
            SELECT 
                id,
                code,
                label
            FROM dbo.directions
            ORDER BY label
        """
        rows = db.execute(text(sql)).mappings().all()
        
        return [dict(r) for r in rows]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la rÃ©cupÃ©ration des directions: {str(e)}")

# ---------------------------
# Vos endpoints existants (rÃ©gions, centres, postes, catÃ©gories, tÃ¢ches, consolidÃ©)
# ---------------------------
@router.get("/regions", response_model=List[RegionOut])
def list_regions(db: Session = Depends(get_db)):
    """
    Retourne toutes les rÃ©gions (directions).
    """
    rows = db.execute(text("""
        SELECT id, label
        FROM dbo.regions
        ORDER BY label
    """)).mappings().all()
    return [dict(r) for r in rows]

@router.get("/centres")
def list_centres(
    region_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    sql = """
        SELECT
          c.id,
          c.label,
          c.region_id,
          c.categorie_id,
          COALESCE(p.nb_postes, 0)      AS postes,
          COALESCE(p.type_agg, '')      AS type,
          COALESCE(f.fte_actuel, 0)     AS fte_actuel
        FROM dbo.centres c
        -- agrÃ©gats postes (nb + type_agg)
        LEFT JOIN (
          SELECT
            cp.centre_id,
            COUNT(*) AS nb_postes,
            CASE
              WHEN MIN(p.type_poste) = MAX(p.type_poste) THEN MIN(p.type_poste)
              ELSE 'MOI/MOD'
            END AS type_agg
          FROM dbo.centre_postes cp
          INNER JOIN dbo.postes p ON p.id = cp.poste_id
          GROUP BY cp.centre_id
        ) p ON p.centre_id = c.id
        -- somme effectif actuel par centre
        LEFT JOIN (
          SELECT
            cp.centre_id,
            SUM(COALESCE(cp.effectif_actuel, 0)) AS fte_actuel
          FROM dbo.centre_postes cp
          GROUP BY cp.centre_id
        ) f ON f.centre_id = c.id
        WHERE (:region_id IS NULL OR c.region_id = :region_id)
        ORDER BY c.label
    """
    rows = db.execute(text(sql), {"region_id": region_id}).mappings().all()
    return [{**dict(r), "etp_calcule": None} for r in rows]

@router.get("/postes")
def list_postes(
    centre_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    if centre_id is not None:
        sql = """
            SELECT 
                p.id,
                p.label,
                p.type_poste,
                COALESCE(cp.effectif_actuel, 0) AS effectif_actuel
            FROM dbo.postes p
            INNER JOIN dbo.centre_postes cp ON cp.poste_id = p.id
            WHERE cp.centre_id = :centre_id
            ORDER BY p.label
        """
        rows = db.execute(text(sql), {"centre_id": centre_id}).mappings().all()
    else:
        sql = """
            SELECT 
                p.id,
                p.label,
                p.type_poste,
                0 AS effectif_actuel
            FROM dbo.postes p
            ORDER BY p.label
        """
        rows = db.execute(text(sql)).mappings().all()

    return [
        {
            "id": r["id"],
            "label": r["label"],
            "type_poste": r.get("type_poste"),
            "effectif_actuel": r.get("effectif_actuel", 0),
        }
        for r in rows
    ]

@router.get("/categories", response_model=List[CategorieOut])
def list_categories(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, label
        FROM dbo.categories
        ORDER BY label
    """)).mappings().all()
    return [dict(r) for r in rows]

@router.get("/taches")
def get_taches(
    centre_id: int,
    poste_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
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

@router.get("/consolide-postes")
def consolide_postes(
    scope: Literal["global", "direction"] = Query("direction"),
    direction_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """
    Retourne le consolidÃ© par poste :
    - scope=direction + direction_id : une seule direction
    - scope=global : toutes les directions
    """

    if scope == "direction" and direction_id is None:
        raise HTTPException(status_code=400, detail="direction_id est requis pour scope=direction")

    base_sql = """
        SELECT
            p.id             AS poste_id,
            p.label          AS poste_label,
            p.type_poste     AS type_poste,
            SUM(COALESCE(cp.effectif_actuel,0)) AS etp_total,
            CAST(0.0 AS FLOAT)                   AS etp_requis,
            (0.0 - SUM(COALESCE(cp.effectif_actuel,0))) AS ecart,
            COUNT(DISTINCT c.id)                AS nb_centres
        FROM dbo.centre_postes cp
        JOIN dbo.centres c  ON c.id = cp.centre_id
        JOIN dbo.postes  p  ON p.id = cp.poste_id
        {extra_join}
        {where_clause}
        GROUP BY p.id, p.label, p.type_poste
        ORDER BY etp_total DESC;
    """

    params: dict = {}
    if scope == "direction":
        extra_join = "JOIN dbo.directions d ON d.id = :direction_id"
        where_clause = (
            "WHERE (c.direction_id = d.id) OR ((c.direction_id IS NULL OR c.direction_id = 0) AND c.region_id = d.region_id)"
        )
        params["direction_id"] = direction_id
    else:
        extra_join = ""
        where_clause = ""

    sql = text(base_sql.format(extra_join=extra_join, where_clause=where_clause))
    rows = db.execute(sql, params).mappings().all()

    totals = {
        "etp_total":  sum(r["etp_total"]  or 0 for r in rows),
        "etp_requis": sum(r["etp_requis"] or 0 for r in rows),
        "ecart":      sum((r["etp_requis"] or 0) - (r["etp_total"] or 0) for r in rows),
        "nb_centres": max((r["nb_centres"] or 0 for r in rows), default=0),
    }

    data = [
        {
            "poste_id":   r["poste_id"],
            "label":      r["poste_label"],
            "type_poste": (r.get("type_poste") or "").upper(),
            "etp_total":  float(r["etp_total"]  or 0),
            "etp_requis": float(r["etp_requis"] or 0),
            "ecart":      float(r["etp_requis"] or 0) - float(r["etp_total"] or 0),
            "nb_centres": int(r["nb_centres"] or 0),
        }
        for r in rows
    ]

    return {"rows": data, "totals": totals}

