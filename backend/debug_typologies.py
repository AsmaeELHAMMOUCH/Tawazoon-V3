
import os, openpyxl
import sys

# Ad-hoc setup for imports if needed
sys.path.append(os.getcwd())

from app.core.db import SessionLocal
from app.models.db_models import Categorie

db = SessionLocal()
try:
    cats = db.query(Categorie).all()
    print(f"Total categories found: {len(cats)}")
    for cat in cats:
        print(f"\nChecking Cat: '{cat.label}' (ID: {cat.id})")
        typology_label = str(cat.label).upper()
        filename = 'Standard.xlsx'
        
        # Exact logic from bandoeng_router.py
        if "AGENCE MESSAGERIE" in typology_label or typology_label.startswith("AM"): filename = "AM.xlsx"
        elif "CENTRE MESSAGERIE" in typology_label or typology_label.startswith("CM"): filename = "CM.xlsx"
        elif "CENTRE DE DISTRIBUTION" in typology_label or typology_label.startswith("CD"): filename = "CD.xlsx"
        elif "CENTRE COURRIER COLIS" in typology_label or typology_label.startswith("CCC"): filename = "CCC.xlsx"
        elif "CELLULE DE DISTRIBUTION" in typology_label or typology_label.startswith("CLD"): filename = "CLD.xlsx"
        elif "CENTRE DE TRAITEMENT ET DISTRIBUTION" in typology_label or typology_label.startswith("CTD"): filename = "CTD.xlsx"
        
        # Construct path like in get_standard_tasks
        # In the app it is:
        # current_dir = os.path.dirname(os.path.abspath(__file__)) # app/api
        # resources_dir = os.path.join(os.path.dirname(current_dir), "resources", "typologies") # app/resources/typologies
        
        resources_dir = os.path.join("app", "resources", "typologies")
        file_path = os.path.join(resources_dir, filename)
        
        print(f"  Target file: {filename}")
        print(f"  Final path (relative to backend): {file_path}")
        print(f"  Exists: {os.path.exists(file_path)}")
        
        if os.path.exists(file_path):
            try:
                wb = openpyxl.load_workbook(file_path, data_only=True)
                ws = wb.active
                print(f"  Sheet name: {ws.title}")
                print(f"  Max row: {ws.max_row}")
                # Check first task
                if ws.max_row >= 2:
                    first_task = [ws.cell(row=2, column=i).value for i in range(1, 6)]
                    print(f"  First task example: {first_task}")
            except Exception as e:
                print(f"  Error reading workbook: {e}")
finally:
    db.close()
