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
ctx.arrivee_total = 100000
ctx.depart_total = 90000
ctx.arrivee_parts_pro = 60000
ctx.arrivee_axes_only = 15000
ctx.arrivee_parts_pro_axes = 75000 
ctx.pct_axes_arrivee = 0.40
ctx.pct_axes_depart = 0.30
ctx.ed_percent = 10.0
ctx.colis_par_sac = 5.0

test_familles = [
    "ARRIVEE CAMION",
    "DEPART CAMION",
    "TRI DEPART",
    "DISTRIBUTION",
    "GUICHET",
    "AUTRE CHOSE",
    "DEPART CAMION PRINCIPAL",
    "TRI DÉPART"
]

with open("backend/test_output.txt", "w", encoding="utf-8") as f:
    for fam in test_familles:
        t = MockTache("Test Tache", fam)
        vol, form = calculer_volume_applique(t, ctx)
        f.write(f"Famille='{fam}' -> Vol={vol} | Formule='{form}'\n")

print("Done writing to backend/test_output.txt")
