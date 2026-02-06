
import requests
print("Testing URL...")
try:
    r = requests.get('http://localhost:8001/api/postes-mgmt/global/postes')
    print(f"Status: {r.status_code}")
    print(f"Content: {r.text[:200]}")
except Exception as e:
    print(f"Error: {e}")
