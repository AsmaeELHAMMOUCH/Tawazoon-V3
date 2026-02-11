# app/api/refs.py
from typing import List, Optional, Literal
from pydantic import BaseModel

from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import db_models
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
                p.type_poste AS type_poste,
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
                p.type_poste AS type_poste,
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
    Retourne toutes les régions.
    """
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info("GET /api/regions called")
        
        rows = db.execute(text("""
            SELECT id, label
            FROM dbo.regions
            ORDER BY label
        """)).mappings().all()
        
        result = [dict(r) for r in rows]
        logger.info(f"Successfully fetched {len(result)} regions")
        return result
        
    except Exception as e:
        import logging
        import uuid
        import traceback
        logger = logging.getLogger(__name__)
        trace_id = str(uuid.uuid4())
        
        logger.error(f"[{trace_id}] Failed to fetch regions: {repr(e)}")
        traceback.print_exc()
        
        # Message structuré pour le frontend
        error_detail = {
            "error": "INTERNAL_SERVER_ERROR",
            "message": "Impossible de charger les régions",
            "endpoint": "/api/regions",
            "trace_id": trace_id,
            "hint": "Vérifiez la connexion à la base de données"
        }
        
        raise HTTPException(status_code=500, detail=error_detail)

@router.get("/centres")
def list_centres(
    region_id: Optional[int] = Query(None),
    centre_id: Optional[int] = Query(None),
    categorie_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    sql = """
        SELECT
          c.id,
          CAST(c.cas AS FLOAT) AS cas,
          CAST(c.APS AS FLOAT) AS aps, -- ✅ Renamed to matches DB column name expectation
          CAST(c.APS AS FLOAT) AS aps_legacy, 
          c.label,
          c.region_id,
          c.direction_id, -- ✅ Added direction_id
          c.categorie_id,
          c.id_categorisation AS id_categorisation,
          cat.label AS categorisation_label, -- ✅ Ajout du label de catÃ©gorisation
          COALESCE(p.nb_postes, 0)      AS postes,
          COALESCE(p.type_agg, '')      AS type,
          COALESCE(f.fte_actuel, 0)     AS fte_actuel
        FROM dbo.centres c
        LEFT JOIN dbo.Categorisation cat ON cat.id_categorisation = c.id_categorisation -- ✅ Join categorisation
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
          AND (:categorie_id IS NULL OR c.categorie_id = :categorie_id)
          AND (:centre_id IS NULL OR c.id = :centre_id)
        ORDER BY c.label
    """
    rows = db.execute(text(sql), {"region_id": region_id, "categorie_id": categorie_id, "centre_id": centre_id}).mappings().all()
    
    result = [{**dict(r), "etp_calcule": None} for r in rows]
    
    return result

@router.get("/postes")
def list_postes(
    centre_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    # 🆕 Liste des postes à masquer pour le centre 2102
    POSTES_MASQUES_CENTRE_2102 = [
        "AGENT COURRIER",
        "AGENT OPERATIONS COURRIER",
        "GUICHETIER COURRIER",
        "RESPONSABLE ENTREPRISES ET PROFESSIONNELS (COURRIER)"
    ]
    
    if centre_id is not None:
        sql = """
            SELECT 
                p.id,
                MAX(cp.id) AS centre_poste_id,
                p.label,
                p.type_poste,
                p.Code,
                SUM(COALESCE(cp.effectif_actuel, 0)) AS effectif_actuel,
                MAX(hp.label) AS categorie
            FROM dbo.postes p
            INNER JOIN dbo.centre_postes cp ON cp.code_resp = p.Code
            LEFT JOIN dbo.Hierarchie_postes hp ON hp.code = p.hie_poste
            WHERE cp.centre_id = :centre_id
            GROUP BY p.id, p.label, p.type_poste, p.Code
            ORDER BY p.label
        """
        rows = db.execute(text(sql), {"centre_id": centre_id}).mappings().all()
        print(f"DEBUG: list_postes centre_id={centre_id} -> Found {len(rows)} rows")
        # print(f"DEBUG POSTES CENTRE {centre_id}: {[dict(r) for r in rows if r['centre_poste_id'] == 13627 or 'FACTEUR' in str(r['label'])]}") # Filtrer pour ne pas spammer

    else:
        sql = """
            SELECT 
                p.id,
                NULL AS centre_poste_id,
                p.label,
                p.type_poste AS type_poste,
                p.Code,
                0 AS effectif_actuel,
                NULL AS categorie
            FROM dbo.postes p
            ORDER BY p.label
        """
        rows = db.execute(text(sql)).mappings().all()

    # 🆕 Filtrer les postes masqués pour le centre 2102
    result = []
    for r in rows:
        # Si c'est le centre 2102 et que le poste est dans la liste des masqués, on l'ignore
        if centre_id == 2102 and r["label"] in POSTES_MASQUES_CENTRE_2102:
            continue
        
        result.append({
            "id": r["id"],
            "centre_poste_id": r["centre_poste_id"],
            "label": r["label"],
            "code": r.get("Code"),
            "type_poste": r.get("type_poste"),
            "effectif_actuel": r.get("effectif_actuel", 0),
            "category": r.get("categorie"), # ✅ Expose category (mapped from HierarchiePostes)
        })
    
    return result

@router.get("/categories", response_model=List[CategorieOut])
def list_categories(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, label
        FROM dbo.categories
        ORDER BY label
    """)).mappings().all()
    return [dict(r) for r in rows]

@router.get("/categorisations", response_model=List[CategorieOut])
def list_categorisations(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id_categorisation as id, label
        FROM dbo.Categorisation
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
            t.famille_uo,
            t.etat,
            t.phase,
            t.unite_mesure,
            t.moyenne_min,
            t.min_min AS min_min,
            t.moy_sec AS moy_sec, -- ✅ Corrected column name
            t.moy_sec AS min_sec, -- ✅ Alias for compatibility
            t.centre_poste_id,
            t.produit,
            t.base_calcul,
            t.ordre,
            p.label as poste_label,
            p.label as nom_poste, -- ✅ Alias pour compatibilité frontend
            p.type_poste -- ✅ Ajout type_poste
        FROM dbo.taches t
        INNER JOIN dbo.centre_postes cp ON cp.id = t.centre_poste_id
        INNER JOIN dbo.postes p ON p.Code = cp.code_resp 
        WHERE cp.centre_id = :centre_id
    """
    params = {"centre_id": centre_id}

    if poste_id is not None:
        query += " AND cp.poste_id = :poste_id"
        params["poste_id"] = poste_id

    query += " ORDER BY t.ordre ASC, t.id ASC"

    rows = db.execute(text(query), params).mappings().all()
    if rows:
        print(f"DEBUG TASKS KEYS: {rows[0].keys()}")
        print(f"DEBUG TASK LABEL: {rows[0].get('poste_label')}")
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
            p.type_poste           AS type_poste,
            SUM(COALESCE(cp.effectif_actuel,0)) AS etp_total,
            CAST(0.0 AS FLOAT)                   AS etp_requis,
            (0.0 - SUM(COALESCE(cp.effectif_actuel,0))) AS ecart,
            COUNT(DISTINCT c.id)                AS nb_centres
        FROM dbo.centre_postes cp
        JOIN dbo.centres c  ON c.id = cp.centre_id
        JOIN dbo.postes  p  ON p.id = cp.poste_id
        {extra_join}
        {where_clause}
        GROUP BY p.id, p.label, p.type
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



class PosteUpdate(BaseModel):
    centre_poste_id: int
    etp_arrondi: float

class VolumesAnnuelsInput(BaseModel):
    courrier_ordinaire: float = 0
    courrier_recommande: float = 0
    amana: float = 0
    ebarkia: float = 0
    lrh: float = 0
    sacs: float = 0
    colis: float = 0

class UpdateCategorisationInput(BaseModel):
    categorisation_id: int
    postes: Optional[List[PosteUpdate]] = None
    volumes: Optional[VolumesAnnuelsInput] = None

@router.put("/centres/{centre_id}/categorisation")
def update_centre_categorisation(
    centre_id: int, 
    input: UpdateCategorisationInput, 
    db: Session = Depends(get_db)
):
    """
    Met à jour l'id_categorisation d'un centre (Classe A, B, C, D...)
    Optionnel : Met à jour les effectifs des postes (simulation -> réel)
    """
    centre = db.query(db_models.Centre).filter(db_models.Centre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre non trouvé")
    
    # 1. Mise à jour de la catégorie (Classe)
    centre.id_categorisation = input.categorisation_id
    
    # 2. Mise à jour des effectifs postes (si fourni)
    updated_postes = 0
    if input.postes:
        for p_data in input.postes:
            # On cherche le CentrePoste correspondant
            cp = db.query(db_models.CentrePoste).filter(
                db_models.CentrePoste.id == p_data.centre_poste_id,
                db_models.CentrePoste.centre_id == centre_id # Sécurité
            ).first()
            
            if cp:
                # On met à jour l'effectif actuel avec l'arrondi de la simulation
                # Attention : cela écrase la valeur précédente
                cp.effectif_actuel = int(p_data.etp_arrondi)
                updated_postes += 1

    # 3. Mise à jour des volumes de référence (si fournis)
    if input.volumes:
        vol_ref = db.query(db_models.CentreVolumeRef).filter(db_models.CentreVolumeRef.centre_id == centre_id).first()
        if not vol_ref:
            vol_ref = db_models.CentreVolumeRef(centre_id=centre_id)
            db.add(vol_ref)
        
        vol_ref.courrier_ordinaire = input.volumes.courrier_ordinaire
        vol_ref.courrier_recommande = input.volumes.courrier_recommande
        vol_ref.amana = input.volumes.amana
        vol_ref.ebarkia = input.volumes.ebarkia
        vol_ref.lrh = input.volumes.lrh
        vol_ref.sacs = input.volumes.sacs
        vol_ref.colis = input.volumes.colis

    db.commit()
    
    return {
        "status": "success", 
        "centre_id": centre_id, 
        "id_categorisation": centre.id_categorisation,
        "updated_postes": updated_postes,
        "volumes_persisted": True if input.volumes else False
    }

@router.get("/centres/{centre_id}/volumes")
def get_centre_volumes(centre_id: int, db: Session = Depends(get_db)):
    """
    Récupère les volumes de référence d'un centre.
    """
    vol_ref = db.query(db_models.CentreVolumeRef).filter(db_models.CentreVolumeRef.centre_id == centre_id).first()
    if not vol_ref:
        return {
            "courrier_ordinaire": 0,
            "courrier_recommande": 0,
            "amana": 0,
            "ebarkia": 0,
            "lrh": 0,
            "sacs": 0,
            "colis": 0
        }
    
    return {
        "courrier_ordinaire": vol_ref.courrier_ordinaire,
        "courrier_recommande": vol_ref.courrier_recommande,
        "amana": vol_ref.amana,
        "ebarkia": vol_ref.ebarkia,
        "lrh": vol_ref.lrh,
        "sacs": vol_ref.sacs,
        "colis": vol_ref.colis
    }


@router.put("/centres/{centre_id}/typologie")
def update_centre_typology(
    centre_id: int, 
    typology_id: int = Body(..., embed=True), 
    db: Session = Depends(get_db)
):
    """
    Met à jour la typologie (categorie_id) d'un centre (AM, CCC, etc.)
    """
    centre = db.query(db_models.Centre).filter(db_models.Centre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre non trouvé")
    
    centre.categorie_id = typology_id
    db.commit()
    
    return {
        "status": "success", 
        "centre_id": centre_id, 
        "categorie_id": centre.categorie_id
    }
