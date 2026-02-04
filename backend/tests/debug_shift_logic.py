import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.bandoeng_engine import calculate_task_duration, BandoengInputVolumes, BandoengParameters
from app.models.db_models import Tache, CentrePoste, Poste

# Mock Classes for Testing
class MockPoste:
    def __init__(self, label):
        self.label = label

class MockCentrePoste:
    def __init__(self, label):
        self.poste = MockPoste(label)

class MockTache:
    def __init__(self, id, name, product, unit, responsable_label):
        self.id = id
        self.nom_tache = name
        self.produit = product
        self.unite_mesure = unit
        self.moy_sec = 60.0 
        self.base_calcul = 100.0
        self.phase = ""
        self.famille_uo = "Test Famille"
        self.centre_poste = MockCentrePoste(responsable_label)
        self.centre_poste_id = 999

# Test Setup
volumes = BandoengInputVolumes()
# Dummy volume data to ensure calculation > 0
volumes.grid_values = {
    'amana': {
        'recu': {'gc': {'global': 26400, 'local': 0, 'axes': 0}, 'part': {'global': 0, 'local': 0, 'axes': 0}}
    }
}
# Vol Annuel = 26400 -> Daily = 100

def test_shift_logic():
    print("Testing Shift Logic...")
    
    test_roles = [
        ("Manutentionnaire", True),
        ("Agent op", True),
        ("Responsable des op", True),
        ("Controleur", True), # Starts with Contr
        ("Trieur", False),
        ("Chef Eq", False)
    ]
    
    for role, should_multiply in test_roles:
        print(f"\nTesting Role: {role}")
        task = MockTache(1, f"Task {role}", "AMANA REÇU TOTAL", "DEPECHE", role) 
        # DEPECHE unit uses simplified formula: moy_sec/60 * base_calcul (1 * 1 = 1 hour base if no other factors? No wait.)
        # Logic for DEPECHE: ((moy_sec / 60.0) * (base_calcul / 100.0)) / 60.0 -> (1 * 1) / 60 = 0.01666 hours per unit? 
        # Wait, DEPECHE ignores volume in the code?
        # if "DEPECHE" ... heures_tache = ((moy_sec / 60.0) * (base_calcul / 100.0)) / 60.0 
        # This returns a constant small value. Good for testing multiplier.
        
        # Base (Shift 1)
        params_1 = BandoengParameters(shift=1)
        res_1 = calculate_task_duration(task, volumes, params_1)
        base_hours = res_1.heures_calculees
        print(f"  Shift 1 Hours: {base_hours:.6f}")
        
        # Shift 2
        params_2 = BandoengParameters(shift=2)
        res_2 = calculate_task_duration(task, volumes, params_2)
        print(f"  Shift 2 Hours: {res_2.heures_calculees:.6f}")
        
        # Shift 3
        params_3 = BandoengParameters(shift=3)
        res_3 = calculate_task_duration(task, volumes, params_3)
        print(f"  Shift 3 Hours: {res_3.heures_calculees:.6f}")
        
        if should_multiply:
            if abs(res_2.heures_calculees - (base_hours * 2)) < 0.0001:
                print("  ✅ Shift 2 Applied Correctly")
            else:
                print(f"  ❌ Shift 2 FAILED. Expected {base_hours * 2}, got {res_2.heures_calculees}")
                
            if abs(res_3.heures_calculees - (base_hours * 3)) < 0.0001:
                print("  ✅ Shift 3 Applied Correctly")
            else:
                print(f"  ❌ Shift 3 FAILED. Expected {base_hours * 3}, got {res_3.heures_calculees}")
                
            if "Shift(" in res_2.formule:
                print("  ✅ Formula string updated")
            else:
                print(f"  ❌ Formula string MISSING Shift info: {res_2.formule}")
        else:
            if abs(res_2.heures_calculees - base_hours) < 0.0001:
                print("  ✅ Shift 2 NOT Applied (Correct)")
            else:
                print(f"  ❌ Shift 2 WRONGLY Applied. Expected {base_hours}, got {res_2.heures_calculees}")

if __name__ == "__main__":
    test_shift_logic()
