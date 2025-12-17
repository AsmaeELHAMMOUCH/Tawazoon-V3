import requests
import json
import sys

# URL de l'API locale
URL = "http://127.0.0.1:8000/api/simulation/direction"

def diagnose():
    try:
        # 1. Fetch a valid direction ID first
        print("🔍 Fetching a valid direction ID...")
        r_dir = requests.get("http://127.0.0.1:8000/api/directions")
        if r_dir.status_code != 200:
            print(f"❌ Failed to fetch directions: {r_dir.status_code} {r_dir.text}")
            return
        
        directions = r_dir.json()
        if not directions:
            print("⚠️ No directions found in DB.")
            return

        direction_id = directions[0]["id"]
        print(f"✅ Using Direction ID: {direction_id}")

        # 2. Construct Payload (mimicking Frontend)
        payload = {
            "direction_id": direction_id,
            "mode": "actuel",
            "global_params": {
                "productivite": 100,
                "heures_par_jour": 7.5,
                "idle_minutes": 0
            },
            "volumes": [
                # Case 1: Minimal with Label (should match if exists)
                {
                    "centre_label": "Centre Test Inexistant", 
                    "sacs": 100,
                    "colis": 50
                },
                # Case 2: Just Zeros
                {
                    "centre_label": "Autre", 
                    "sacs": 0,
                    "colis": 0
                }
            ]
        }

        print(f"🚀 Sending POST request to {URL}...")
        # print("Payload:", json.dumps(payload, indent=2))

        r = requests.post(URL, json=payload)
        
        print(f"📥 Status Code: {r.status_code}")
        try:
            print("📥 Response Body:\n", json.dumps(r.json(), indent=2, ensure_ascii=False))
        except:
            print("📥 Response Text:\n", r.text)

        if r.status_code == 500:
            print("\n❌ CRITICAL: 500 ERROR DETECTED.")
            print("Please check the backend terminal logs for the stack trace.")
        elif r.status_code == 200:
            print("\n✅ SUCCESS: API returned 200 OK.")
        else:
            print(f"\n⚠️ Unexpected Status: {r.status_code}")

    except Exception as e:
        print(f"💥 Exception during diagnosis: {e}")

if __name__ == "__main__":
    diagnose()
