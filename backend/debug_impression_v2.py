import sys
import os
import urllib.parse
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

# Assuming settings logic or hardcoded for debug
DATABASE_URL = "DRIVER={ODBC Driver 17 for SQL Server};SERVER=FRDC052L6\\SQLEXPRESS;DATABASE=SimulateurRH_DB_V2;Trusted_Connection=yes;"
params = urllib.parse.quote_plus(DATABASE_URL)
SQLALCHEMY_DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    poolclass=NullPool,
    echo=False
)

def check_impression_tasks(centre_poste_id):
    print(f"Checking 'impression' tasks for CENTRE_POSTE_ID = {centre_poste_id}")
    with engine.connect() as connection:
        query = text("""
            SELECT id, nom_tache, produit, famille_uo, unite_mesure, base_calcul, etat, moyenne_min
            FROM taches 
            WHERE centre_poste_id = :cpid AND nom_tache LIKE '%impression%'
        """)
        result = connection.execute(query, {"cpid": centre_poste_id})
        
        tasks = result.fetchall()
        print(f"Found {len(tasks)} tasks:")
        for row in tasks:
            print(f" - ID: {row.id}, Nom: '{row.nom_tache}', Prod: '{row.produit}', Unite: '{row.unite_mesure}', Base: {row.base_calcul}, MoyMin: {row.moyenne_min}")

if __name__ == "__main__":
    check_impression_tasks(8367)
