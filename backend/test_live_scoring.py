import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_live_scoring():
    print("🚀 Démarrage du test Live Scoring...")
    
    # 1. Start Campaign
    print("\n1️⃣  Création de la campagne...")
    try:
        res = requests.post(f"{BASE_URL}/api/scoring/campaign/start")
        res.raise_for_status()
        campaign_id = res.json()["campaign_id"]
        print(f"✅ Campagne créée: {campaign_id}")
    except Exception as e:
        print(f"❌ Erreur start: {e}")
        return

    # 2. Run Execution
    print(f"\n2️⃣  Lancement du calcul (Simulation RH + Scoring) pour tous les centres...")
    start_time = time.time()
    try:
        res = requests.post(f"{BASE_URL}/api/scoring/campaign/run", params={"campaign_id": campaign_id})
        # Note: might be slow if many centres
        res.raise_for_status()
        data = res.json()
        duration = time.time() - start_time
        print(f"✅ Calcul terminé en {duration:.2f}s")
        print(f"   📊 Centres traités: {data['results_count']}")
        print(f"   📈 Résumé: {json.dumps(data['summary'], indent=2)}")
    except Exception as e:
        print(f"❌ Erreur run: {e}")
        try:
            print(res.text)
        except: pass
        return

    # 3. Fetch Results
    print(f"\n3️⃣  Récupération des résultats détaillés...")
    try:
        res = requests.get(f"{BASE_URL}/api/scoring/campaign/{campaign_id}/results")
        res.raise_for_status()
        results = res.json()["results"]
        print(f"✅ Résultats récupérés: {len(results)} centres")
        
        if results:
            first = results[0]
            print("\n🔍 Exemple de résultat (Premier centre):")
            print(f"   🏥 {first['centre_label']} ({first['code']})")
            print(f"   🏆 Score: {first['global_score']:.2f} -> {first['simulated_classe']}")
            print(f"   📉 Impact: {first['impact']}")
            print("   📝 Détails indicateurs:")
            for d in first['details']:
                print(f"      - {d['label']}: {d['value']} {d['unit']} -> {d['points']}pts (x{d['weight']}) = {d['score']:.2f}")
    except Exception as e:
        print(f"❌ Erreur results: {e}")

if __name__ == "__main__":
    test_live_scoring()
