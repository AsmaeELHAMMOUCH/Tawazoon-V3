
import requests
import json

def test_api():
    # Correction du port si nécessaire
    url = "http://127.0.0.1:8000/api/simulation-dd/intervenant/8284"
    params = {
        "productivite": 100,
        "heures_par_jour": 8,
        "idle_minutes": 0,
        "debug": "true"
    }
    body = {
        "flux_arrivee": {
            "amana": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
            "co": {"GLOBAL": 700000, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
            "cr": {"GLOBAL": 600000, "PART": 7000000, "PRO": 0, "DIST": 0, "AXES": 0},
            "ebarkia": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
            "lrh": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0}
        },
        "guichet": {"DEPOT": 5555, "RECUP": 0},
        "flux_depart": {
            "amana": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
            "co": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
            "cr": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
            "ebarkia": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0},
            "lrh": {"GLOBAL": 0, "PART": 0, "PRO": 0, "DIST": 0, "AXES": 0}
        },
        "nb_jours_ouvres_an": 264
    }
    
    print(f"Calling {url} with user-like payload...")
    try:
        resp = requests.post(url, params=params, json=body)
        print(f"Status Code: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print("Success! Summary:")
            print(f"Total Hours: {data.get('total_heures')}")
            print(f"ETP: {data.get('fte_calcule')}")
            # print(json.dumps(data, indent=2))
        else:
            print(f"Error Response: {resp.text}")
    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    test_api()
