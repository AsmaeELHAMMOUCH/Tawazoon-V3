
import pyodbc

conn_str = "DRIVER={ODBC Driver 17 for SQL Server};SERVER=BK-P-06;DATABASE=simulateur;Trusted_Connection=yes;TrustServerCertificate=yes;"

try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    print("Connected to database")
    
    # Check column types for table 'taches'
    print("\n--- Column types for table 'taches' ---")
    cursor.execute("SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'taches'")
    columns = cursor.fetchall()
    for col in columns:
        print(f"Column: {col.COLUMN_NAME}, Type: {col.DATA_TYPE}, Max Length: {col.CHARACTER_MAXIMUM_LENGTH}")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
