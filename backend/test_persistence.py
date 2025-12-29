from app.core.db import SessionLocal
from app.services.simulation_run import insert_simulation_run, bulk_insert_volumes, upsert_simulation_result
from sqlalchemy import text

def test_persistence():
    # Disable loud logs
    # db is SessionLocal which uses engine. 
    # Modify engine echo? Hard to do on existing session factory.
    # Just inspect what we can.
    
    db = SessionLocal()
    print("🔌 DB Connected")
    try:
        # Get valid Centre
        c = db.execute(text("SELECT TOP 1 id FROM dbo.centres")).fetchone()
        if not c:
            print("❌ No centres found in DB.")
            return
        valid_cid = c[0]
        print(f"found valid centre_id: {valid_cid}")

        # 1. Insert Run
        print("1. Debugging Table Structure and Insert...")
        
        sim_id = insert_simulation_run(
            db, 
            centre_id=valid_cid, 
            productivite=80.0, 
            commentaire="TEST_SCRIPT_PERSISTENCE"
        )
        print(f"✅ Run Inserted. ID: {sim_id}")

        # 2. Insert Volumes
        print("2. Inserting Volumes...")
        vols = {"CO": 100, "CR": 200}
        units = {"CO": "unit", "CR": "unit"}
        bulk_insert_volumes(db, sim_id, vols, units)
        print("✅ Volumes Inserted.")

        # 3. Upsert Result
        print("3. Upserting Result...")
        upsert_simulation_result(db, sim_id, 100.5, 5.5, 6)
        print("✅ Result Upserted.")

        # 4. Commit
        db.commit()
        print("💾 Committed.")

        # 5. Verify
        row = db.execute(text(f"SELECT * FROM dbo.simulation_run WHERE simulation_id = {sim_id}")).fetchone()
        if row:
            print(f"🔍 Found Row: {row}")
        else:
            # Try with 'id' column if simulation_id failed
            row_id = db.execute(text(f"SELECT * FROM dbo.simulation_run WHERE id = {sim_id}")).fetchone()
            print(f"🔍 Found Row (via id?): {row_id}")
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    test_persistence()
