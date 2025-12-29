from typing import Dict, Any, List, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import HTTPException
from pydantic import BaseModel
from datetime import datetime

# --- Schemas ---

class SimulationRunInput(BaseModel):
    centre_id: int
    productivite: float = 80.0
    commentaire: Optional[str] = None
    volumes: Dict[str, float] # { "CO": 18000, ... }
    unites: Dict[str, str] = {} # { "CO": "an", ... } (Optional metadata)
    user_id: Optional[int] = None # Launched by

class SimulationRunOutput(BaseModel):
    simulation_id: int
    heures_necessaires: float
    etp_calcule: float
    etp_arrondi: float
    created_at: str

# --- Services ---

def insert_simulation_run(db: Session, centre_id: int, productivite: float, commentaire: str = None, user_id: int = None) -> int:
    """Creates the run header and returns ID. Uses 'launched_at' instead of 'created_at'."""
    
    # Primary strategy: launched_at + OUTPUT simulation_id
    try:
        sql = """
            INSERT INTO dbo.simulation_run (centre_id, launched_by_user_id, productivite, commentaire, launched_at)
            OUTPUT INSERTED.simulation_id
            VALUES (:cid, :uid, :prod, :comm, SYSDATETIME())
        """
        result = db.execute(text(sql), {
            "cid": centre_id,
            "uid": user_id, 
            "prod": productivite,
            "comm": commentaire
        }).fetchone()
        if result: return result[0]
    except Exception as e:
        print(f"⚠️ Primary Insert failed: {e}. Trying fallback...")

    # Fallback strategy: launched_at + OUTPUT id (if PK is 'id')
    try:
        sql = """
            INSERT INTO dbo.simulation_run (centre_id, launched_by_user_id, productivite, commentaire, launched_at)
            OUTPUT INSERTED.id
            VALUES (:cid, :uid, :prod, :comm, SYSDATETIME())
        """
        result = db.execute(text(sql), {
            "cid": centre_id,
            "uid": user_id, 
            "prod": productivite,
            "comm": commentaire
        }).fetchone()
        if result: return result[0]
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Database Insert Error (Both simulation_id and id strategies failed). Checks: {e}")

def bulk_insert_volumes(db: Session, simulation_id: int, volumes: Dict[str, float], units: Dict[str, str]):
    """Bulk inserts volumes using fast_executemany strategy (list of dictionaries)."""
    if not volumes:
        return

    # Prepare list of maps
    data = []
    for key, val in volumes.items():
        unit = units.get(key, "N/A")
        data.append({
            "sim_id": simulation_id,
            "ind": key,
            "val": val,
            "unit": unit
        })

    # FK fallback logic: Try 'simulation_run_id' then 'simulation_id'
    
    # Attempt 1: simulation_run_id
    try:
        sql = """
            INSERT INTO dbo.simulation_run_volume (simulation_run_id, indicateur, valeur, unite)
            VALUES (:sim_id, :ind, :val, :unit)
        """
        db.execute(text(sql), data)
        return
    except Exception:
        pass
        
    # Attempt 2: simulation_id
    try:
        sql = """
            INSERT INTO dbo.simulation_run_volume (simulation_id, indicateur, valeur, unite)
            VALUES (:sim_id, :ind, :val, :unit)
        """
        db.execute(text(sql), data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk Insert Volume Error: {e}")

def upsert_simulation_result(db: Session, simulation_id: int, heures: float, etp_calc: float, etp_arr: float):
    """Upserts the result using MERGE."""
    
    # Attempt 1: simulation_run_id
    try:
        sql = """
            MERGE dbo.simulation_run_result AS target
            USING (SELECT :sim_id AS simulation_run_id) AS source
            ON (target.simulation_run_id = source.simulation_run_id)
            WHEN MATCHED THEN
                UPDATE SET 
                    heures_necessaires = :heures,
                    etp_calcule = :etp_c,
                    etp_arrondi = :etp_a
            WHEN NOT MATCHED THEN
                INSERT (simulation_run_id, heures_necessaires, etp_calcule, etp_arrondi)
                VALUES (:sim_id, :heures, :etp_c, :etp_a);
        """
        db.execute(text(sql), {
            "sim_id": simulation_id,
            "heures": heures,
            "etp_c": etp_calc,
            "etp_a": etp_arr
        })
        return
    except Exception:
        pass

    # Attempt 2: simulation_id
    try:
        sql = """
            MERGE dbo.simulation_run_result AS target
            USING (SELECT :sim_id AS simulation_id) AS source
            ON (target.simulation_id = source.simulation_id)
            WHEN MATCHED THEN
                UPDATE SET 
                    heures_necessaires = :heures,
                    etp_calcule = :etp_c,
                    etp_arrondi = :etp_a
            WHEN NOT MATCHED THEN
                INSERT (simulation_id, heures_necessaires, etp_calcule, etp_arrondi)
                VALUES (:sim_id, :heures, :etp_c, :etp_a);
        """
        db.execute(text(sql), {
            "sim_id": simulation_id,
            "heures": heures,
            "etp_c": etp_calc,
            "etp_a": etp_arr
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Result Merge Error: {e}")

def get_simulation_run(db: Session, simulation_id: int):
    """Fetches full run details."""
    # 1. Header
    try:
        sql_run = "SELECT * FROM dbo.simulation_run WHERE simulation_id = :sim_id"
        row = db.execute(text(sql_run), {"sim_id": simulation_id}).mappings().first()
    except:
        row = None
        
    if not row:
         try:
             sql_run_fallback = "SELECT * FROM dbo.simulation_run WHERE id = :sim_id"
             row = db.execute(text(sql_run_fallback), {"sim_id": simulation_id}).mappings().first()
         except:
             return None
    
    if not row: return None
    
    run_data = dict(row)
    
    # 2. Volumes
    # Try simulation_run_id, then simulation_id column
    try:
        sql_vols = "SELECT indicateur, valeur, unite FROM dbo.simulation_run_volume WHERE simulation_run_id = :sim_id"
        vols = db.execute(text(sql_vols), {"sim_id": simulation_id}).mappings().all()
    except:
        sql_vols = "SELECT indicateur, valeur, unite FROM dbo.simulation_run_volume WHERE simulation_id = :sim_id"
        vols = db.execute(text(sql_vols), {"sim_id": simulation_id}).mappings().all()

    run_data["volumes"] = [dict(v) for v in vols]
    
    # 3. Result
    try:
        sql_res = "SELECT * FROM dbo.simulation_run_result WHERE simulation_run_id = :sim_id"
        res = db.execute(text(sql_res), {"sim_id": simulation_id}).mappings().first()
    except:
        sql_res = "SELECT * FROM dbo.simulation_run_result WHERE simulation_id = :sim_id"
        res = db.execute(text(sql_res), {"sim_id": simulation_id}).mappings().first()

    if res:
        run_data["result"] = dict(res)
        
    return run_data

def get_simulation_history(
    db: Session, 
    centre_id: Optional[int] = None,
    user_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """
    Récupère l'historique des simulations avec filtres optionnels.
    """
    # Construction de la requête avec filtres
    where_clauses = []
    params = {"limit": limit, "offset": offset}
    
    if centre_id:
        where_clauses.append("sr.centre_id = :centre_id")
        params["centre_id"] = centre_id
    
    if user_id:
        where_clauses.append("sr.launched_by_user_id = :user_id")
        params["user_id"] = user_id
    
    where_sql = " AND " + " AND ".join(where_clauses) if where_clauses else ""
    
    sql = f"""
        SELECT 
            sr.simulation_id,
            sr.centre_id,
            c.label as centre_label,
            sr.launched_by_user_id,
            sr.productivite,
            sr.commentaire,
            sr.launched_at,
            res.heures_necessaires,
            res.etp_calcule,
            res.etp_arrondi
        FROM dbo.simulation_run sr
        LEFT JOIN dbo.centres c ON c.id = sr.centre_id
        LEFT JOIN dbo.simulation_run_result res ON res.simulation_id = sr.simulation_id
        WHERE 1=1 {where_sql}
        ORDER BY sr.launched_at DESC
        OFFSET :offset ROWS
        FETCH NEXT :limit ROWS ONLY
    """
    
    rows = db.execute(text(sql), params).mappings().all()
    return [dict(r) for r in rows]

def get_simulation_for_replay(db: Session, simulation_id: int) -> Optional[Dict[str, Any]]:
    """
    Récupère une simulation complète pour la rejouer.
    Retourne les volumes et paramètres nécessaires.
    """
    # 1. Run header
    sql_run = """
        SELECT 
            sr.simulation_id,
            sr.centre_id,
            sr.productivite,
            sr.commentaire,
            sr.launched_at
        FROM dbo.simulation_run sr
        WHERE sr.simulation_id = :sim_id
    """
    
    run = db.execute(text(sql_run), {"sim_id": simulation_id}).mappings().first()
    if not run:
        return None
    
    run_data = dict(run)
    
    # 2. Volumes
    try:
        sql_vols = "SELECT indicateur, valeur, unite FROM dbo.simulation_run_volume WHERE simulation_id = :sim_id"
        vols = db.execute(text(sql_vols), {"sim_id": simulation_id}).mappings().all()
    except:
        sql_vols = "SELECT indicateur, valeur, unite FROM dbo.simulation_run_volume WHERE simulation_run_id = :sim_id"
        vols = db.execute(text(sql_vols), {"sim_id": simulation_id}).mappings().all()
    
    # Convertir en dict {indicateur: valeur}
    volumes_dict = {}
    unites_dict = {}
    for v in vols:
        volumes_dict[v["indicateur"]] = v["valeur"]
        if v["unite"]:
            unites_dict[v["indicateur"]] = v["unite"]
    
    run_data["volumes"] = volumes_dict
    run_data["unites"] = unites_dict
    
    return run_data
