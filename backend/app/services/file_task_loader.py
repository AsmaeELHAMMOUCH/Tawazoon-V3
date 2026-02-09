import pandas as pd
import os
from typing import List, Optional
from app.models.db_models import Tache, CentrePoste, Poste

# Path relative to backend root? 
# We assume files are in backend/public/templates/
TEMPLATE_DIR = os.path.join(os.getcwd(), "public", "templates")

def get_template_path(typology: str) -> str:
    """
    Returns the file path for the given typology.
    Mapping:
    - 'AM' -> template_am.xlsx
    - 'CCC' -> template_ccc.xlsx
    - 'CDT' -> template_cdt.xlsx
    # Add others as needed
    """
    typology = typology.upper().strip()
    filename = f"template_{typology.lower()}.xlsx"
    # Fallback/Safety check?
    path = os.path.join(TEMPLATE_DIR, filename)
    if not os.path.exists(path):
        # Try generic name if specific not found, or error?
        # User said "fichier excel stockés dans le projet par typologie"
        print(f"⚠️ Template file not found: {path}")
        return None
    return path

def load_tasks_from_excel(typology: str) -> List[Tache]:
    """
    Reads the Excel file for the given typology and converts rows into Tache objects.
    Columns expected (based on user request):
    - Nom de tâche
    - Produit
    - Famille
    - Unité de mesure
    - Temps_min
    - Temps_sec
    - Responsable (to link to CentrePoste/Poste)
    - Phase (optional but important for calculation)
    """
    file_path = get_template_path(typology)
    if not file_path:
        return []

    try:
        df = pd.read_excel(file_path)
        # Normalize columns
        df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]
        
        tasks = []
        for index, row in df.iterrows():
            # Map Excel row to Tache object
            # Note: We create Tache objects but they are NOT attached to a DB session yet.
            # They are transient objects for the engine.
            
            # Parsing helpers
            def get_val(col_name, default=""):
                if col_name in df.columns:
                    val = row[col_name]
                    return str(val).strip() if pd.notna(val) else default
                return default
            
            def get_float(col_name, default=0.0):
                if col_name in df.columns:
                    val = row[col_name]
                    try:
                        return float(str(val).replace(',', '.'))
                    except:
                        return default
                return default

            t = Tache()
            t.id = index + 100000 # Fake ID to avoid collision/confusion
            t.nom_tache = get_val("nom_de_tache", get_val("nom_tache", f"Tache {index}"))
            t.produit = get_val("produit")
            t.famille_uo = get_val("famille") 
            t.unite_mesure = get_val("unite_de_mesure", get_val("unite"))
            
            # Temps
            t.moy_sec = get_float("temps_sec", 0.0) + (get_float("temps_min", 0.0) * 60.0)
            t.moyenne_min = t.moy_sec / 60.0
            
            # Phase? If not in excel, might be problem. Engine relies on phase for logic (day_350 etc)
            # User said "apply logic ... using excel columns".
            # If Excel doesn't have phase, we might need default or inferred phase.
            t.phase = get_val("phase", "")
            
            # Responsable / CentrePoste
            # The engine needs `centre_poste_id` or `responsable` string.
            # We can populate `responsable` string in a temporary attribute if engine supports it,
            # OR we mock a CentrePoste object.
            
            resp_name = get_val("responsable")
            # Create a mock CentrePoste and Poste
            # This allows line 384 in bandoeng_engine to work: `if task.centre_poste: code_resp = ...`
            
            p = Poste()
            p.label = resp_name
            p.Code = resp_name[:10].upper() # Fake code
            p.type_poste = "MOD" # Assume MOD for calculation
            
            cp = CentrePoste()
            cp.id = index + 50000
            cp.poste = p
            cp.code_resp = p.Code
            
            t.centre_poste = cp
            t.centre_poste_id = cp.id
            
            # Additional logic columns ?
            t.base_calcul = 100.0 # Default
            
            tasks.append(t)
            
        return tasks

    except Exception as e:
        print(f"❌ Error loading tasks from {file_path}: {e}")
        return []
