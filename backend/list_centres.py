import sys
from sqlalchemy import create_engine, text
from app.core.db import engine

def list_centres():
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT id, nom FROM dbo.centre_poste WHERE nom LIKE '%TEST%'")).mappings().all()
        for r in rows:
            print(f"ID: {r['id']} - Name: {r['nom']}")

if __name__ == "__main__":
    try:
        list_centres()
    except Exception as e:
        print(f"Error: {e}")
