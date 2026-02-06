
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import urllib
import os
import sys

# Adjust path to find app module if needed, though we are running from root usually or backend
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.config import settings

params = urllib.parse.quote_plus(settings.DATABASE_URL)
SQLALCHEMY_DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

print("Checking Categories and Centers...")

# Check Category 10
cat = db.execute(text("SELECT * FROM dbo.categories WHERE id = 10")).fetchone()
print(f"Category 10: {cat}")

# Check Centers with Cat 10
centers = db.execute(text("SELECT id, label, region_id FROM dbo.centres WHERE categorie_id = 10")).fetchall()
print(f"Centers with Category 10: {centers}")

# Check all categories with centers count
summary = db.execute(text("SELECT categorie_id, COUNT(*) as count FROM dbo.centres GROUP BY categorie_id")).fetchall()
print("Centers per Category:")
for row in summary:
    print(f"  Cat {row[0]}: {row[1]} centers")

db.close()
