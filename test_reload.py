
import requests

try:
    print("Testing /test_reload_check")
    response = requests.get("http://localhost:8001/test_reload_check")
    print(f"Status: {response.status_code}")
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
