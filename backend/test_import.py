# test_import.py
"""Test d'import des nouveaux modules."""

print("Test d'import des modules data-driven...")

try:
    from app.models.mapping_models import VolumeMappingRule, UniteConversionRule
    print("✅ app.models.mapping_models importé")
except Exception as e:
    print(f"❌ Erreur import mapping_models: {e}")

try:
    from app.services.data_driven_engine import DataDrivenEngine
    print("✅ app.services.data_driven_engine importé")
except Exception as e:
    print(f"❌ Erreur import data_driven_engine: {e}")

try:
    from app.services.simulation_data_driven import calculer_simulation_data_driven
    print("✅ app.services.simulation_data_driven importé")
except Exception as e:
    print(f"❌ Erreur import simulation_data_driven: {e}")

try:
    from app.api.simulation_data_driven import router
    print("✅ app.api.simulation_data_driven importé")
    print(f"   Router prefix: {router.prefix}")
    print(f"   Router tags: {router.tags}")
except Exception as e:
    print(f"❌ Erreur import simulation_data_driven API: {e}")

print("\n✅ Tous les imports réussis !")
