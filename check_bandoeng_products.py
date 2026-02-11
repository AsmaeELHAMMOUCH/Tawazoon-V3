
import pyodbc
from app.core.config import settings

def check_products():
    conn_str = f"DRIVER={settings.DB_DRIVER};SERVER={settings.DB_SERVER};DATABASE={settings.DB_NAME};Trusted_Connection=yes;TrustServerCertificate=yes;"
    print(f"Connecting to: {settings.DB_SERVER}/{settings.DB_NAME}")
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        query = """
        SELECT DISTINCT t.produit 
        FROM dbo.taches t
        JOIN dbo.centre_postes cp ON t.centre_poste_id = cp.id
        WHERE cp.centre_id = 1942
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        
        print("\nProducts for Center 1942:")
        for row in rows:
            print(f"- {row[0]}")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_products()
