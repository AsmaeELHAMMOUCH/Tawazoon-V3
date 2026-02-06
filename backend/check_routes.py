
import urllib.request
import json

print("Checking routes...")
try:
    with urllib.request.urlopen("http://localhost:8001/debug/routes") as response:
        data = json.loads(response.read().decode())
        print("Routes containing 'postes':")
        found = False
        for r in data:
            if "postes" in r:
                print(r)
                found = True
        if not found:
            print("No 'postes' routes found.")
except Exception as e:
    print(f"Error: {e}")
