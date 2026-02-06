
import requests

try:
    print("Testing API Call to /api/builder/find_similar/10")
    response = requests.get("http://localhost:8001/api/builder/find_similar/10")
    print(f"Status Code: {response.status_code}")
    print(f"Content: {response.text}")
except Exception as e:
    print(f"Error: {e}")
