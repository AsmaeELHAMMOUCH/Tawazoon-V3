import urllib.request
import urllib.parse
import json
import ssl

# Bypass SSL if needed (local dev)
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

URL_BASE = "http://127.0.0.1:8000/api"

def diagnose():
    try:
        # 1. Fetch Request
        print("🔍 Fetching directions...")
        with urllib.request.urlopen(f"{URL_BASE}/directions", context=ctx) as r:
            data = json.loads(r.read().decode())
        
        if not data:
             print("⚠️ No directions found.")
             return
        
        direction_id = data[0]["id"]
        print(f"✅ Using Direction ID: {direction_id}")

        # 2. Post Simulation
        url = f"{URL_BASE}/simulation/direction"
        payload = {
            "direction_id": direction_id,
            "mode": "actuel",
            "global_params": {
                "productivite": 100,
                "heures_par_jour": 7.5,
                "idle_minutes": 0
            },
            "volumes": []
        }
        
        json_data = json.dumps(payload).encode()
        req = urllib.request.Request(
            url, 
            data=json_data, 
            headers={'Content-Type': 'application/json'}
        )

        print(f"🚀 Sending POST to {url}...")
        try:
            with urllib.request.urlopen(req, context=ctx) as r:
                print(f"✅ Success: {r.status}")
                print(r.read().decode()[:500]) # First 500 chars
        except urllib.error.HTTPError as e:
            print(f"❌ HTTP Error: {e.code} {e.reason}")
            print("Error Content:", e.read().decode())
            
    except Exception as e:
        print(f"💥 Exception: {e}")

if __name__ == "__main__":
    diagnose()
