"""
Script pour vérifier le centre ID 1913
"""
import sys
sys.path.insert(0, '.')

from app.core.db import SessionLocal
from app.models.db_models import Centre, CentrePoste, Tache

db = SessionLocal()

centre_id = 1913

print(f"🔍 Vérification du centre ID: {centre_id}")
print(f"{'='*80}\n")

# 1. Vérifier le centre
centre = db.query(Centre).filter(Centre.id == centre_id).first()
if not centre:
    print(f"❌ Centre {centre_id} non trouvé!")
    db.close()
    exit(1)

print(f"✅ Centre trouvé: {centre.label}")
print(f"   Région ID: {centre.region_id}")

# 2. Vérifier les postes
centre_postes = db.query(CentrePoste).filter(
    CentrePoste.centre_id == centre_id
).all()

print(f"\n📊 Postes du centre:")
print(f"   Nombre de postes: {len(centre_postes)}")

if not centre_postes:
    print(f"   ❌ Aucun poste trouvé!")
    db.close()
    exit(1)

for cp in centre_postes:
    print(f"   - Poste: {cp.poste.label if cp.poste else 'N/A'} (centre_poste_id: {cp.id})")

# 3. Vérifier les tâches
centre_poste_ids = [cp.id for cp in centre_postes]
taches = db.query(Tache).filter(
    Tache.centre_poste_id.in_(centre_poste_ids)
).all()

print(f"\n📋 Tâches du centre:")
print(f"   Nombre de tâches: {len(taches)}")

if not taches:
    print(f"   ❌ Aucune tâche trouvée!")
else:
    print(f"   ✅ {len(taches)} tâches trouvées")
    print(f"\n   Exemples de tâches:")
    for i, tache in enumerate(taches[:5]):
        print(f"   {i+1}. {tache.nom_tache[:50]} (ID: {tache.id}, CP: {tache.centre_poste_id})")

db.close()
print(f"\n✅ Vérification terminée!")
