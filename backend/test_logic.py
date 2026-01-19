import sys
import os

# Setup path
sys.path.append(os.path.join(os.path.dirname(__file__))) 

from app.services.simulation_data_driven import calculer_volume_applique, VolumeContext

# Mock Objects
class MockTache:
    def __init__(self, nom, famille, base_calcul=100):
        self.id = 1
        self.nom_tache = nom
        self.famille_uo = famille
        self.base_calcul = base_calcul
        self.type_flux = ""
        self.unite_mesure = ""

class MockVolumeSource:
    pass

# Setup Context
src = MockVolumeSource()
ctx = VolumeContext(src)
# Manually populate
ctx.arrivee_total = 100000
ctx.depart_total = 90000
ctx.arrivee_parts_pro = 60000
ctx.arrivee_axes_only = 15000
ctx.arrivee_parts_pro_axes = 75000 # 60k + 15k
ctx.pct_axes_arrivee = 0.40
ctx.pct_axes_depart = 0.30
ctx.ed_percent = 10.0
ctx.colis_par_sac = 5.0

# Test Cases
test_familles = [
    "ARRIVEE CAMION",
    "DEPART CAMION",
    "TRI DEPART",
    "DISTRIBUTION",
    "GUICHET",
    "AUTRE CHOSE",
    "DEPART CAMION PRINCIPAL", # Test subtil
    "TRI DÉPART"
]

print(f"--- TEST LOGIQUE ---")
for fam in test_familles:
    t = MockTache("Test Tache", fam)
    vol, form = calculer_volume_applique(t, ctx)
    print(f"Famille='{fam}' -> Vol={vol} | Formule='{form}'")

print(f"--- FIN ---")
