from app.core.db import SessionLocal
from app.api.taches_mgmt import populate_taches_from_template
from fastapi import HTTPException

db = SessionLocal()
try:
    res = populate_taches_from_template(1858, db)
    print("Result:", res)
except Exception as e:
    print("Error:", e)
    import traceback
    traceback.print_exc()
finally:
    db.close()
