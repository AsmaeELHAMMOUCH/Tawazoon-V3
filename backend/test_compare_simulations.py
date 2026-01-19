"""
Script de test pour comparer les résultats entre Vue Intervenant et Vue Centre.

Ce script teste si les deux endpoints donnent les mêmes résultats avec les mêmes paramètres.
"""

import requests
import json

API_BASE = "http://localhost:8000/api"

# Volumes de test (identiques pour les deux)
volumes_ui = {
    "flux_arrivee": {
        "amana": {"GLOBAL": 1000, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
        "co": {"GLOBAL": 2000, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
        "cr": {"GLOBAL": 500, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
        "ebarkia": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
        "lrh": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0}
    },
    "flux_depart": {
        "amana": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
        "co": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
        "cr": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
        "ebarkia": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
        "lrh": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0}
    },
    "guichet": {
        "DEPOT": 0,
        "RECUP": 0
    },
    "nb_jours_ouvres_an": 264
}

# Paramètres identiques
params = {
    "productivite": 100.0,
    "heures_par_jour": 8.0,
    "idle_minutes": 0.0,
    "debug": True
}

def test_intervenant(centre_poste_id):
    """Test la simulation pour un intervenant (un seul poste)."""
    url = f"{API_BASE}/simulation-dd/intervenant/{centre_poste_id}"
    
    print(f"\n{'='*80}")
    print(f"TEST INTERVENANT - Centre/Poste ID: {centre_poste_id}")
    print(f"{'='*80}")
    
    response = requests.post(url, json=volumes_ui, params=params)
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ Succès!")
        print(f"   - Total heures: {result['total_heures']}h")
        print(f"   - ETP calculé: {result['fte_calcule']}")
        print(f"   - ETP arrondi: {result['fte_arrondi']}")
        print(f"   - Nombre de tâches: {len(result['details_taches'])}")
        return result
    else:
        print(f"\n❌ Erreur {response.status_code}: {response.text}")
        return None

def test_centre(centre_id):
    """Test la simulation pour un centre complet (tous les postes)."""
    url = f"{API_BASE}/simulation-dd/centre/{centre_id}"
    
    print(f"\n{'='*80}")
    print(f"TEST CENTRE - Centre ID: {centre_id}")
    print(f"{'='*80}")
    
    response = requests.post(url, json=volumes_ui, params=params)
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ Succès!")
        print(f"   - Total heures: {result['total_heures']}h")
        print(f"   - ETP calculé: {result['fte_calcule']}")
        print(f"   - ETP arrondi: {result['fte_arrondi']}")
        print(f"   - Nombre de tâches: {len(result['details_taches'])}")
        return result
    else:
        print(f"\n❌ Erreur {response.status_code}: {response.text}")
        return None

def compare_results(result_intervenant, result_centre):
    """Compare les résultats des deux simulations."""
    print(f"\n{'='*80}")
    print(f"COMPARAISON DES RÉSULTATS")
    print(f"{'='*80}")
    
    if not result_intervenant or not result_centre:
        print("❌ Impossible de comparer : une des simulations a échoué")
        return
    
    # Comparer les totaux
    diff_heures = result_centre['total_heures'] - result_intervenant['total_heures']
    diff_etp = result_centre['fte_calcule'] - result_intervenant['fte_calcule']
    
    print(f"\nTotal heures:")
    print(f"   - Intervenant: {result_intervenant['total_heures']}h")
    print(f"   - Centre:      {result_centre['total_heures']}h")
    print(f"   - Différence:  {diff_heures:+.2f}h ({diff_heures/result_intervenant['total_heures']*100:+.1f}%)")
    
    print(f"\nETP calculé:")
    print(f"   - Intervenant: {result_intervenant['fte_calcule']}")
    print(f"   - Centre:      {result_centre['fte_calcule']}")
    print(f"   - Différence:  {diff_etp:+.2f}")
    
    print(f"\nNombre de tâches:")
    print(f"   - Intervenant: {len(result_intervenant['details_taches'])}")
    print(f"   - Centre:      {len(result_centre['details_taches'])}")
    
    # Verdict
    if abs(diff_heures) < 0.01 and abs(diff_etp) < 0.01:
        print(f"\n✅ RÉSULTATS IDENTIQUES!")
    else:
        print(f"\n❌ RÉSULTATS DIFFÉRENTS!")
        print(f"\n⚠️  Analyse:")
        if len(result_centre['details_taches']) > len(result_intervenant['details_taches']):
            print(f"   - Le centre a plus de tâches → Il traite probablement plusieurs postes")
        elif abs(diff_heures) > result_intervenant['total_heures'] * 0.5:
            print(f"   - Différence importante → Vérifier si les volumes sont appliqués correctement")

if __name__ == "__main__":
    # IMPORTANT: Remplacer ces IDs par des valeurs réelles de votre base de données
    
    # Pour tester avec un seul poste d'un centre
    # Vous devez trouver un centre_poste_id et le centre_id correspondant
    
    print("="*80)
    print("SCRIPT DE COMPARAISON VUE INTERVENANT vs VUE CENTRE")
    print("="*80)
    print("\n⚠️  CONFIGURATION REQUISE:")
    print("   1. Trouvez un centre_poste_id dans votre base")
    print("   2. Trouvez le centre_id correspondant")
    print("   3. Modifiez les variables ci-dessous")
    print("\nExemple de requête SQL:")
    print("   SELECT cp.id as centre_poste_id, c.id as centre_id, c.label, p.label")
    print("   FROM centre_poste cp")
    print("   JOIN centre c ON cp.centre_id = c.id")
    print("   JOIN poste p ON cp.poste_id = p.id")
    print("   LIMIT 1;")
    print("\n" + "="*80)
    
    # TODO: Remplacer par des valeurs réelles
    centre_poste_id = None  # Ex: 1
    centre_id = None        # Ex: 1
    
    if centre_poste_id is None or centre_id is None:
        print("\n❌ Veuillez configurer centre_poste_id et centre_id dans le script!")
        print("   Voir les instructions ci-dessus.")
        exit(1)
    
    # Exécuter les tests
    result_intervenant = test_intervenant(centre_poste_id)
    result_centre = test_centre(centre_id)
    
    # Comparer
    compare_results(result_intervenant, result_centre)
