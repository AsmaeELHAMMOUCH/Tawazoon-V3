import requests
import json

def check_api():
    url = "http://localhost:8000/api/centres?region_id=22"
    try:
        print(f"Fetching {url}...")
        resp = requests.get(url)
        if resp.status_code != 200:
            print(f"Error: {resp.status_code} - {resp.text}")
            return

        data = resp.json()
        print(f"Got {len(data)} centres.")
        
        # Find Valfleuri
        valfleuri = next((c for c in data if "VALFLEURI" in (c.get('label') or "")), None)
        
        if valfleuri:
            print(f"FOUND VALFLEURI IN API:")
            print(json.dumps(valfleuri, indent=2))
        else:
            print("Valfleuri NOT FOUND in API response.")
            # Print first 3 to see structure
            print("First 3 items:")
            print(json.dumps(data[:3], indent=2))

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    check_api()
