import sys
import os
from sqlalchemy import create_engine, text

sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.core.database import engine

def check_impression_tasks(centre_poste_id):
    print(f"Checking 'impression' tasks for CENTRE_POSTE_ID = {centre_poste_id}")
    with engine.connect() as connection:
        query = text("""
            SELECT id, nom_tache, produit, famille_uo, unite_mesure, base_calcul, etat 
            FROM taches 
            WHERE centre_poste_id = :cpid AND nom_tache LIKE '%impression%'
        """)
        result = connection.execute(query, {"cpid": centre_poste_id})
        
        tasks = result.fetchall()
        print(f"Found {len(tasks)} tasks:")
        for row in tasks:
            print(f" - ID: {row.id}, Nom: '{row.nom_tache}', Prod: '{row.produit}', Famille: '{row.famille_uo}', Unite: '{row.unite_mesure}', Base: {row.base_calcul}")

if __name__ == "__main__":
    check_impression_tasks(8367)
