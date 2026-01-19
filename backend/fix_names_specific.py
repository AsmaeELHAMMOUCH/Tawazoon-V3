
import sys
import os
from collections import defaultdict
from sqlalchemy import or_

sys.path.append(os.getcwd())
from app.core.db import SessionLocal
from app.models.db_models import Tache

def fix_names():
    db = SessionLocal()
    try:
        # Search for problematic duplicated tasks
        targets = ["Comptage Colis%", "Rapprochement%", "ecriture n%"]
        filters = [Tache.nom_tache.ilike(p) for p in targets]
        tasks = db.query(Tache).filter(or_(*filters)).all()
        
        # Group by (Centre, Name) to find duplicates in list
        groups = defaultdict(list)
        for t in tasks:
            groups[(t.centre_poste_id, t.nom_tache)].append(t)
            
        changes = 0
        log = []
        
        for (key, group) in groups.items():
            if len(group) < 2:
                continue
            
            # We found a name appearing multiple times in the same centre
            # We must differentiate them to ensure Frontend displays distinct results
            
            for t in group:
                u = t.unite_mesure or "?"
                p = t.produit or "?"
                
                # Avoid double renaming
                if f"({u}" in t.nom_tache:
                    continue
                
                # Determine Suffix
                # For 'ecriture', we saw CR and CO collisions with same/diff units.
                # Safest is to append Unit and Product if ambiguous.
                
                if "ecriture" in t.nom_tache.lower():
                    # e.g. "ecriture n... (Sac CO MED)"
                    suffix = f" ({u} {p})"
                else:
                    # For Comptage/Rapprochement, Unit is usually sufficient discriminator
                    suffix = f" ({u})"

                old_name = t.nom_tache
                new_name = f"{old_name}{suffix}"
                
                # Update DB object
                t.nom_tache = new_name
                changes += 1
                log.append(f"Renamed ID={t.id}: '{old_name}' -> '{new_name}'")

        if changes > 0:
            db.commit()
            with open("fix_log.txt", "w", encoding="utf-8") as f:
                f.write(f"Fixed {changes} tasks.\n")
                f.write("\n".join(log))
            print(f"SUCCESS: Renamed {changes} tasks.")
        else:
            print("No changes needed (already fixed or no duplicates).")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_names()
