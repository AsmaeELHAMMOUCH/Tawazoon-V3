"""
Script de test pour la nouvelle architecture Flux/Sens/Segment
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_bulk_upsert():
    """Test de l'upsert bulk de volumes"""
    
    print("="*60)
    print("TEST 1: Bulk Upsert de volumes")
    print("="*60)
    
    payload = {
        "simulation_id": 1,
        "centre_poste_id": 8248,
        "volumes": [
            {"centre_poste_id": 8248, "flux_id": 1, "sens_id": 1, "segment_id": 1, "volume": 50000},
            {"centre_poste_id": 8248, "flux_id": 1, "sens_id": 1, "segment_id": 2, "volume": 30000},
            {"centre_poste_id": 8248, "flux_id": 2, "sens_id": 1, "segment_id": 1, "volume": 120},
        ]
    }
    
    response = requests.post(f"{BASE_URL}/api/volumes/bulk-upsert", json=payload)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()
    
    return response.status_code == 200


def test_calculate():
    """Test du calcul heures/ETP"""
    
    print("="*60)
    print("TEST 2: Calcul heures et ETP")
    print("="*60)
    
    params = {
        "centre_poste_id": 8248,
        "capacite_nette_h_j": 8.0,
        "productivite_pct": 100.0
    }
    
    response = requests.get(f"{BASE_URL}/api/volumes/calculate/1", params=params)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()
    
    return response.status_code == 200


def test_calculate_direct():
    """Test de l'endpoint combiné upsert + calcul"""
    
    print("="*60)
    print("TEST 3: Upsert + Calcul direct")
    print("="*60)
    
    payload = {
        "simulation_id": 2,
        "centre_poste_id": 8248,
        "volumes": [
            {"centre_poste_id": 8248, "flux_id": 1, "sens_id": 1, "segment_id": 2, "volume": 1000},
        ]
    }
    
    params = {
        "capacite_nette_h_j": 8.0,
        "productivite_pct": 100.0
    }
    
    response = requests.post(
        f"{BASE_URL}/api/volumes/calculate-direct",
        json=payload,
        params=params
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()
    
    return response.status_code == 200


if __name__ == "__main__":
    print("\n🚀 Démarrage des tests de la nouvelle architecture\n")
    
    results = []
    
    # Test 1
    try:
        results.append(("Bulk Upsert", test_bulk_upsert()))
    except Exception as e:
        print(f"❌ Erreur Test 1: {e}\n")
        results.append(("Bulk Upsert", False))
    
    # Test 2
    try:
        results.append(("Calculate", test_calculate()))
    except Exception as e:
        print(f"❌ Erreur Test 2: {e}\n")
        results.append(("Calculate", False))
    
    # Test 3
    try:
        results.append(("Calculate Direct", test_calculate_direct()))
    except Exception as e:
        print(f"❌ Erreur Test 3: {e}\n")
        results.append(("Calculate Direct", False))
    
    # Résumé
    print("="*60)
    print("RÉSUMÉ DES TESTS")
    print("="*60)
    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
    print("="*60)
