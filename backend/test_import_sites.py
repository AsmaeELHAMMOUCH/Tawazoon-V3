import pandas as pd
import io
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.db_models import Centre, AttachedSite, Base
from app.core.db import engine
import re

def norm(s):
    if not s: return ""
    return re.sub(r'\s+', '', str(s)).lower()

def test_import():
    # Create a mock Excel file
    data = [
        {"Centre": "AGENCE MESSAGERIE TETOUAN", "Nom Site": "Site Test 1"},
        {"Centre": "CASABLANCA PRINCIPAL", "Nom Site": "Site Test 2"}
    ]
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
    contents = output.getvalue()
    
    # Try to process like in the API
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        df_read = pd.read_excel(io.BytesIO(contents))
        print("Excel read success")
        
        all_centres = {norm(c.label): c.id for c in db.query(Centre).all()}
        print(f"Loaded {len(all_centres)} centres")
        
        for index, row in df_read.iterrows():
            centre_name = str(row["Centre"]).strip()
            site_label = str(row["Nom Site"]).strip()
            print(f"Processing Row {index}: {centre_name} -> {site_label}")
            
            centre_id = all_centres.get(norm(centre_name))
            if not centre_id:
                print(f"  Error: Centre {centre_name} not found")
                continue
                
            base_code = f"S{centre_id}_{norm(site_label)[:8].upper()}"
            code = base_code
            print(f"  Generated code: {code}")
            
            existing = db.query(AttachedSite).filter(
                AttachedSite.centre_id == centre_id,
                AttachedSite.label == site_label
            ).first()
            if existing:
                print("  Existing site found")
            else:
                print("  Creating new site")
                # We won't actually add to DB to keep it clean, just testing logic
        
        print("Test finished successfully")
        
    except Exception as e:
        import traceback
        print(f"FAILURE: {e}")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_import()
