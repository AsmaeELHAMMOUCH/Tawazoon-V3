"""
Service pour gérer les volumes de simulation avec la nouvelle architecture Flux/Sens/Segment
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict
from app.schemas.models import VolumeItem

def upsert_volumes_bulk(
    db: Session,
    simulation_id: int,
    centre_poste_id: int,
    volumes: List[VolumeItem]
) -> Dict[str, any]:
    """
    Upsert bulk de volumes dans VolumeSimulation en utilisant MERGE SQL Server.
    
    Args:
        db: Session SQLAlchemy
        simulation_id: ID de la simulation
        centre_poste_id: ID du centre_poste
        volumes: Liste des volumes à insérer/mettre à jour
        
    Returns:
        Dict avec statistiques (inserted, updated, total)
    """
    
    if not volumes:
        return {"inserted": 0, "updated": 0, "total": 0}
    
    # Construire les valeurs pour le MERGE
    values_list = []
    for v in volumes:
        # Ignorer les volumes à 0 pour optimiser
        if v.volume > 0:
            values_list.append(
                f"({simulation_id}, {centre_poste_id}, {v.flux_id}, {v.sens_id}, {v.segment_id}, {v.volume})"
            )
    
    if not values_list:
        return {"inserted": 0, "updated": 0, "total": 0}
    
    values_str = ",\n        ".join(values_list)
    
    # Requête MERGE pour upsert en une seule transaction
    merge_sql = text(f"""
        MERGE INTO dbo.volume_simulation AS target
        USING (
            VALUES
                {values_str}
        ) AS source (simulation_id, centre_poste_id, flux_id, sens_id, segment_id, volume)
        ON target.simulation_id = source.simulation_id
           AND target.centre_poste_id = source.centre_poste_id
           AND target.flux_id = source.flux_id
           AND target.sens_id = source.sens_id
           AND target.segment_id = source.segment_id
        WHEN MATCHED THEN
            UPDATE SET volume = source.volume
        WHEN NOT MATCHED THEN
            INSERT (simulation_id, centre_poste_id, flux_id, sens_id, segment_id, volume)
            VALUES (source.simulation_id, source.centre_poste_id, source.flux_id, source.sens_id, source.segment_id, source.volume)
        OUTPUT $action;
    """)
    
    try:
        result = db.execute(merge_sql)
        db.commit()
        
        # Compter les actions
        actions = [row[0] for row in result.fetchall()]
        inserted = actions.count('INSERT')
        updated = actions.count('UPDATE')
        
        return {
            "inserted": inserted,
            "updated": updated,
            "total": len(values_list)
        }
        
    except Exception as e:
        db.rollback()
        raise Exception(f"Erreur lors de l'upsert des volumes: {str(e)}")


def calculate_heures_necessaires(
    db: Session,
    simulation_id: int,
    centre_poste_id: int = None
) -> Dict[str, any]:
    """
    Calcule les heures nécessaires basées sur VolumeSimulation × taches.
    
    Args:
        db: Session SQLAlchemy
        simulation_id: ID de la simulation
        centre_poste_id: Optionnel, filtrer par centre_poste
        
    Returns:
        Dict avec total_heures, details par flux/sens/segment, warnings
    """
    
    where_clause = "WHERE vs.simulation_id = :simulation_id"
    params = {"simulation_id": simulation_id}
    
    if centre_poste_id:
        where_clause += " AND vs.centre_poste_id = :centre_poste_id"
        params["centre_poste_id"] = centre_poste_id
    
    # Requête principale pour calculer les heures
    sql_heures = text(f"""
        SELECT
            t.centre_poste_id,
            t.flux_id,
            t.sens_id,
            t.segment_id,
            COUNT(t.id) as nb_taches,
            SUM(vs.volume) as volume_total,
            SUM(
                (vs.volume * (COALESCE(t.moyenne_min, 0) + COALESCE(t.min_sec, 0) / 60.0)) / 60.0
            ) AS heures_necessaires
        FROM dbo.volume_simulation vs
        INNER JOIN dbo.taches t
            ON t.centre_poste_id = vs.centre_poste_id
           AND t.flux_id = vs.flux_id
           AND t.sens_id = vs.sens_id
           AND t.segment_id = vs.segment_id
        {where_clause}
          AND t.flux_id IS NOT NULL
          AND t.sens_id IS NOT NULL
          AND t.segment_id IS NOT NULL
        GROUP BY t.centre_poste_id, t.flux_id, t.sens_id, t.segment_id
    """)
    
    result = db.execute(sql_heures, params).mappings().all()
    
    details = []
    total_heures = 0.0
    
    for row in result:
        heures = row['heures_necessaires'] or 0.0
        total_heures += heures
        
        details.append({
            "centre_poste_id": row['centre_poste_id'],
            "flux_id": row['flux_id'],
            "sens_id": row['sens_id'],
            "segment_id": row['segment_id'],
            "nb_taches": row['nb_taches'],
            "volume_total": row['volume_total'],
            "heures_necessaires": round(heures, 2)
        })
    
    # Détecter les volumes sans tâches correspondantes
    sql_orphans = text(f"""
        SELECT
            vs.centre_poste_id,
            vs.flux_id,
            vs.sens_id,
            vs.segment_id,
            vs.volume
        FROM dbo.volume_simulation vs
        LEFT JOIN dbo.taches t
            ON t.centre_poste_id = vs.centre_poste_id
           AND t.flux_id = vs.flux_id
           AND t.sens_id = vs.sens_id
           AND t.segment_id = vs.segment_id
        {where_clause}
          AND vs.volume > 0
        WHERE t.id IS NULL
    """)
    
    orphans = db.execute(sql_orphans, params).mappings().all()
    
    warnings = []
    if orphans:
        for o in orphans:
            warnings.append({
                "type": "volume_sans_taches",
                "centre_poste_id": o['centre_poste_id'],
                "flux_id": o['flux_id'],
                "sens_id": o['sens_id'],
                "segment_id": o['segment_id'],
                "volume": o['volume'],
                "message": f"Volume saisi mais aucune tâche correspondante (F={o['flux_id']}, S={o['sens_id']}, SG={o['segment_id']})"
            })
    
    return {
        "total_heures": round(total_heures, 2),
        "details": details,
        "warnings": warnings
    }


def calculate_etp(
    heures_necessaires: float,
    capacite_nette_h_j: float = 8.0,
    productivite_pct: float = 100.0
) -> Dict[str, float]:
    """
    Calcule l'ETP basé sur les heures nécessaires.
    
    Args:
        heures_necessaires: Total des heures calculées
        capacite_nette_h_j: Heures nettes par jour (défaut 8.0)
        productivite_pct: Productivité en % (défaut 100.0)
        
    Returns:
        Dict avec etp_calcule et etp_arrondi
    """
    
    if capacite_nette_h_j <= 0:
        raise ValueError("capacite_nette_h_j doit être > 0")
    
    if productivite_pct <= 0:
        productivite_pct = 100.0
    
    # Formule: (heures / (productivité/100)) / capacité_nette
    etp_calcule = (heures_necessaires / (productivite_pct / 100.0)) / capacite_nette_h_j
    
    # Règle d'arrondi: si <= 0.1 → 0, sinon ROUND
    if etp_calcule <= 0.1:
        etp_arrondi = 0.0
    else:
        etp_arrondi = round(etp_calcule)
    
    return {
        "etp_calcule": round(etp_calcule, 2),
        "etp_arrondi": etp_arrondi
    }

def import_centre_volumes_ref(db: Session, volumes_data: List[Dict]) -> Dict[str, any]:
    """
    Importe des volumes de référence par Label de Centre dans centre_volumes_ref.
    Matches centre label -> id.
    Upserts result.
    """
    if not volumes_data:
        return {"success": False, "message": "Aucune donnée"}

    # 1. Charger Map {Label -> ID}
    centres = db.execute(text("SELECT id, label FROM dbo.centres")).fetchall()
    
    # Normalize helper (remove accents, lower, trim)
    import unicodedata
    def norm(s):
        if not s: return ""
        s = "".join(c for c in unicodedata.normalize('NFD', str(s).lower()) if unicodedata.category(c) != 'Mn')
        return s.strip()

    label_map = {norm(r.label): r.id for r in centres}
    
    # 2. Prepare UPSERT values
    # SQL Server MERGE for centre_volumes_ref
    
    values_list = []
    ids_found = 0
    ids_missing = 0
    
    for v in volumes_data:
        lbl = v.get("centre_label") or v.get("Nom du Centre")
        cid = v.get("centre_id")
        
        if not cid and lbl:
            cid = label_map.get(norm(lbl))
            
        if not cid:
            ids_missing += 1
            # print(f"⚠️ Centre introuvable pour import volumes: {lbl}")
            continue
            
        ids_found += 1
        
        # Volumes defaults
        sacs = float(v.get("sacs", 0) or v.get("Sacs / an", 0) or 0)
        colis = float(v.get("colis", 0) or v.get("Colis / an", 0) or 0)
        courrier_o = float(v.get("courrier_ordinaire", 0) or v.get("Courrier Ordinaire / an", 0) or 0)
        courrier_r = float(v.get("courrier_recommande", 0) or v.get("Courrier Recommandé / an", 0) or 0)
        ebarkia = float(v.get("ebarkia", 0) or v.get("E-Barkia / an", 0) or 0)
        lrh = float(v.get("lrh", 0) or v.get("LRH / an", 0) or 0)
        amana = float(v.get("amana", 0) or v.get("Amana / an", 0) or 0)
        
        values_list.append(f"({cid}, {sacs}, {colis}, {courrier_o}, {courrier_r}, {ebarkia}, {lrh}, {amana})")

    if not values_list:
        return {"success": False, "message": "Aucun centre correspondant trouvé", "missing": ids_missing}

    values_str = ",\n".join(values_list)
    
    # MERGE SQL
    sql = text(f"""
        MERGE INTO dbo.centre_volumes_ref AS target
        USING (VALUES {values_str}) 
        AS source (cid, sacs, colis, co, cr, eb, lrh, am)
        ON target.centre_id = source.cid
        WHEN MATCHED THEN
            UPDATE SET 
                sacs = source.sacs,
                colis = source.colis,
                courrier_ordinaire = source.co,
                courrier_recommande = source.cr,
                ebarkia = source.eb,
                lrh = source.lrh,
                amana = source.am
        WHEN NOT MATCHED THEN
            INSERT (centre_id, sacs, colis, courrier_ordinaire, courrier_recommande, ebarkia, lrh, amana)
            VALUES (source.cid, source.sacs, source.colis, source.co, source.cr, source.eb, source.lrh, source.am);
    """)
    
    try:
        db.execute(sql)
        db.commit()
        return {
            "success": True, 
            "message": f"Import réussi pour {ids_found} centres.",
            "matched": ids_found,
            "missing": ids_missing
        }
    except Exception as e:
        db.rollback()
        raise Exception(f"SQL Error: {e}")
