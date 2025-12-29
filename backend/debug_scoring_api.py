import requests
import json

def debug_scoring():
    endpoints = [
        "http://localhost:8000/ping",
        "http://localhost:8000/api/ping",
        "http://localhost:8000/api/centres?limit=1",
        "http://localhost:8000/api/scoring/run"
    ]
    
    for url in endpoints:
        try:
            print(f"Calling {url}...")
            resp = requests.get(url, timeout=2)
            print(f"Status Code: {resp.status_code}")
            if resp.status_code == 200:
                print("OK")
            else:
                print(f"Error: {resp.text[:100]}")
        except Exception as e:
            print(f"Exception: {e}")
        print("-" * 20)

if __name__ == "__main__":
    debug_scoring()
