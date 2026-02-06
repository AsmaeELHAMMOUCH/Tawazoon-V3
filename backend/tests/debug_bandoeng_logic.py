import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.bandoeng_engine import calculate_task_duration, BandoengInputVolumes, BandoengParameters, BandoengTaskResult
from app.models.db_models import Tache

# Mock Tache
def create_mock_task(id, name, product, unit, phase=''):
    t = Tache()
    t.id = id
    t.nom_tache = name
    t.produit = product
    t.unite_mesure = unit
    t.moy_sec = 60.0 # 1 minute per unit
    t.base_calcul = 100.0
    t.phase = phase
    return t

# Mock Data
volumes = BandoengInputVolumes()
# Fill grid with some dummy data
# Structure: volumes.grid_values['amana']['recu']['gc']['local'] = ...
volumes.grid_values = {
    'amana': {
        'recu': {
            'gc': {'global': 10000, 'local': 5000, 'axes': 5000}, # Total 20k
            'part': {'global': 0, 'local': 0, 'axes': 0}
        },
        'depot': {
            'gc': {'global': 0, 'local': 0, 'axes': 0},
            'part': {'global': 0, 'local': 0, 'axes': 0}
        }
    },
    'co': {
        'arrive': {'local': 26400, 'axes': 26400, 'global': 0}, # Total 52800 -> /264 = 200/day
        'med': {'local': 0, 'axes': 0, 'global': 0}
    },
    'cr': { # CR Arrive Total
         'arrive': {'local': 0, 'axes': 0, 'global': 0},
         'med': {'local': 0, 'axes': 0, 'global': 0}
    }
}

params = BandoengParameters()
params.colis_amana_par_canva_sac = 35.0
params.nbr_co_sac = 350.0

# Test Case 1: Amana Recu Total, Unit=Sac
# Expectation: 
# Total Vol = 20,000
# Daily Vol = 20,000 / 264 = 75.75
# Unit Divisor (Sac Amana) = 35
# Final Vol = 75.75 / 35 = 2.16
# Mins = 2.16 * 1 min = 2.16
t1 = create_mock_task(1, "Tri Amana", "AMANA REÇU TOTAL", "SAC")
res1 = calculate_task_duration(t1, volumes, params)
print(f"Test 1 (Amana Sac): Product={res1.produit} Unit={res1.unite_mesure}")
print(f"  Vol Source Annuel: {res1.volume_annuel}")
print(f"  Vol Journalier (Sacs): {res1.volume_journalier:.4f}")
print(f"  Heures: {res1.heures_calculees:.4f}")
print(f"  Formule: {res1.formule}")
print("-" * 20)

# Test Case 2: CO Arrivé, Unit=Sac
# Vol Source = 52,800 (Local+Axes)
# Daily = 52,800 / 264 = 200
# Unit Divisor (Sac CO) = 350
# Final Vol = 200 / 350 = 0.57
t2 = create_mock_task(2, "Tri CO", "CO ARRIVÉ TOTAL", "SAC")
res2 = calculate_task_duration(t2, volumes, params)
print(f"Test 2 (CO Sac): Product={res2.produit} Unit={res2.unite_mesure}")
print(f"  Vol Source Annuel: {res2.volume_annuel}")
print(f"  Vol Journalier (Sacs): {res2.volume_journalier:.4f}")
print(f"  Heures: {res2.heures_calculees:.4f}")
print(f"  Formule: {res2.formule}")
print("-" * 20)

# Test Case 3: Unit Case Sensitivity 'Sac' vs 'sac'
t3 = create_mock_task(3, "Tri Amana Lower", "AMANA REÇU TOTAL", "sac")
res3 = calculate_task_duration(t3, volumes, params)
print(f"Test 3 (Lower case unit): Divisor check. Vol Journalier: {res3.volume_journalier:.4f}")

