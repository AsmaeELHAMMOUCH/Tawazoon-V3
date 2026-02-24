
import requests
import json

BASE_URL = "http://localhost:8001" # Assuming backend runs on 8001

def test_auto_import(centre_id):
    print(f"Testing auto-import for centre_id={centre_id}...")
    try:
        url = f"{BASE_URL}/api/bandoeng/auto-import-tasks?centre_id={centre_id}"
        response = requests.post(url)
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Test with a centre ID. I'll need to know a valid centre ID without tasks.
    # BANDOENG_CENTRE_ID = 1942 was in the code, let's try it or another one.
    test_auto_import(1942)
