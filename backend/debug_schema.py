from app.core.db import SessionLocal
from sqlalchemy import text

try:
    session = SessionLocal()
    query = "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'taches'"
    res = session.execute(text(query)).fetchall()
    
    print("--- SCHEMA INFO ---")
    for row in res:
        print(f"{row[0]}: {row[1]}")
    print("-------------------")
    
except Exception as e:
    print(f"Error: {e}")
