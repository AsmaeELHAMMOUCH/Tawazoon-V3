"""
Service optimisé pour les référentiels avec cache Redis

Ce module fournit des fonctions pour récupérer les référentiels
(centres, postes, tâches, etc.) avec mise en cache automatique.
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Optional
import logging

from app.core.cache import cache_referentiel, invalidate_cache

logger = logging.getLogger(__name__)


@cache_referentiel(ttl=7200)  # Cache 2h
def get_referentiel_taches(
    db: Session,
    centre_id: int,
    poste_id: int
) -> List[Dict]:
    """
    Récupère le référentiel des tâches pour un centre et un poste
    avec mise en cache automatique
    
    Args:
        db: Session SQLAlchemy
        centre_id: ID du centre
        poste_id: ID du poste
        
    Returns:
        List[Dict]: Liste des tâches avec leurs détails
    """
    logger.info(f"📊 Chargement référentiel tâches (centre={centre_id}, poste={poste_id})")
    
    sql = text("""
        SELECT 
            t.id,
            t.nom_tache,
            t.phase,
            t.unite_mesure,
            t.moyenne_min,
            t.centre_poste_id,
            p.nom_poste,
            p.type_poste,
            cp.effectif_actuel
        FROM dbo.taches t
        JOIN dbo.centre_poste cp ON t.centre_poste_id = cp.id
        JOIN dbo.postes p ON cp.poste_id = p.id
        WHERE cp.centre_id = :centre_id 
        AND cp.poste_id = :poste_id
        ORDER BY t.phase, t.nom_tache
    """)
    
    result = db.execute(sql, {"centre_id": centre_id, "poste_id": poste_id})
    taches = [dict(row._mapping) for row in result]
    
    logger.info(f"✅ {len(taches)} tâches chargées")
    return taches


@cache_referentiel(ttl=7200)  # Cache 2h
def get_centres_by_direction(db: Session, direction_id: int) -> List[Dict]:
    """
    Récupère les centres d'une direction avec cache
    
    Args:
        db: Session SQLAlchemy
        direction_id: ID de la direction
        
    Returns:
        List[Dict]: Liste des centres
    """
    logger.info(f"📊 Chargement centres (direction={direction_id})")
    
    sql = text("""
        SELECT 
            c.id,
            c.label,
            c.region_id,
            c.direction_id
        FROM dbo.centres c
        WHERE c.direction_id = :direction_id
        ORDER BY c.label
    """)
    
    result = db.execute(sql, {"direction_id": direction_id})
    centres = [dict(row._mapping) for row in result]
    
    logger.info(f"✅ {len(centres)} centres chargés")
    return centres


@cache_referentiel(ttl=7200)  # Cache 2h
def get_postes_by_centre(db: Session, centre_id: int) -> List[Dict]:
    """
    Récupère les postes d'un centre avec cache
    
    Args:
        db: Session SQLAlchemy
        centre_id: ID du centre
        
    Returns:
        List[Dict]: Liste des postes avec effectifs
    """
    logger.info(f"📊 Chargement postes (centre={centre_id})")
    
    sql = text("""
        SELECT 
            p.id,
            p.nom_poste,
            p.type_poste,
            cp.effectif_actuel,
            cp.id as centre_poste_id
        FROM dbo.postes p
        JOIN dbo.centre_poste cp ON p.id = cp.poste_id
        WHERE cp.centre_id = :centre_id
        ORDER BY p.nom_poste
    """)
    
    result = db.execute(sql, {"centre_id": centre_id})
    postes = [dict(row._mapping) for row in result]
    
    logger.info(f"✅ {len(postes)} postes chargés")
    return postes


@cache_referentiel(ttl=14400)  # Cache 4h (change rarement)
def get_all_regions(db: Session) -> List[Dict]:
    """
    Récupère toutes les régions avec cache
    
    Args:
        db: Session SQLAlchemy
        
    Returns:
        List[Dict]: Liste des régions
    """
    logger.info("📊 Chargement régions")
    
    sql = text("""
        SELECT 
            id,
            label
        FROM dbo.regions
        ORDER BY label
    """)
    
    result = db.execute(sql)
    regions = [dict(row._mapping) for row in result]
    
    logger.info(f"✅ {len(regions)} régions chargées")
    return regions


@cache_referentiel(ttl=14400)  # Cache 4h
def get_all_directions(db: Session) -> List[Dict]:
    """
    Récupère toutes les directions avec cache
    
    Args:
        db: Session SQLAlchemy
        
    Returns:
        List[Dict]: Liste des directions
    """
    logger.info("📊 Chargement directions")
    
    sql = text("""
        SELECT 
            d.id,
            d.label,
            d.region_id,
            r.label as region_label
        FROM dbo.directions d
        LEFT JOIN dbo.regions r ON d.region_id = r.id
        ORDER BY d.label
    """)
    
    result = db.execute(sql)
    directions = [dict(row._mapping) for row in result]
    
    logger.info(f"✅ {len(directions)} directions chargées")
    return directions


@cache_referentiel(ttl=7200)  # Cache 2h
def get_direction_complete_data(db: Session, direction_id: int) -> Optional[Dict]:
    """
    Récupère TOUTES les données d'une direction en UNE SEULE requête optimisée
    (centres, postes, tâches, effectifs)
    
    Cette fonction remplace plusieurs requêtes en cascade par une seule requête
    avec jointures, ce qui améliore drastiquement les performances.
    
    Args:
        db: Session SQLAlchemy
        direction_id: ID de la direction
        
    Returns:
        Dict: Données complètes de la direction structurées
    """
    logger.info(f"📊 Chargement complet direction (id={direction_id})")
    
    sql = text("""
        WITH DirectionInfo AS (
            SELECT 
                d.id,
                d.label,
                d.region_id,
                r.label as region_label
            FROM dbo.directions d
            LEFT JOIN dbo.regions r ON d.region_id = r.id
            WHERE d.id = :direction_id
        ),
        CentresData AS (
            SELECT 
                c.id as centre_id,
                c.label as centre_label,
                c.region_id,
                cp.id as centre_poste_id,
                cp.poste_id,
                cp.effectif_actuel,
                p.nom_poste,
                p.type_poste
            FROM dbo.centres c
            JOIN dbo.centre_poste cp ON c.id = cp.centre_id
            JOIN dbo.postes p ON cp.poste_id = p.id
            WHERE c.direction_id = :direction_id
        ),
        TachesData AS (
            SELECT 
                t.id as tache_id,
                t.nom_tache,
                t.phase,
                t.unite_mesure,
                t.moyenne_min,
                t.canal,
                t.type_courrier,
                cd.centre_id,
                cd.centre_label,
                cd.poste_id,
                p.id as poste_code,
                cd.nom_poste,
                cd.type_poste,
                cd.effectif_actuel,
                cd.centre_poste_id
            FROM dbo.taches t
            JOIN CentresData cd ON t.centre_poste_id = cd.centre_poste_id
            JOIN dbo.postes p ON cd.poste_id = p.id
        )
        SELECT 
            di.id as direction_id,
            di.label as direction_label,
            di.region_id,
            di.region_label,
            td.*
        FROM DirectionInfo di
        LEFT JOIN TachesData td ON 1=1
    """)
    
    result = db.execute(sql, {"direction_id": direction_id})
    rows = [dict(row._mapping) for row in result]
    
    if not rows or rows[0]["direction_id"] is None:
        logger.warning(f"⚠️ Direction {direction_id} non trouvée")
        return None
    
    # Restructurer les données de manière hiérarchique
    direction_data = {
        "id": rows[0]["direction_id"],
        "label": rows[0]["direction_label"],
        "region_id": rows[0]["region_id"],
        "region_label": rows[0]["region_label"],
        "centres": {}
    }
    
    # Organiser par centre
    for row in rows:
        if row["centre_id"] is None:
            continue
            
        centre_id = row["centre_id"]
        
        # Initialiser le centre si nécessaire
        if centre_id not in direction_data["centres"]:
            direction_data["centres"][centre_id] = {
                "id": centre_id,
                "label": row["centre_label"],
                "postes": {},
                "taches": []
            }
        
        # Ajouter le poste si nécessaire
        poste_id = row["poste_id"]
        if poste_id and poste_id not in direction_data["centres"][centre_id]["postes"]:
            direction_data["centres"][centre_id]["postes"][poste_id] = {
                "id": poste_id,

                "nom": row["nom_poste"],
                "type": row["type_poste"],
                "effectif_actuel": row["effectif_actuel"]
            }
        
        # Ajouter la tâche
        if row["tache_id"]:
            direction_data["centres"][centre_id]["taches"].append({
                "id": row["tache_id"],
                "nom_tache": row["nom_tache"],
                "phase": row["phase"],
                "moyenne_min": row["moyenne_min"],
                "unite_mesure": row["unite_mesure"],
                "canal": row["canal"],
                "type_courrier": row["type_courrier"],
                "poste_code": row["poste_code"],
                "type_poste": row["type_poste"]
            })
    
    # Convertir les dicts de postes en listes
    for centre in direction_data["centres"].values():
        centre["postes"] = list(centre["postes"].values())
    
    # Convertir le dict de centres en liste
    direction_data["centres"] = list(direction_data["centres"].values())
    
    logger.info(
        f"✅ Direction chargée: {len(direction_data['centres'])} centres, "
        f"{sum(len(c['taches']) for c in direction_data['centres'])} tâches"
    )
    
    return direction_data


def invalidate_referentiel_cache(
    centre_id: Optional[int] = None,
    direction_id: Optional[int] = None,
    poste_id: Optional[int] = None
):
    """
    Invalide le cache des référentiels de manière sélective
    
    Args:
        centre_id: Invalider seulement pour ce centre
        direction_id: Invalider seulement pour cette direction
        poste_id: Invalider seulement pour ce poste
        
    Usage:
        # Invalider tout
        invalidate_referentiel_cache()
        
        # Invalider un centre spécifique
        invalidate_referentiel_cache(centre_id=123)
        
        # Invalider une direction
        invalidate_referentiel_cache(direction_id=5)
    """
    if centre_id:
        pattern = f"ref:*{centre_id}*"
        logger.info(f"🗑️ Invalidation cache centre {centre_id}")
    elif direction_id:
        pattern = f"ref:*{direction_id}*"
        logger.info(f"🗑️ Invalidation cache direction {direction_id}")
    elif poste_id:
        pattern = f"ref:*{poste_id}*"
        logger.info(f"🗑️ Invalidation cache poste {poste_id}")
    else:
        pattern = "ref:*"
        logger.warning("🗑️ Invalidation TOTALE du cache référentiels")
    
    count = invalidate_cache(pattern)
    logger.info(f"✅ {count} entrées de cache invalidées")


# Exemple d'utilisation
if __name__ == "__main__":
    from app.core.database import SessionLocal
    
    db = SessionLocal()
    
    try:
        # Test 1: Charger les tâches d'un centre/poste
        print("Test 1: Chargement tâches...")
        taches = get_referentiel_taches(db, centre_id=1, poste_id=1)
        print(f"  → {len(taches)} tâches chargées")
        
        # Test 2: Recharger (devrait venir du cache)
        print("\nTest 2: Rechargement tâches (cache)...")
        taches2 = get_referentiel_taches(db, centre_id=1, poste_id=1)
        print(f"  → {len(taches2)} tâches chargées (depuis cache)")
        
        # Test 3: Charger une direction complète
        print("\nTest 3: Chargement direction complète...")
        direction = get_direction_complete_data(db, direction_id=1)
        if direction:
            print(f"  → Direction: {direction['label']}")
            print(f"  → {len(direction['centres'])} centres")
        
        # Test 4: Invalidation
        print("\nTest 4: Invalidation cache...")
        invalidate_referentiel_cache(centre_id=1)
        
    finally:
        db.close()
