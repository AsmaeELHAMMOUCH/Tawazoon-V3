
import pandas as pd
import os

base_dir = r"c:\Users\sagourram\Desktop\Tawazoon-V3\backend\app\resources\typologies"
standard_template = r"c:\Users\sagourram\Desktop\Tawazoon-V3\backend\public\template_taches.xlsx"
am_template = r"c:\Users\sagourram\Desktop\Tawazoon-V3\backend\public\template_taches_am.xlsx"

def transform_template(src_path, dst_name):
    print(f"Transforming {src_path} -> {dst_name}")
    df = pd.read_excel(src_path)
    
    # Standard template columns: ['Ordre', 'seq', 'Produit', 'Famille UO', 'Taches', 'Unit Mesure', 'base de calcul', 'Responsable 1', 'Responsable 2', 'min ', 'sec', 'ETAT']
    # AM template columns: ['ordre', 'seq', 'Produit', 'Famille UO', 'taches', 'Unit Mesure', 'base de calcul', 'Responsable 1', 'Responsable 2', 'En min ', 'En sec', 'ETAT']
    
    # Backend expects:
    # 1. nom_tache (col 1)
    # 2. produit (col 2)
    # 3. famille (col 3)
    # 4. phase (col 4)
    # 5. unit (col 5)
    # 6. base (col 6)
    # 7. r1_name (col 7)
    # 8. r2_name (col 8)
    # 9. t_min (col 9)
    # 10. t_sec (col 10)
    
    # Mapping for Standard/AM (they seem similar except for some names)
    col_map = {
        'nom_tache': ['Taches', 'taches'],
        'produit': ['Produit'],
        'famille': ['Famille UO'],
        'unit': ['Unit Mesure', 'Unité de mesure'],
        'base': ['base de calcul'],
        'r1_name': ['Responsable 1'],
        'r2_name': ['Responsable 2'],
        't_min': ['min ', 'En min '],
        't_sec': ['sec', 'En sec']
    }
    
    final_data = []
    for _, row in df.iterrows():
        def get_val(keys):
            for k in keys:
                if k in row: return row[k]
            return None
            
        final_data.append({
            "Nom de tâche": get_val(col_map['nom_tache']),
            "Produit": get_val(col_map['produit']),
            "Famille": get_val(col_map['famille']),
            "Phase": "", # Blank for now
            "Unité de mesure": get_val(col_map['unit']),
            "base de calcul": get_val(col_map['base']),
            "Responsable 1": get_val(col_map['r1_name']),
            "Responsable 2": get_val(col_map['r2_name']),
            "Temps_min": get_val(col_map['t_min']),
            "Temps_sec": get_val(col_map['t_sec'])
        })
    
    out_df = pd.DataFrame(final_data)
    out_df.to_excel(os.path.join(base_dir, dst_name), index=False)

# Create typologies
transform_template(am_template, "AM.xlsx")
transform_template(standard_template, "CM.xlsx")
transform_template(standard_template, "CD.xlsx")
transform_template(standard_template, "CCC.xlsx")
transform_template(standard_template, "CLD.xlsx")
transform_template(standard_template, "CTD.xlsx")
transform_template(standard_template, "Standard.xlsx")

print("Done.")
