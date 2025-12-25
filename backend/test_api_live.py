
import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_live_test():
    url = f"{BASE_URL}/api/simulate"
    
    # 1. Test payload simulating the new ID-based volume matching
    payload = {
        "centre_id": 169,  # Assuming a valid centre ID for testing
        "volumes_flux": [
             {"flux_id": 1, "sens_id": 10, "segment_id": 100, "volume": 120},
             {"flux_id": 1, "sens_id": 10, "segment_id": 101, "volume": 50}
        ],
        "productivite": 100.0,
        "heures_net": 8.0,
        "volumes": {} # Empty legacy volumes
    }

    print(f"Testing URL: {url}")
    print("Payload:", json.dumps(payload, indent=2))

    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        data = response.json()
        print("\n--- RESPONSE SUCCESS ---")
        print(f"Total Heures: {data.get('total_heures')}")
        print(f"FTE Calcule: {data.get('fte_calcule')}")
        print("Details Taches (First 3):")
        for tache in data.get('details_taches', [])[:3]:
            print(f" - {tache.get('task')}: {tache.get('nombre_unite')} un -> {tache.get('heures')}h")
            
    except requests.exceptions.RequestException as e:
        print(f"\n--- REQUEST FAILED ---")
        print(f"Error: {e}")
        if e.response is not None:
             print(f"Response Status: {e.response.status_code}")
             print(f"Response Body: {e.response.text}")
        sys.exit(1)

if __name__ == "__main__":
    run_live_test()
