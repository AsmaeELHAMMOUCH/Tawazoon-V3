from app.core.db import SessionLocal
from app.models.db_models import CentrePoste, Poste, HierarchiePostes
from sqlalchemy import func
import sys

def test_orm_query():
    db = SessionLocal()
    centre_id = 1942
    try:
        # Replicate the query from bandoeng_router.py EXACTLY
        query = (
            db.query(
                Poste.id,
                CentrePoste.id.label("centre_poste_id"),
                Poste.label,
                Poste.type_poste,
                func.coalesce(CentrePoste.effectif_actuel, 0).label("effectif_actuel"),
                CentrePoste.code_resp.label("code"),
                HierarchiePostes.label.label("categorie") 
            )
            .join(CentrePoste, CentrePoste.code_resp == Poste.Code) 
            .outerjoin(HierarchiePostes, Poste.hie_poste == HierarchiePostes.code) 
            .filter(CentrePoste.centre_id == centre_id)
            .order_by(Poste.label)
        )

        rows = query.all()
        
        print(f"Query returned {len(rows)} rows.")
        missing_cat_count = 0
        for r in rows:
            cat = r.categorie
            if not cat:
                cat = "None/Null"
                missing_cat_count += 1
            print(f"Poste: {r.label[:20]:<20} | Code: {r.code:<10} | Categorie: {cat}")
        
        print(f"\nTotal Missing Categories: {missing_cat_count}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_orm_query()
