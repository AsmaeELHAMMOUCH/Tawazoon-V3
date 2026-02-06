
import requests

try:
    print("Testing /api/builder/ref/postes")
    response = requests.get("http://localhost:8001/api/builder/ref/postes")
    print(f"Status: {response.status_code}")
    # print(response.text[:100])
except Exception as e:
    print(f"Error: {e}")
