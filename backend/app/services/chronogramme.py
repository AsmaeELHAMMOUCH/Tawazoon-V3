from sqlalchemy.orm import Session
from sqlalchemy import text
import csv
from io import StringIO
import math

task_columns = [
    "Tache",
    "Responsable",
    "DureeMin",
    "DureeSec",
    "CumMin",
    "CumSec",
    "CumMS",
    "CumHeure",
]


def get_chronogramme_taches(db: Session):
    """
    Recupere la liste des taches (hors Chef Service) et calcule le cumulatif.
    """
    query = text("""
        SELECT
          t.nom_tache,
          m.nom_metier,
          t.minutes_tache,
          t.secondes_tache
        FROM tache t
        JOIN metier m ON t.id_metier = m.id_metier
        WHERE m.nom_metier <> 'Chef Service'
        ORDER BY t.id_tache ASC
    """)
    results = db.execute(query).fetchall()

    rows = []
    cumulative_seconds_total = 0

    for r in results:
        task_name = r[0] or ""
        responsable = r[1] or ""
        raw_min = r[2] if r[2] is not None else 0
        raw_sec = r[3] if r[3] is not None else 0

        total_seconds_task = raw_min * 60 + raw_sec
        norm_min = int(total_seconds_task // 60)
        norm_sec = int(total_seconds_task % 60)

        cumulative_seconds_total += total_seconds_task

        cum_min = int(cumulative_seconds_total // 60)
        cum_sec = int(cumulative_seconds_total % 60)

        cum_hours = cumulative_seconds_total / 3600.0

        rows.append({
            "tache": task_name,
            "responsable": responsable,
            "duree_min": f"{norm_min}",
            "duree_sec": f"{norm_sec}",
            "cum_min": f"{cum_min}",
            "cum_sec": f"{cum_sec}",
            "cum_ms": f"{cum_min}:{cum_sec:02d}",
            "cum_heure": f"{cum_hours:.2f}",
        })

    return rows


def generate_csv_taches(rows):
    """
    Genere un CSV (separateur ;) avec BOM UTF-8 pour Excel.
    """
    output = StringIO()
    output.write("\ufeff")
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

    writer.writerow([
        "Tache",
        "Responsable",
        "Duree(Min)",
        "Duree(Sec)",
        "Temps Cumule(Min)",
        "Temps Cumule(Sec)",
        "Temps Cumule(m:s)",
        "Temps Cumule(Heure)",
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


def get_chronogramme_positions(db: Session):
    """
    Aggregation par position pour l'ecran B et le graphe.
    """
    query = text("""
        SELECT
          m.nom_metier,
          SUM(t.minutes_tache) AS total_minutes,
          SUM(t.secondes_tache) AS total_seconds,
          MIN(t.id_tache) as first_task
        FROM tache t
        JOIN metier m ON t.id_metier = m.id_metier
        GROUP BY m.nom_metier
        ORDER BY first_task ASC
    """)
    results = db.execute(query).fetchall()

    rows = []
    grand_total_seconds = 0.0

    for r in results:
        position = r[0] or ""
        sum_min = r[1] if r[1] is not None else 0
        sum_sec = r[2] if r[2] is not None else 0

        total_seconds_pos = sum_min * 60 + sum_sec

        if position.lower() == "chef service":
            val_seconds = 0.0
        else:
            val_seconds = float(total_seconds_pos)
            grand_total_seconds += val_seconds

        minutes_value = val_seconds / 60.0
        hours_value = val_seconds / 3600.0

        rows.append({
            "position": position,
            "seconds": round(val_seconds, 2),
            "minutes": round(minutes_value, 2),
            "hours": round(hours_value, 4), # Higher precision for graph
            "hours_display": f"{hours_value:.2f}"
        })

    total_minutes = grand_total_seconds / 60.0
    total_hours = grand_total_seconds / 3600.0

    total_row = {
        "position": "Total Général",
        "seconds": round(grand_total_seconds, 2),
        "minutes": round(total_minutes, 2),
        "hours": round(total_hours, 2),
    }

    return {"rows": rows, "total": total_row}
