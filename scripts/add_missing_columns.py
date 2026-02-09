
import urllib.parse
from sqlalchemy import create_engine, text

# Hardcoded DB credentials to avoid importing app dependencies and potential circular/path errors
DB_DRIVER = "ODBC Driver 17 for SQL Server"
DB_SERVER = "BK-P-06"
DB_NAME = "simulateur"
DB_USER = "sa"
DB_PASSWORD = "Dev@2000"

DATABASE_URL = (
    f"DRIVER={DB_DRIVER};"
    f"SERVER={DB_SERVER};"
    f"DATABASE={DB_NAME};"
    f"UID={DB_USER};"
    f"PWD={DB_PASSWORD};"
    f"TrustServerCertificate=yes;"
)

params = urllib.parse.quote_plus(DATABASE_URL)
SQLALCHEMY_DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"

engine = create_engine(SQLALCHEMY_DATABASE_URL, echo=True)

def add_columns():
    with engine.connect() as conn:
        print("Checking for missing columns in dbo.taches...")
        
        columns_to_add = [
            ("famille_uo", "NVARCHAR(255) NULL"),
            ("etat", "NVARCHAR(50) NULL"), 
            ("ordre", "INT NULL"),
            ("base_calcul", "NVARCHAR(50) NULL"),
            ("produit", "NVARCHAR(255) NULL")
        ]
        
        for col_name, col_type in columns_to_add:
            print(f"Checking column '{col_name}'...")
            try:
                # SQL Server check for column existence
                check_sql = text(f"SELECT COL_LENGTH('dbo.taches', '{col_name}')")
                result = conn.execute(check_sql).scalar()
                
                if result is None:
                    print(f"Adding '{col_name}'...")
                    conn.execute(text(f"ALTER TABLE dbo.taches ADD {col_name} {col_type};"))
                    print(f"Added '{col_name}'.")
                else:
                    print(f"'{col_name}' already exists.")
                    
            except Exception as e:
                print(f"Error processing '{col_name}': {e}")

        conn.commit()

if __name__ == "__main__":
    add_columns()
