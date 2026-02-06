from sqlalchemy import create_engine, text, func
from sqlalchemy.orm import sessionmaker
import sys
import os
import urllib.parse

# Adjust path and setup DB
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))
from app.core.config import settings
from app.models.db_models import Tache, CentrePoste

params = urllib.parse.quote_plus(settings.DATABASE_URL)
DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def debug_import_simulation():
    db = SessionLocal()
    try:
        # Inputs from User Screenshot
        nom_tache_input = "Chant et Pointage"
        produit_input = "CR Arrivé" 
        famille_input = "Arrivée Camion Principal"
        unite_input = "Courrier"
        centre_id = 1942

        print(f"--- DEBUGGING IMPORT MATCHING ---")
        print(f"Inputs: Nom='{nom_tache_input}', Produit='{produit_input}', Famille='{famille_input}', Unite='{unite_input}'")

        # 1. Base Query
        q = (
            db.query(Tache)
            .join(CentrePoste, Tache.centre_poste_id == CentrePoste.id)
            .filter(CentrePoste.centre_id == centre_id)
        )
        count_base = q.count()
        print(f"Base count (Centre {centre_id}): {count_base}")

        # 2. Filter Name
        q_name = q.filter(func.lower(func.trim(Tache.nom_tache)) == nom_tache_input.lower().strip())
        count_name = q_name.count()
        print(f"After Name filter ('{nom_tache_input}'): {count_name}")
        
        if count_name == 0:
            print("❌ FAILED at Name. Trying partial:")
            partial = q.filter(Tache.nom_tache.ilike(f"%{nom_tache_input[:5]}%")).all()
            for p in partial[:3]: print(f"  - Candidate: '{p.nom_tache}'")

        # 3. Filter Famille
        q_famille = q_name.filter(func.lower(func.trim(Tache.famille_uo)) == famille_input.lower().strip())
        count_famille = q_famille.count()
        print(f"After Famille filter ('{famille_input}'): {count_famille}")

        if count_name > 0 and count_famille == 0:
            print("❌ FAILED at Famille. Candidates had:")
            for t in q_name.all():
                print(f"  - ID {t.id} Famille: '{t.famille_uo}' (Hex: {t.famille_uo.encode('utf-8').hex() if t.famille_uo else 'None'})")

        # 4. Filter Unite
        q_unite = q_famille.filter(func.lower(func.trim(Tache.unite_mesure)) == unite_input.lower().strip())
        count_unite = q_unite.count()
        print(f"After Unite filter ('{unite_input}'): {count_unite}")

        if count_famille > 0 and count_unite == 0:
            print("❌ FAILED at Unite. Candidates had:")
            for t in q_famille.all():
                print(f"  - ID {t.id} Unite: '{t.unite_mesure}'")

        # 5. Filter Produit (LIKE)
        q_produit = q_unite.filter(func.lower(Tache.produit).like(f"%{produit_input.lower()}%"))
        count_produit = q_produit.count()
        print(f"After Produit filter (LIKE '%{produit_input}%'): {count_produit}")

        if count_unite > 0 and count_produit == 0:
             print("❌ FAILED at Produit. Candidates had:")
             for t in q_unite.all():
                 print(f"  - ID {t.id} Produit: '{t.produit}'")

    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_import_simulation()
