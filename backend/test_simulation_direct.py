# test_simulation_direct.py
"""
Script de test pour la simulation directe avec mapping automatique des volumes UI.
"""
import requests
import json
from typing import Dict, Any


BASE_URL = "http://localhost:8000"


def print_section(title: str):
    """Affiche un titre de section."""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")


def test_mapping_info(centre_poste_id: int):
    """Teste l'endpoint de mapping pour voir les tâches disponibles."""
    print_section(f"TEST 1: Informations de mapping pour centre_poste_id={centre_poste_id}")
    
    url = f"{BASE_URL}/api/simulation-direct/test-mapping/{centre_poste_id}"
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Succès! {data['total_taches']} tâches trouvées\n")
        
        # Afficher les 5 premières tâches
        print("📋 Échantillon de tâches (5 premières):\n")
        for i, mapping in enumerate(data['mappings'][:5], 1):
            print(f"{i}. {mapping['nom_tache']}")
            print(f"   → Unité: {mapping['unite_mesure']}")
            print(f"   → Chrono: {mapping['moyenne_min']} min")
            print(f"   → Flux: {mapping['flux_code']} (ID: {mapping['flux_id']})")
            print(f"   → Sens: {mapping['sens_code']} (ID: {mapping['sens_id']})")
            print(f"   → Segment: {mapping['segment_code']} (ID: {mapping['segment_id']})")
            print(f"   → Chemin UI attendu: {mapping['mapping_info']['expected_ui_path']}")
            print()
        
        return data
    else:
        print(f"❌ Erreur {response.status_code}: {response.text}")
        return None


def test_simulation_scenario_1():
    """
    Scénario 1: Simulation simple avec volumes AMANA en arrivée.
    """
    print_section("TEST 2: Scénario 1 - Volumes AMANA Arrivée")
    
    # Payload de test
    payload = {
        "flux_arrivee": {
            "amana": {
                "GLOBAL": 10000,  # 10000 colis AMANA/an
                "PART": 5000,
                "PRO": 3000,
                "DIST": 2000,
                "AXES": 0
            },
            "co": {
                "GLOBAL": 50000,  # 50000 courriers ordinaires/an
                "PART": 20000,
                "PRO": 15000,
                "DIST": 10000,
                "AXES": 5000
            }
        },
        "guichet": {
            "DEPOT": 1000,  # 1000 dépôts/an
            "RECUP": 800    # 800 récupérations/an
        },
        "flux_depart": {
            "amana": {
                "GLOBAL": 8000,
                "PART": 4000,
                "PRO": 2500,
                "DIST": 1500,
                "AXES": 0
            }
        },
        "nb_jours_ouvres_an": 264
    }
    
    # Paramètres de simulation
    params = {
        "productivite": 100.0,
        "heures_par_jour": 8.0,
        "idle_minutes": 30.0,  # 30 min de marge d'inactivité
        "debug": True
    }
    
    # Choisir un centre_poste_id (à adapter selon votre DB)
    centre_poste_id = 1
    
    url = f"{BASE_URL}/api/simulation-direct/intervenant/{centre_poste_id}"
    
    print(f"📤 Envoi de la requête à: {url}")
    print(f"📊 Paramètres: {params}")
    print(f"📦 Payload volumes (extrait):")
    print(f"   - AMANA Arrivée GLOBAL: {payload['flux_arrivee']['amana']['GLOBAL']}")
    print(f"   - CO Arrivée GLOBAL: {payload['flux_arrivee']['co']['GLOBAL']}")
    print(f"   - Guichet DEPOT: {payload['guichet']['DEPOT']}")
    print()
    
    response = requests.post(url, json=payload, params=params)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Succès!\n")
        print(f"📊 RÉSULTATS:")
        print(f"   - Total heures nécessaires: {data['total_heures']}h")
        print(f"   - Heures nettes/jour: {data['heures_net_jour']}h")
        print(f"   - ETP calculé: {data['fte_calcule']}")
        print(f"   - ETP arrondi: {data['fte_arrondi']}")
        print(f"   - Nombre de tâches traitées: {len(data['details_taches'])}")
        print()
        
        # Afficher quelques détails de tâches
        if data['details_taches']:
            print(f"📋 Détails des tâches (5 premières):\n")
            for i, tache in enumerate(data['details_taches'][:5], 1):
                print(f"{i}. {tache['task']}")
                print(f"   → Phase: {tache['phase']}")
                print(f"   → Unité: {tache['unit']}")
                print(f"   → Volume/jour: {tache['nombre_unite']:.2f}")
                print(f"   → Heures: {tache['heures']}h")
                print()
        
        return data
    else:
        print(f"❌ Erreur {response.status_code}: {response.text}")
        return None


def test_simulation_scenario_2():
    """
    Scénario 2: Simulation avec tous les flux (AMANA, CO, CR, E-Barkia, LRH).
    """
    print_section("TEST 3: Scénario 2 - Tous les flux")
    
    payload = {
        "flux_arrivee": {
            "amana": {
                "GLOBAL": 15000,
                "PART": 7000,
                "PRO": 5000,
                "DIST": 3000,
                "AXES": 0
            },
            "co": {
                "GLOBAL": 80000,
                "PART": 30000,
                "PRO": 25000,
                "DIST": 15000,
                "AXES": 10000
            },
            "cr": {
                "GLOBAL": 20000,
                "PART": 8000,
                "PRO": 7000,
                "DIST": 3000,
                "AXES": 2000
            },
            "ebarkia": {
                "GLOBAL": 5000,
                "PART": 2000,
                "PRO": 1500,
                "DIST": 1000,
                "AXES": 500
            },
            "lrh": {
                "GLOBAL": 3000,
                "PART": 1200,
                "PRO": 1000,
                "DIST": 500,
                "AXES": 300
            }
        },
        "guichet": {
            "DEPOT": 2000,
            "RECUP": 1500
        },
        "flux_depart": {
            "amana": {
                "GLOBAL": 12000,
                "PART": 6000,
                "PRO": 4000,
                "DIST": 2000,
                "AXES": 0
            },
            "co": {
                "GLOBAL": 70000,
                "PART": 25000,
                "PRO": 20000,
                "DIST": 15000,
                "AXES": 10000
            }
        },
        "nb_jours_ouvres_an": 264
    }
    
    params = {
        "productivite": 95.0,  # 95% de productivité
        "heures_par_jour": 7.5,  # 7.5h de travail
        "idle_minutes": 45.0,  # 45 min de marge
        "debug": False  # Pas de debug détaillé pour ce test
    }
    
    centre_poste_id = 1
    url = f"{BASE_URL}/api/simulation-direct/intervenant/{centre_poste_id}"
    
    print(f"📤 Envoi de la requête avec tous les flux...")
    print(f"📊 Paramètres: Prod={params['productivite']}%, H/jour={params['heures_par_jour']}h, Idle={params['idle_minutes']}min\n")
    
    response = requests.post(url, json=payload, params=params)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Succès!\n")
        print(f"📊 RÉSULTATS:")
        print(f"   - Total heures: {data['total_heures']}h")
        print(f"   - ETP calculé: {data['fte_calcule']}")
        print(f"   - ETP arrondi: {data['fte_arrondi']}")
        print()
        return data
    else:
        print(f"❌ Erreur {response.status_code}: {response.text}")
        return None


def test_simulation_centre():
    """
    Test de simulation au niveau centre (agrégation de tous les postes).
    """
    print_section("TEST 4: Simulation au niveau Centre")
    
    payload = {
        "flux_arrivee": {
            "amana": {
                "GLOBAL": 20000,
                "PART": 10000,
                "PRO": 6000,
                "DIST": 4000,
                "AXES": 0
            }
        },
        "guichet": {
            "DEPOT": 1500,
            "RECUP": 1200
        },
        "flux_depart": {
            "amana": {
                "GLOBAL": 18000,
                "PART": 9000,
                "PRO": 5500,
                "DIST": 3500,
                "AXES": 0
            }
        },
        "nb_jours_ouvres_an": 264
    }
    
    params = {
        "productivite": 100.0,
        "heures_par_jour": 8.0,
        "idle_minutes": 30.0,
        "debug": False
    }
    
    centre_id = 1  # À adapter selon votre DB
    url = f"{BASE_URL}/api/simulation-direct/centre/{centre_id}"
    
    print(f"📤 Simulation pour le centre {centre_id}...\n")
    
    response = requests.post(url, json=payload, params=params)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Succès!\n")
        print(f"📊 RÉSULTATS AGRÉGÉS:")
        print(f"   - Total heures: {data['total_heures']}h")
        print(f"   - ETP calculé: {data['fte_calcule']}")
        print(f"   - ETP arrondi: {data['fte_arrondi']}")
        print(f"   - Nombre de tâches: {len(data['details_taches'])}")
        print()
        return data
    else:
        print(f"❌ Erreur {response.status_code}: {response.text}")
        return None


def main():
    """Exécute tous les tests."""
    print_section("🚀 TESTS DE SIMULATION DIRECTE")
    
    try:
        # Test 1: Informations de mapping
        mapping_info = test_mapping_info(centre_poste_id=1)
        
        if mapping_info:
            # Test 2: Scénario simple
            test_simulation_scenario_1()
            
            # Test 3: Scénario complet
            test_simulation_scenario_2()
            
            # Test 4: Simulation centre
            test_simulation_centre()
        
        print_section("✅ TESTS TERMINÉS")
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
