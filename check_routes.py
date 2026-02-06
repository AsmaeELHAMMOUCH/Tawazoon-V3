
import requests

try:
    print("Fetching Routes...")
    response = requests.get("http://localhost:8001/debug/routes")
    routes = response.json()
    found = False
    for r in routes:
        if "similar" in r:
            print(f"FOUND: {r}")
            found = True
        if "builder" in r:
            # Print all builder routes to see what we have
             print(f"BUILDER ROUTE: {r}")
    
    if not found:
        print("ERROR: /find_similar not found in routes list")

except Exception as e:
    print(f"Error: {e}")
