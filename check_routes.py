import requests
import json

try:
    print("Fetching ALL Routes...")
    response = requests.get("http://localhost:8001/debug/routes")
    routes = response.json()
    
    print(f"TOTAL ROUTES FOUND: {len(routes)}")
    for r in sorted(routes):
        print(f"ROUTE: {r}")
        
except Exception as e:
    print(f"Error: {e}")
