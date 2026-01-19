import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__))) 

from app.core.db import SessionLocal
from app.models.db_models import Tache

db = SessionLocal()

# Recherche des tâches contenant "levée" ou "levee"
print("=== RECHERCHE TACHES LEVEE ===")
taches = db.query(Tache).filter(
    Tache.nom_tache.ilike("%levee%")
).all()

for t in taches[:10]:  # Limite à 10 résultats
    print(f"ID: {t.id}")
    print(f"  Nom: '{t.nom_tache}'")
    print(f"  Famille: '{t.famille_uo}'")
    print(f"  Centre Poste ID: {t.centre_poste_id}")
    print()

db.close()
print("=== FIN ===")
