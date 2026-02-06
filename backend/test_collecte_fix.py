"""
Script de test pour vérifier le calcul des tâches AMANA Dépôt / Collecte
"""

# Simulation d'une tâche AMANA Dépôt / Collecte
class MockTache:
    def __init__(self):
        self.id = 7387
        self.nom_tache = "Confirmation réception scan (masse) Amana"
        self.produit = "AMANA Dépôt"
        self.famille_uo = "Collecte"
        self.unite_mesure = "colis"
        self.base_calcul = 100
        self.moyenne_minute = 0.5

class MockVolumesUI:
    def __init__(self):
        self.nb_jours_ouvres_an = 264
        self.pct_axes_depart = 10.0  # 10%
        self.pct_collecte = 5.0  # 5%
        self.taux_complexite = 1.2
        self.colis_amana_par_sac = 50.0
        self.volumes_flux = [
            type('obj', (object,), {
                'flux': 'AMANA',
                'sens': 'DEPART',
                'segment': 'PART',
                'volume': 50000
            })(),
            type('obj', (object,), {
                'flux': 'AMANA',
                'sens': 'DEPART',
                'segment': 'PRO',
                'volume': 30000
            })(),
        ]

# Import de la fonction
import sys
sys.path.insert(0, r'c:\Users\Aelhammouch\simulateur-rh-V2\backend')

from app.services.simulation_data_driven import VolumeContext, calculer_volume_applique

# Création du contexte
volumes_ui = MockVolumesUI()
context = VolumeContext(volumes_ui)

# Création de la tâche
tache = MockTache()

print("="*80)
print("TEST: AMANA Dépôt / Collecte")
print("="*80)
print(f"Tâche: {tache.nom_tache}")
print(f"Produit: {tache.produit}")
print(f"Famille: {tache.famille_uo}")
print(f"Base Calcul: {tache.base_calcul}")
print(f"Unité: {tache.unite_mesure}")
print()
print("Volumes:")
print(f"  AMANA DEPART PART: 50000")
print(f"  AMANA DEPART PRO: 30000")
print(f"  TOTAL DEPART: 80000")
print()
print("Paramètres:")
print(f"  % Axes Départ: {volumes_ui.pct_axes_depart}%")
print(f"  % Collecte: {volumes_ui.pct_collecte}%")
print(f"  Taux Complexité: {volumes_ui.taux_complexite}")
print()
print("Formule attendue:")
print(f"  Vol = 80000 x (1 - 0.10) x 0.05 x 1.2")
print(f"  Vol = 80000 x 0.90 x 0.05 x 1.2")
print(f"  Vol = 4320 colis/an")
print(f"  Vol/jour = 4320 / 264 = 16.36 colis/jour")
print()
print("="*80)

try:
    vol_annuel, vol_jour, facteur, ui_path = calculer_volume_applique(tache, context)
    
    print("✅ RÉSULTAT:")
    print(f"  Volume annuel: {vol_annuel:.2f}")
    print(f"  Volume journalier: {vol_jour:.2f}")
    print(f"  Facteur conversion: {facteur:.4f}")
    print(f"  UI Path: {ui_path}")
    print()
    
    if vol_annuel > 0:
        print("✅ SUCCESS: La tâche a été calculée !")
    else:
        print("❌ ERREUR: Volume = 0")
        
except Exception as e:
    print(f"❌ ERREUR: {e}")
    import traceback
    traceback.print_exc()

print("="*80)
