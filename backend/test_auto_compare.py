"""
Script simplifié pour trouver les IDs et lancer le test de comparaison.
"""

import requests
import json

API_BASE = "http://localhost:8000/api"

print("="*80)
print("RECHERCHE D'UN CENTRE/POSTE POUR LE TEST")
print("="*80)

# 1. Récupérer les centres
print("\n1. Récupération des centres...")
try:
    response = requests.get(f"{API_BASE}/centres/")
    centres = response.json()
    
    if not centres:
        print("❌ Aucun centre trouvé!")
        exit(1)
    
    # Prendre le premier centre
    if isinstance(centres, list):
        centre = centres[0]
    elif isinstance(centres, dict) and 'centres' in centres:
        centre = centres['centres'][0]
    else:
        centre = centres
    
    centre_id = centre.get('id') or centre.get('centre_id')
    centre_label = centre.get('label') or centre.get('nom') or centre.get('name')
    
    print(f"✅ Centre trouvé: {centre_label} (ID: {centre_id})")
    
except Exception as e:
    print(f"❌ Erreur lors de la récupération des centres: {e}")
    exit(1)

# 2. Récupérer les postes de ce centre
print(f"\n2. Récupération des postes du centre {centre_id}...")
try:
    response = requests.get(f"{API_BASE}/postes/?centre_id={centre_id}")
    postes_data = response.json()
    
    # Normaliser la réponse
    if isinstance(postes_data, list):
        postes = postes_data
    elif isinstance(postes_data, dict) and 'postes' in postes_data:
        postes = postes_data['postes']
    else:
        postes = [postes_data]
    
    if not postes:
        print(f"❌ Aucun poste trouvé pour le centre {centre_id}!")
        exit(1)
    
    # Prendre le premier poste
    poste = postes[0]
    poste_id = poste.get('id') or poste.get('poste_id')
    poste_label = poste.get('label') or poste.get('nom') or poste.get('name')
    centre_poste_id = poste.get('centre_poste_id')
    
    print(f"✅ Poste trouvé: {poste_label} (ID: {poste_id})")
    print(f"✅ Centre/Poste ID: {centre_poste_id}")
    print(f"✅ Nombre de postes dans ce centre: {len(postes)}")
    
except Exception as e:
    print(f"❌ Erreur lors de la récupération des postes: {e}")
    exit(1)

# 3. Lancer le test de comparaison
print(f"\n{'='*80}")
print("LANCEMENT DU TEST DE COMPARAISON")
print(f"{'='*80}")

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
    "debug": False  # Mettre à True pour voir les détails
}

# Test Intervenant
print(f"\n{'='*80}")
print(f"TEST INTERVENANT - Centre/Poste ID: {centre_poste_id}")
print(f"{'='*80}")

try:
    url = f"{API_BASE}/simulation-dd/intervenant/{centre_poste_id}"
    response = requests.post(url, json=volumes_ui, params=params)
    
    if response.status_code == 200:
        result_intervenant = response.json()
        print(f"\n✅ Succès!")
        print(f"   - Total heures: {result_intervenant['total_heures']}h")
        print(f"   - ETP calculé: {result_intervenant['fte_calcule']}")
        print(f"   - ETP arrondi: {result_intervenant['fte_arrondi']}")
        print(f"   - Nombre de tâches: {len(result_intervenant['details_taches'])}")
    else:
        print(f"\n❌ Erreur {response.status_code}: {response.text}")
        result_intervenant = None
except Exception as e:
    print(f"\n❌ Erreur: {e}")
    result_intervenant = None

# Test Centre
print(f"\n{'='*80}")
print(f"TEST CENTRE - Centre ID: {centre_id}")
print(f"{'='*80}")

try:
    url = f"{API_BASE}/simulation-dd/centre/{centre_id}"
    response = requests.post(url, json=volumes_ui, params=params)
    
    if response.status_code == 200:
        result_centre = response.json()
        print(f"\n✅ Succès!")
        print(f"   - Total heures: {result_centre['total_heures']}h")
        print(f"   - ETP calculé: {result_centre['fte_calcule']}")
        print(f"   - ETP arrondi: {result_centre['fte_arrondi']}")
        print(f"   - Nombre de tâches: {len(result_centre['details_taches'])}")
    else:
        print(f"\n❌ Erreur {response.status_code}: {response.text}")
        result_centre = None
except Exception as e:
    print(f"\n❌ Erreur: {e}")
    result_centre = None

# Comparaison
if result_intervenant and result_centre:
    print(f"\n{'='*80}")
    print(f"COMPARAISON DES RÉSULTATS")
    print(f"{'='*80}")
    
    # Comparer les totaux
    diff_heures = result_centre['total_heures'] - result_intervenant['total_heures']
    diff_etp = result_centre['fte_calcule'] - result_intervenant['fte_calcule']
    
    print(f"\nTotal heures:")
    print(f"   - Intervenant: {result_intervenant['total_heures']}h")
    print(f"   - Centre:      {result_centre['total_heures']}h")
    if result_intervenant['total_heures'] > 0:
        print(f"   - Différence:  {diff_heures:+.2f}h ({diff_heures/result_intervenant['total_heures']*100:+.1f}%)")
    else:
        print(f"   - Différence:  {diff_heures:+.2f}h")
    
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
        if len(postes) == 1:
            print(f"   → Normal, le centre n'a qu'un seul poste")
    else:
        print(f"\n❌ RÉSULTATS DIFFÉRENTS!")
        print(f"\n⚠️  Analyse:")
        if len(postes) > 1:
            print(f"   - Le centre a {len(postes)} postes")
            print(f"   - Le résultat Centre devrait être la SOMME de tous les postes")
            print(f"   - Le résultat Intervenant est pour UN SEUL poste")
            print(f"   - Ratio attendu: ~{len(postes)}x")
            if result_intervenant['total_heures'] > 0:
                ratio = result_centre['total_heures'] / result_intervenant['total_heures']
                print(f"   - Ratio observé: {ratio:.2f}x")
        else:
            print(f"   - Le centre n'a qu'un seul poste, les résultats devraient être identiques!")
            print(f"   - 🔴 BUG DÉTECTÉ: La fonction Centre ne donne pas les mêmes résultats!")
else:
    print(f"\n❌ Impossible de comparer : une des simulations a échoué")
