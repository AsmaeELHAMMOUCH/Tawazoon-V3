import requests
import json

url = "http://localhost:8000/api/volumes/bulk-upsert"

payload = {
    "simulation_id": 1,
    "centre_poste_id": 8248,
    "volumes": [
        {"centre_poste_id": 8248, "flux_id": 1, "sens_id": 1, "segment_id": 2, "volume": 1000}
    ]
}

print("Envoi de la requête...")
print(json.dumps(payload, indent=2))
print()

try:
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Erreur: {e}")
