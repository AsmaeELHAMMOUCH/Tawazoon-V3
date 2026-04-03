from fastapi import APIRouter, HTTPException, Response
from app.services.comparatif_positions_service import ComparatifPositionsService
from app.schemas.comparatif_positions import ComparatifResponse

router = APIRouter(prefix="/api/comparatif-positions", tags=["comparatif-positions"])
service = ComparatifPositionsService()

@router.get("/simuler", response_model=ComparatifResponse)
async def simuler():
    try:
        return service.run_simulation()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export")
async def export():
    try:
        excel_data = service.export_excel()
        return Response(
            content=excel_data,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=comparatif_positions.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
