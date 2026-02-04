import requests
import json

def check_api_response():
    url = "http://127.0.0.1:8000/api/bandoeng/postes?centre_id=1942"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            print(f"Total entries: {len(data)}")
            if data:
                print("First 5 entries:")
                for item in data[:5]:
                    print(f"ID: {item.get('id')}, Label: {item.get('label')}, Category: {item.get('categorie')}")
                
                # Check for any valid category
                valid_cats = [d for d in data if d.get('categorie')]
                print(f"\nEntries with valid category: {len(valid_cats)} / {len(data)}")
                
                if not valid_cats:
                    print("ALL CATEGORIES ARE MISSING/NULL in API response!")
            else:
                print("Empty list returned")
        else:
            print(f"Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    check_api_response()
