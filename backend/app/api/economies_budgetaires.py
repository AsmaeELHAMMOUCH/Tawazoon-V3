from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from app.schemas.economies_budgetaires import SimulationInput, ComparisonResponse, GraphResponse, GraphSeries
from app.services.economies_budgetaires_service import EconomiesBudgetairesService
import io
import csv

router = APIRouter(prefix="/api/masse-salariale", tags=["Economies Budgetaires"])
service = EconomiesBudgetairesService()

@router.post("/simuler", response_model=ComparisonResponse)
async def simuler(data: SimulationInput):
    try:
        result = service.calculate_simulation(data.sacs_jour, data.dossiers_mois, data.productivite)
        return ComparisonResponse(
            derived=result["derived"],
            comparaison=result["comparaison"],
            ecarts=result["ecarts"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export-csv")
async def export_csv(sacs_jour: float = 50, dossiers_mois: float = 6500, productivite: float = 100):
    try:
        result = service.calculate_simulation(sacs_jour, dossiers_mois, productivite)
        
        output = io.StringIO()
        writer = csv.writer(output, delimiter=';')
        
        # Section 1: Comparaison
        writer.writerow(["Section 1: Comparaison Masse Salariale"])
        writer.writerow(["Poste", "Actuel", "Calculé", "Recommandé"])
        for row in result["comparaison"]:
            writer.writerow(row)
        
        writer.writerow([])
        
        # Section 2: Ecarts
        writer.writerow(["Section 2: Écarts"])
        writer.writerow(["Calculé Vs Actuel", "Recommandé Vs Actuel", "Recommandé Vs Calculé"])
        for row in result["ecarts"]:
            writer.writerow(row)
            
        csv_content = output.getvalue()
        output.close()
        
        return Response(
            content=csv_content.encode("utf-8"),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=masse_salariale.csv"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/graph-data", response_model=GraphResponse)
async def get_graph_data(data: SimulationInput):
    try:
        result = service.calculate_simulation(data.sacs_jour, data.dossiers_mois, data.productivite)
        totals = result["totals_annuels"]
        
        series = [
            GraphSeries(name="Actuel", value=totals["actuel"], color="#005EA8"),
            GraphSeries(name="Calculé", value=totals["calcule"], color="#3399CC"),
            GraphSeries(name="Recommandé", value=totals["recommande"], color="#A4CFF1")
        ]
        
        return GraphResponse(
            labels=["Année"],
            series=series
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
