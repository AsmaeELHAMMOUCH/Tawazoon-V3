import sys
import os

# Ajout du path pour trouver app
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend')) 

from app.core.db import SessionLocal
from app.models.db_models import Tache
from sqlalchemy import col

db = SessionLocal()
# Recherche floue
terms = ["Contrôle facteurs Avant Départ", "ecriture nbre colis", "contrôle Colis"]

print(f"--- RECHERCHE DES TACHES ---")
for term in terms:
    taches = db.query(Tache).filter(Tache.nom_tache.ilike(f"%{term}%")).all()
    for t in taches:
        print(f"ID: {t.id} | Nom: '{t.nom_tache}' | Famille: '{t.famille_uo}' | CentreID: {t.centre_poste_id}")
print(f"--- FIN ---")
db.close()
