import sys
import json
import urllib.request
import urllib.error

url2 = 'http://127.0.0.1:8001/api/recommande/simuler'
# Test new payload
payload3 = json.dumps({'metier_id': 1, 'nb_sac': 50, 'nb_sac_jour': 50, 'nb_dossier_mois': 6000, 'productivite': 80.0, 'productivite_pct': 80.0}).encode('utf-8')
headers = {'Content-Type': 'application/json'}
req3 = urllib.request.Request(url2, data=payload3, headers=headers)
try:
    with urllib.request.urlopen(req3) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("KEYS:", list(data.keys()))
except urllib.error.HTTPError as e:
    print(f"FAILED: {e.code}")
    print(e.read().decode('utf-8'))
