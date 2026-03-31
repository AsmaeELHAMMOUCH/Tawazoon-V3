from app.core.db import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        print("Checking for 'aps' column in 'centre_postes' table...")
        # MSSQL Specific query to check column existence
        check_query = text("""
            SELECT COUNT(*) 
            FROM sys.columns 
            WHERE Name = 'aps' 
            AND Object_ID = Object_ID('dbo.centre_postes')
        """)
        
        result = conn.execute(check_query).scalar()
        
        if result == 0:
            print("Adding 'aps' column to 'centre_postes'...")
            conn.execute(text("ALTER TABLE dbo.centre_postes ADD aps FLOAT DEFAULT 0.0"))
            conn.execute(text("UPDATE dbo.centre_postes SET aps = 0.0"))
            conn.commit()
            print("Successfully added 'aps' column.")
        else:
            print("'aps' column already exists.")

if __name__ == "__main__":
    migrate()
