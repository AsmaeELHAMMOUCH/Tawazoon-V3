import sys
import os

# Ensure backend dir is in path
sys.path.append(os.getcwd())

from app.core.db import SessionLocal
from app.models import db_models

session = SessionLocal()
res = session.query(db_models.Tache.produit).distinct().all()
products = [r[0] for r in res if r[0]]
print("PRODUCTS FOUND IN DB:")
for p in products:
    if "NATIONAL" in p.upper() or "NAT" in p.upper() or "INT" in p.upper():
        print(f"- {p}")
