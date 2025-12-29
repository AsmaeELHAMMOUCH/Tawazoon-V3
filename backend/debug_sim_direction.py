import json
import urllib.request
import urllib.error

API_URL = "http://127.0.0.1:8000/api"

def debug():
    try:
        # 1. Get Directions
        with urllib.request.urlopen(f"{API_URL}/directions") as r:
            data = json.loads(r.read().decode())
            if not data:
                print("Aucune direction trouvée.")
                return
            d_id = data[0]['id']
            print(f"Testing for Direction ID: {d_id}")

            # 2. Simulate
            payload = {
                "direction_id": d_id,
                "mode": "database",
                "global_params": {
                    "productivite": 100,
                    "heures_par_jour": 8,
                    "idle_minutes": 0
                },
                "volumes": []
            }
            
            req = urllib.request.Request(
                f"{API_URL}/simulation/direction",
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            
            with urllib.request.urlopen(req) as sim_res:
                print(f"SUCCESS! Status: {sim_res.status}")
                # print(sim_res.read().decode())

    except urllib.error.HTTPError as e:
        print(f"HTTP ERROR {e.code}:")
        print(e.read().decode())
    except Exception as e:
        print(f"EXCEPTION: {e}")

if __name__ == "__main__":
    debug()
