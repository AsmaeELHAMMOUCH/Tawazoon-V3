"""
Test direct de l'endpoint /api/simulation/direction
"""
import requests
import json

API_URL = "http://127.0.0.1:8000/api"

# Payload minimal pour tester
payload = {
    "direction_id": 7,  # MARRAKECH-AG
    "mode": "database",
    "global_params": {
        "productivite": 100,
        "heures_par_jour": 8,
        "idle_minutes": 0
    },
    "volumes": []
}

print("=" * 70)
print("TEST ENDPOINT /api/simulation/direction")
print("=" * 70)
print(f"\nPayload: {json.dumps(payload, indent=2)}\n")

try:
    response = requests.post(
        f"{API_URL}/simulation/direction",
        json=payload,
        timeout=30
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}\n")
    
    if response.status_code == 200:
        print("✅ SUCCESS!")
        data = response.json()
        print(f"Direction: {data.get('direction_label')}")
        print(f"Centres: {data.get('kpis', {}).get('nb_centres')}")
        print(f"ETP Actuel: {data.get('kpis', {}).get('etp_actuel')}")
        print(f"ETP Calculé: {data.get('kpis', {}).get('etp_calcule')}")
    else:
        print("❌ ERROR!")
        print(f"Response Text:\n{response.text}\n")
        try:
            error_data = response.json()
            print(f"Error Detail: {json.dumps(error_data, indent=2)}")
        except:
            pass

except requests.exceptions.ConnectionError:
    print("❌ CONNECTION ERROR: Le serveur ne répond pas sur http://127.0.0.1:8000")
    print("Vérifiez que Uvicorn est bien démarré.")
except Exception as e:
    print(f"❌ EXCEPTION: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
