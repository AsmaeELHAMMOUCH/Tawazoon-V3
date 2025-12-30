
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from io import BytesIO
from openpyxl import Workbook
from openpyxl.drawing.image import Image
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.core.db import get_db
from app.services.simulation_run import get_simulation_history

router = APIRouter(tags=["export"])

@router.get("/export/history/excel")
def export_history_excel(
    centre_id: Optional[int] = None,
    user_id: Optional[int] = None,
    limit: int = 1000, # Limite plus grande pour l'export
    db: Session = Depends(get_db)
):
    # 1. Récupérer les données
    simulations = get_simulation_history(
        db, 
        centre_id=centre_id, 
        user_id=user_id, 
        limit=limit
    )
    
    # 2. Créer le fichier Excel
    wb = Workbook()
    ws = wb.active
    ws.title = "Historique Simulations"
    
    # --- CONFIGURATION DU STYLE ---
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="007BFF", end_color="007BFF", fill_type="solid")
    center_align = Alignment(horizontal="center", vertical="center")
    thin_border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))
    
    # --- EN-TÊTE AVEC LOGOS ---
    # On laisse de l'espace pour les logos (lignes 1 à 4)
    ws.row_dimensions[1].height = 60
    
    # Titre du document au centre
    ws.merge_cells('C1:F1')
    cell_title = ws['C1']
    cell_title.value = "HISTORIQUE DES SIMULATIONS"
    cell_title.font = Font(size=16, bold=True, color="005EA8")
    cell_title.alignment = center_align
    
    # Insertion des Logos
    # NOTE: Les chemins doivent être absolus sur le serveur
    try:
        # Logo Barid (Gauche)
        img_barid = Image(r"c:\Users\Aelhammouch\simulateur-rh-V2\frontend\src\assets\BaridLogo.png")
        img_barid.height = 60
        img_barid.width = 150 # Ajuster selon ratio
        ws.add_image(img_barid, 'A1')
        
        # Logo Almav (Droite)
        img_almav = Image(r"c:\Users\Aelhammouch\simulateur-rh-V2\frontend\src\assets\AlmavLogo.png")
        img_almav.height = 50
        img_almav.width = 120 # Ajuster
        ws.add_image(img_almav, 'G1')
    except Exception as e:
        print(f"⚠️ Impossible de charger les logos: {e}")
        # On continue sans logos si erreur
    
    # --- TABLEAU DE DONNÉES (commence ligne 5) ---
    headers = ["ID", "Centre", "Date", "Productivité", "Heures Calc.", "ETP Calculé", "ETP Arrondi", "Commentaire"]
    start_row = 5
    
    # Écriture des en-têtes
    for col_num, header_title in enumerate(headers, 1):
        cell = ws.cell(row=start_row, column=col_num, value=header_title)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align
        cell.border = thin_border
        
    # Écriture des données
    for i, sim in enumerate(simulations, 1):
        row_num = start_row + i
        
        sim_id = sim.get("simulation_id")
        centre = sim.get("centre_label") or f"ID {sim.get('centre_id')}"
        date_str = sim.get("launched_at").strftime("%d/%m/%Y %H:%M") if sim.get("launched_at") else "-"
        prod = f"{sim.get('productivite')}%"
        heures = sim.get("heures_necessaires")
        etp = sim.get("etp_calcule")
        etp_arr = sim.get("etp_arrondi")
        comm = sim.get("commentaire") or ""
        
        row_data = [sim_id, centre, date_str, prod, heures, etp, etp_arr, comm]
        
        for col_num, val in enumerate(row_data, 1):
            cell = ws.cell(row=row_num, column=col_num, value=val)
            cell.border = thin_border
            cell.alignment = Alignment(vertical="center")
            if col_num in [1, 4, 7]: # Centrer ID, Prod, ETP Arr
                cell.alignment = Alignment(horizontal="center", vertical="center")
    
    # Ajustement largeur colonnes
    col_widths = [10, 30, 20, 15, 15, 15, 15, 50]
    for i, width in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = width
        
    # --- RETOUR DU FICHIER ---
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"Historique_Simulations_{centre_id if centre_id else 'Global'}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
