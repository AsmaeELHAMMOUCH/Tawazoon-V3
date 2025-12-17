import requests
import json
import sys

URL = "http://localhost:8000/api/simulation/direction"

payload = {
    "direction_id": 1,
    "mode": "actuel",
    "global_params": {
        "productivite": 100,
        "heures_par_jour": 8,
        "idle_minutes": 0
    },
    "volumes": [
        {
            "centre_id": 101,  # If you know a valid ID, better. If not, logic skips or treats as unknown if no match.
            "centre_label": "Centre Test Local",
            "sacs": 100,
            "colis": 50,
            "courrier_ordinaire": 5000,
            "courrier_recommande": 100
        }
    ]
}

print(f"📡 Testing Endpoint: {URL}")
print(f"📦 Payload: {json.dumps(payload, indent=2)}")

try:
    resp = requests.post(URL, json=payload)
    print(f"⬅️ Status Code: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        print("✅ SUCCESS! Response:")
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print("❌ FAILED. Response Text:")
        print(resp.text)
        
except Exception as e:
    print(f"🔥 Exception: {e}")
