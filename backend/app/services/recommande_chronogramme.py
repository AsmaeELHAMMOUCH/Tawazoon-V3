from sqlalchemy.orm import Session
from sqlalchemy import text
import csv
from io import StringIO
import math

# Colonnes pour l'écran principal
task_columns = [
    "Tache",
    "Responsable",
    "Durée (Min)",
    "Durée (Sec)",
    "Temps Cumulé (Min)",
    "Temps Cumulé (Sec)",
    "Temps Cumulé Minutes",
    "Temps Cumulé (Heure)",
]

def get_recommande_chronogramme_taches(db: Session):
    """
    Récupère la liste des tâches recommandées (hors Chef Service) et calcule le cumulatif.
    Requête SQL exacte fournie dans les spécifications.
    """
    query = text("""
        SELECT
            t.nom_tache_rec,
            m.nom_metier_recomande,
            t.minutes_tache_rec,
            t.secondes_tache_rec
        FROM
            tache_rec t
        JOIN
            METIER_recommande m ON t.id_metier_rec = m.id_metier_recommandee
        WHERE
            m.nom_metier_recomande <> 'Chef Service'
        ORDER BY
            t.id_tache_rec ASC
    """)
    results = db.execute(query).fetchall()

    rows = []
    cumulative_seconds_total = 0

    for r in results:
        task_name = r[0] or ""
        responsable = r[1] or ""
        raw_min = float(r[2]) if r[2] is not None else 0.0
        raw_sec = float(r[3]) if r[3] is not None else 0.0

        total_seconds_task = raw_min * 60 + raw_sec
        
        # Normalisation individuelle
        norm_min = int(total_seconds_task // 60)
        norm_sec = int(total_seconds_task % 60)

        # Cumul global
        cumulative_seconds_total += total_seconds_task
        
        cum_min = int(cumulative_seconds_total // 60)
        cum_sec = int(cumulative_seconds_total % 60)
        
        cum_minutes_total = cumulative_seconds_total / 60.0
        cum_hours_total = cum_minutes_total / 60.0

        rows.append({
            "tache": task_name,
            "responsable": responsable,
            "duree_min": norm_min,
            "duree_sec": norm_sec,
            "cum_min": cum_min,
            "cum_sec": cum_sec,
            "cum_ms": f"{cum_min}:{cum_sec:02d}",
            "cum_heure": f"{cum_hours_total:.2f}",
        })

    return rows

def generate_recommande_csv_taches(rows):
    """
    Génère un CSV (séparateur ;) avec BOM UTF-8 pour Excel.
    """
    output = StringIO()
    output.write("\ufeff")
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

    writer.writerow([
        "Tache",
        "Responsable",
        "Durée (Min)",
        "Durée (Sec)",
        "Temps Cumulé (Min)",
        "Temps Cumulé (Sec)",
        "Temps Cumulé (m:s)",
        "Temps Cumulé (Heure)",
    ])

    for r in rows:
        writer.writerow([
            r["tache"],
            r["responsable"],
            r["duree_min"],
            r["duree_sec"],
            r["cum_min"],
            r["cum_sec"],
            r["cum_ms"],
            r["cum_heure"],
        ])

    return output.getvalue()

def get_recommande_chronogramme_positions(db: Session):
    """
    Agrégation par position pour l'écran secondaire et le graphe.
    Applique les exclusions : Automatisation, Compta.
    Gère le cas spécial "Chef Service".
    """
    query = text("""
        SELECT
            m.nom_metier_recomande,
            SUM(t.minutes_tache_rec) AS total_minutes,
            SUM(t.secondes_tache_rec) AS total_seconds,
            MIN(t.id_tache_rec) as first_task
        FROM
            tache_rec t
        JOIN
            METIER_recommande m ON t.id_metier_rec = m.id_metier_recommandee
        GROUP BY
            m.nom_metier_recomande
        ORDER BY
            first_task ASC
    """)
    results = db.execute(query).fetchall()

    rows = []
    total_seconds_overall = 0.0
    
    # Liste d'exclusions
    exclusions = ["automatisation", "compta"]

    for r in results:
        position = r[0] or ""
        pos_lower = position.lower()
        
        # Exclusion totale de Automatisation et Compta
        if any(exc in pos_lower for exc in exclusions):
            continue
            
        total_minutes_raw = float(r[1]) if r[1] is not None else 0.0
        total_seconds_raw = float(r[2]) if r[2] is not None else 0.0
        
        current_pos_seconds = total_minutes_raw * 60 + total_seconds_raw
        
        # Calcul pour l'affichage de la ligne
        min_calc = current_pos_seconds / 60.0
        hours_calc = current_pos_seconds / 3600.0
        
        # Cas spécial Chef Service : affiché mais ne contribue pas au total général
        is_chef_service = "chef service" in pos_lower
        
        rows.append({
            "position": position,
            "seconds": round(current_pos_seconds, 2),
            "minutes": round(min_calc, 2),
            "hours": round(hours_calc, 4), # Higher precision for graph
            "hours_display": f"{hours_calc:.2f}",
            "exclude_from_total": is_chef_service
        })

        if not is_chef_service:
            total_seconds_overall += current_pos_seconds

    total_minutes_overall = total_seconds_overall / 60.0
    total_hours_overall = total_seconds_overall / 3600.0

    total_row = {
        "position": "Total Général",
        "seconds": round(total_seconds_overall, 2),
        "minutes": round(total_minutes_overall, 2),
        "hours": round(total_hours_overall, 2),
    }

    return {"rows": rows, "total": total_row}
