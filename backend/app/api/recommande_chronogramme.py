from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.services.recommande_chronogramme import (
    get_recommande_chronogramme_taches,
    generate_recommande_csv_taches,
    get_recommande_chronogramme_positions,
)

router = APIRouter(prefix="/recommande-chronogramme", tags=["recommande-chronogramme"])

@router.get("/taches")
def read_recommande_chronogramme_taches(db: Session = Depends(get_db)):
    """
    Retourne les lignes du chronogramme des tâches recommandées.
    """
    try:
        rows = get_recommande_chronogramme_taches(db)
        if not rows:
            return {"rows": [], "message": "Aucune donnée n'a été trouvée..."}
        return {"rows": rows}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erreur DB : {str(exc)}")

@router.get("/export-csv")
def export_recommande_chronogramme_taches_csv(db: Session = Depends(get_db)):
    """
    Retourne l'export CSV du chronogramme tâches recommandé.
    """
    try:
        rows = get_recommande_chronogramme_taches(db)
        if not rows:
            raise HTTPException(status_code=404, detail="Aucune donnée à exporter")
            
        csv_payload = generate_recommande_csv_taches(rows)
        body = BytesIO(csv_payload.encode("utf-8"))
        headers = {
            "Content-Disposition": "attachment; filename=export_taches_recommande.csv"
        }
        return StreamingResponse(body, media_type="text/csv; charset=utf-8", headers=headers)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/positions")
def read_recommande_chronogramme_positions(db: Session = Depends(get_db)):
    """
    Retourne l'agrégation par position pour le chronogramme recommandé.
    """
    try:
        data = get_recommande_chronogramme_positions(db)
        if not data["rows"]:
            return {"rows": [], "total": None, "message": "Aucune donnée n'a été trouvée..."}
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erreur DB : {str(exc)}")

@router.get("/positions/graph")
def read_recommande_chronogramme_graph(db: Session = Depends(get_db)):
    """
    Retourne les données formatées pour le graphe cumulatif de répartition du temps.
    Exclut Chef Service et Unité (comme demandé).
    """
    try:
        data = get_recommande_chronogramme_positions(db)
        rows_all = data["rows"]
        
        # Filtrer pour le graphe (hors Chef Service)
        # L'unité d'affichage est forcée à “Heures”
        graph_data = []
        cumulative_hours = 0.0
        
        for r in rows_all:
            hours = float(r["hours"])
            start_hours = cumulative_hours
            cumulative_hours += hours
            
            graph_data.append({
                "position": r["position"],
                "hours": hours,
                "start": f"{start_hours:.2f}",
                "end": f"{cumulative_hours:.2f}"
            })
            
        # Ajouter le "Total Général" à la fin
        if graph_data:
            total_duration = cumulative_hours
            graph_data.append({
                "position": "Total Général",
                "hours": total_duration,
                "start": "0.00",
                "end": f"{total_duration:.2f}",
                "is_total": True
            })
            
        return {"data": graph_data}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la construction du graphe : {str(exc)}")
