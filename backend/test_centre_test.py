"""
Test pour CENTRE TEST avec les volumes spécifiés
"""
from app.core.db import SessionLocal
from app.models.db_models import Centre, CentrePoste, Region
from app.services.simulation_data_driven import (
    calculer_simulation_data_driven,
    calculer_simulation_centre_data_driven
)
from app.schemas.volumes_ui import VolumesUIInput

# Connexion DB
db = SessionLocal()

# 1. Trouver la région Oujda
print("🔍 Recherche de la région Oujda...")
region = db.query(Region).filter(Region.label.ilike('%oujda%')).first()
if not region:
    print("❌ Région Oujda non trouvée!")
    db.close()
    exit(1)

print(f"✅ Région trouvée: {region.label} (ID: {region.id})")

# 2. Trouver le centre TEST
print(f"\n🔍 Recherche du CENTRE TEST dans la région {region.label}...")
centre = db.query(Centre).filter(
    Centre.label.ilike('%test%'),
    Centre.region_id == region.id
).first()

if not centre:
    print("❌ CENTRE TEST non trouvé!")
    db.close()
    exit(1)

print(f"✅ Centre trouvé: {centre.label} (ID: {centre.id})")

# 3. Trouver les postes de ce centre
print(f"\n🔍 Recherche des postes du centre...")
centre_postes = db.query(CentrePoste).filter(
    CentrePoste.centre_id == centre.id
).all()

if not centre_postes:
    print("❌ Aucun poste trouvé pour ce centre!")
    db.close()
    exit(1)

print(f"✅ {len(centre_postes)} poste(s) trouvé(s):")
for cp in centre_postes:
    print(f"   - {cp.poste.label if cp.poste else 'N/A'} (centre_poste_id: {cp.id})")

# 4. Préparer les volumes
print(f"\n📦 Préparation des volumes:")
print(f"   - AMANA: 50,000 (annuel)")
print(f"   - CO: 60,000 (annuel)")

volumes_ui = VolumesUIInput(
    flux_arrivee={
        "amana": {"GLOBAL": 50000, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
        "co": {"GLOBAL": 60000, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
        "cr": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
        "ebarkia": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
        "lrh": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0}
    },
    flux_depart={
        "amana": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
        "co": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
        "cr": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
        "ebarkia": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
        "lrh": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0}
    },
    guichet={"DEPOT": 0, "RECUP": 0},
    nb_jours_ouvres_an=264
)

# Paramètres
params = {
    "productivite": 100.0,
    "heures_par_jour": 8.0,
    "idle_minutes": 0.0,
    "debug": True
}

print(f"\n{'='*80}")
print(f"TEST 1: SIMULATION INTERVENANT (Premier poste)")
print(f"{'='*80}")

premier_poste = centre_postes[0]
result_intervenant = calculer_simulation_data_driven(
    db=db,
    centre_poste_id=premier_poste.id,
    volumes_ui=volumes_ui,
    **params
)

print(f"\n📊 RÉSULTAT INTERVENANT:")
print(f"   - Total heures: {result_intervenant.total_heures}h")
print(f"   - ETP calculé: {result_intervenant.fte_calcule}")
print(f"   - ETP arrondi: {result_intervenant.fte_arrondi}")
print(f"   - Nombre de tâches: {len(result_intervenant.details_taches)}")

print(f"\n{'='*80}")
print(f"TEST 2: SIMULATION CENTRE (Tous les postes)")
print(f"{'='*80}")

result_centre = calculer_simulation_centre_data_driven(
    db=db,
    centre_id=centre.id,
    volumes_ui=volumes_ui,
    **params
)

print(f"\n📊 RÉSULTAT CENTRE:")
print(f"   - Total heures: {result_centre.total_heures}h")
print(f"   - ETP calculé: {result_centre.fte_calcule}")
print(f"   - ETP arrondi: {result_centre.fte_arrondi}")
print(f"   - Nombre de tâches: {len(result_centre.details_taches)}")

print(f"\n{'='*80}")
print(f"COMPARAISON")
print(f"{'='*80}")

if len(centre_postes) == 1:
    print(f"⚠️  Ce centre n'a qu'UN SEUL poste")
    print(f"   → Les résultats devraient être IDENTIQUES")
    
    if abs(result_intervenant.total_heures - result_centre.total_heures) < 0.01:
        print(f"   ✅ Total heures: IDENTIQUE")
    else:
        print(f"   ❌ Total heures: DIFFÉRENT")
        print(f"      Intervenant: {result_intervenant.total_heures}h")
        print(f"      Centre:      {result_centre.total_heures}h")
        print(f"      Différence:  {result_centre.total_heures - result_intervenant.total_heures:+.2f}h")
    
    if abs(result_intervenant.fte_calcule - result_centre.fte_calcule) < 0.01:
        print(f"   ✅ ETP calculé: IDENTIQUE")
    else:
        print(f"   ❌ ETP calculé: DIFFÉRENT")
        print(f"      Intervenant: {result_intervenant.fte_calcule}")
        print(f"      Centre:      {result_centre.fte_calcule}")
        print(f"      Différence:  {result_centre.fte_calcule - result_intervenant.fte_calcule:+.2f}")
else:
    print(f"ℹ️  Ce centre a {len(centre_postes)} postes")
    print(f"   → Le résultat Centre devrait être la SOMME de tous les postes")
    
    ratio = result_centre.total_heures / result_intervenant.total_heures if result_intervenant.total_heures > 0 else 0
    print(f"   - Ratio heures: {ratio:.2f}x")
    print(f"   - Attendu: ~{len(centre_postes)}x")

db.close()
print(f"\n✅ Test terminé!")
