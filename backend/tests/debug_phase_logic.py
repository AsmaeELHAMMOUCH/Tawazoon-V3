import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.bandoeng_engine import calculate_task_duration, BandoengInputVolumes, BandoengParameters, BandoengTaskResult
from app.models.db_models import Tache, CentrePoste, Poste

# Mock Tache
class MockTache:
    def __init__(self, id, name, product, unit, phase=''):
        self.id = id
        self.nom_tache = name
        self.produit = product
        self.unite_mesure = unit
        self.moy_sec = 60.0 # 1 minute base
        self.base_calcul = 100.0
        self.phase = phase
        self.famille_uo = ""
        self.centre_poste_id = 0
        self.centre_poste = None

# Mock Data
volumes = BandoengInputVolumes()
# Dummy volume to get 100 daily vol (Vol Annuel 26400 / 264 = 100)
volumes.grid_values = {
    'amana': {
        'recu': {'gc': {'global': 0, 'local': 26400, 'axes': 0}, 'part': {'global': 0, 'local': 0, 'axes': 0}}
    }
}

def test_phase_logic():
    print("Testing National/International Phase Logic...")
    
    # Base Params
    params = BandoengParameters()
    params.colis_amana_par_canva_sac = 1.0 # Divisor 1 for simplicity
    params.pct_national = 50.0  # 50%
    params.pct_international = 20.0 # 20%
    
    # Case 1: National Phase
    # Logic: If phase contains "national" (and not "international"), multiply by pct_national/100
    t1 = MockTache(1, "Task National", "AMANA REÇU TOTAL", "SAC", "national")
    res1 = calculate_task_duration(t1, volumes, params)
    
    # Expected: 
    # Base Vol Daily = 100
    # Multiplier = 0.5 (50%)
    # Adjusted Vol = 50
    # Hours = (1 min / 60) * 50 = 0.8333
    print(f"\nTest 1 (National): Phase='{t1.phase}'")
    print(f"  Pct National: {params.pct_national}%")
    print(f"  Vol Journalier: {res1.volume_journalier:.4f}")
    print(f"  Heures: {res1.heures_calculees:.4f}")
    print(f"  Formule: {res1.formule}")
    
    if abs(res1.volume_journalier - 50.0) < 0.01:
        print("  ✅ National Multiplier Applied Correctly")
    else:
        print(f"  ❌ National Failed. Expected 50.0, got {res1.volume_journalier}")

    # Case 2: International Phase
    t2 = MockTache(2, "Task International", "AMANA REÇU TOTAL", "SAC", "international")
    res2 = calculate_task_duration(t2, volumes, params)
    
    # Expected: 
    # Multiplier = 0.2 (20%)
    # Adjusted Vol = 20
    print(f"\nTest 2 (International): Phase='{t2.phase}'")
    print(f"  Pct International: {params.pct_international}%")
    print(f"  Vol Journalier: {res2.volume_journalier:.4f}")
    
    if abs(res2.volume_journalier - 20.0) < 0.01:
        print("  ✅ International Multiplier Applied Correctly")
    else:
        print(f"  ❌ International Failed. Expected 20.0, got {res2.volume_journalier}")

    # Case 3: Mixed/Other Phase (Should NOT apply)
    t3 = MockTache(3, "Task Other", "AMANA REÇU TOTAL", "SAC", "standard")
    res3 = calculate_task_duration(t3, volumes, params)
    print(f"\nTest 3 (Standard): Phase='{t3.phase}'")
    print(f"  Vol Journalier: {res3.volume_journalier:.4f}")
    
    if abs(res3.volume_journalier - 100.0) < 0.01:
        print("  ✅ No Multiplier Applied (Correct)")
    else:
         print(f"  ❌ Failed. Expected 100.0, got {res3.volume_journalier}")

if __name__ == "__main__":
    test_phase_logic()
