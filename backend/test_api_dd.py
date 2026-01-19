# test_api_dd.py
"""Test direct de l'API data-driven."""

import requests
import json

BASE_URL = "http://localhost:8000"

print("="*80)
print("TEST DE L'API DATA-DRIVEN")
print("="*80)

# Test 1 : Vérifier que le serveur répond
print("\n1. Test de connexion au serveur...")
try:
    response = requests.get(f"{BASE_URL}/")
    print(f"✅ Serveur accessible : {response.status_code}")
except Exception as e:
    print(f"❌ Erreur de connexion : {e}")
    exit(1)

# Test 2 : Tester l'endpoint des règles de mapping
print("\n2. Test de l'endpoint /api/simulation-dd/mapping-rules...")
try:
    response = requests.get(f"{BASE_URL}/api/simulation-dd/mapping-rules")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Endpoint accessible")
        print(f"   Total règles : {data.get('total_rules', 0)}")
    elif response.status_code == 404:
        print(f"❌ Endpoint non trouvé (404)")
        print(f"   Le serveur doit être redémarré pour charger le nouveau router")
    else:
        print(f"⚠️  Status code : {response.status_code}")
        print(f"   Response : {response.text[:200]}")
except Exception as e:
    print(f"❌ Erreur : {e}")

# Test 3 : Tester l'endpoint des règles de conversion
print("\n3. Test de l'endpoint /api/simulation-dd/conversion-rules...")
try:
    response = requests.get(f"{BASE_URL}/api/simulation-dd/conversion-rules")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Endpoint accessible")
        print(f"   Total règles : {data.get('total_rules', 0)}")
    elif response.status_code == 404:
        print(f"❌ Endpoint non trouvé (404)")
    else:
        print(f"⚠️  Status code : {response.status_code}")
except Exception as e:
    print(f"❌ Erreur : {e}")

print("\n" + "="*80)
print("FIN DES TESTS")
print("="*80)
print("\n💡 Si les endpoints ne sont pas trouvés, redémarrez le serveur uvicorn")
