"""
Script de test pour comparer les calculs ETP entre Vue Centre et Vue Intervenant
pour le centre de Fès
"""

import requests
import json

API_BASE = "http://localhost:8000/api"

# Paramètres de test pour le centre de Fès
# À ajuster selon vos données réelles
TEST_PARAMS = {
    "centre_id": None,  # À remplir avec l'ID du centre Fès
    "poste_id": None,   # À remplir avec un poste_id du centre Fès
    "productivite": 70,
    "heures_net": 5.6,  # 70% de 8h
    "idle_minutes": 0,
    "volumes": {
        "sacs": 0,
        "colis": 0,
        "colis_amana_par_sac": 5,
        "courriers_par_sac": 4500,
        "colis_par_collecte": 1,
    },
    "volumes_annuels": {
        "courrier_ordinaire": 0,
        "courrier_recommande": 0,
        "ebarkia": 0,
        "lrh": 0,
        "amana": 100000,  # Exemple
    }
}


def get_centres():
    """Récupère la liste des centres pour trouver l'ID de Fès"""
    try:
        response = requests.get(f"{API_BASE}/centres")
        centres = response.json()
        
        # Chercher le centre Fès
        for centre in centres:
            if "FES" in centre.get("label", "").upper() or "FÈS" in centre.get("label", "").upper():
                print(f"✅ Centre trouvé: {centre.get('label')} (ID: {centre.get('id')})")
                return centre.get('id')
        
        print("❌ Centre Fès non trouvé")
        return None
    except Exception as e:
        print(f"❌ Erreur lors de la récupération des centres: {e}")
        return None


def get_postes(centre_id):
    """Récupère les postes d'un centre"""
    try:
        response = requests.get(f"{API_BASE}/centre-postes/{centre_id}")
        postes = response.json()
        
        if postes:
            print(f"\n📋 Postes disponibles pour le centre {centre_id}:")
            for poste in postes[:5]:  # Afficher les 5 premiers
                print(f"   - {poste.get('label', 'N/A')} (ID: {poste.get('id')})")
            
            return postes[0].get('id')  # Retourner le premier poste
        
        return None
    except Exception as e:
        print(f"❌ Erreur lors de la récupération des postes: {e}")
        return None


def test_vue_intervenant(centre_id, poste_id):
    """Test de l'endpoint Vue Intervenant"""
    print("\n" + "="*80)
    print("🔍 TEST VUE INTERVENANT")
    print("="*80)
    
    payload = {
        "centre_id": centre_id,
        "poste_id": poste_id,
        "productivite": TEST_PARAMS["productivite"],
        "heures_net": TEST_PARAMS["heures_net"],
        "volumes": TEST_PARAMS["volumes"],
        "volumes_annuels": TEST_PARAMS["volumes_annuels"],
    }
    
    print(f"\n📤 Payload envoyé:")
    print(json.dumps(payload, indent=2))
    
    try:
        response = requests.post(f"{API_BASE}/simulate", json=payload)
        response.raise_for_status()
        data = response.json()
        
        print(f"\n📥 Réponse reçue:")
        print(f"   Total heures: {data.get('total_heures')}")
        print(f"   Heures nettes/jour: {data.get('heures_net_jour')}")
        print(f"   FTE calculé: {data.get('fte_calcule')}")
        print(f"   FTE arrondi: {data.get('fte_arrondi')}")
        print(f"   Nombre de tâches: {len(data.get('details_taches', []))}")
        
        return data
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None


def test_vue_centre(centre_id):
    """Test de l'endpoint Vue Centre"""
    print("\n" + "="*80)
    print("🔍 TEST VUE CENTRE")
    print("="*80)
    
    payload = {
        "centre_id": centre_id,
        "productivite": TEST_PARAMS["productivite"],
        "heures_net": TEST_PARAMS["heures_net"],
        "idle_minutes": TEST_PARAMS["idle_minutes"],
        "volumes": TEST_PARAMS["volumes"],
        "volumes_annuels": TEST_PARAMS["volumes_annuels"],
    }
    
    print(f"\n📤 Payload envoyé:")
    print(json.dumps(payload, indent=2))
    
    try:
        response = requests.post(f"{API_BASE}/vue-centre-optimisee", json=payload)
        response.raise_for_status()
        data = response.json()
        
        print(f"\n📥 Réponse reçue:")
        print(f"   Total heures: {data.get('total_heures')}")
        print(f"   Heures nettes/jour: {data.get('heures_net')}")
        print(f"   Total ETP calculé: {data.get('total_etp_calcule')}")
        print(f"   Total ETP arrondi: {data.get('total_etp_arrondi')}")
        print(f"   Nombre de postes: {len(data.get('postes', []))}")
        print(f"   Nombre de tâches: {len(data.get('details_taches', []))}")
        
        # Afficher le détail par poste
        print(f"\n📊 Détail par poste:")
        for poste in data.get('postes', []):
            print(f"   - {poste.get('poste_label')}: {poste.get('etp_calcule')} ETP")
        
        return data
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None


def compare_results(intervenant_data, centre_data):
    """Compare les résultats des deux endpoints"""
    print("\n" + "="*80)
    print("📊 COMPARAISON DES RÉSULTATS")
    print("="*80)
    
    if not intervenant_data or not centre_data:
        print("❌ Impossible de comparer : données manquantes")
        return
    
    # Extraire les valeurs
    vi_fte = intervenant_data.get('fte_calcule', 0)
    vc_fte = centre_data.get('total_etp_calcule', 0)
    
    vi_heures = intervenant_data.get('total_heures', 0)
    vc_heures = centre_data.get('total_heures', 0)
    
    vi_heures_net = intervenant_data.get('heures_net_jour', 0)
    vc_heures_net = centre_data.get('heures_net', 0)
    
    vi_taches = len(intervenant_data.get('details_taches', []))
    vc_taches = len(centre_data.get('details_taches', []))
    
    # Afficher la comparaison
    print(f"\n{'Métrique':<30} {'Vue Intervenant':<20} {'Vue Centre':<20} {'Différence':<15}")
    print("-" * 85)
    print(f"{'ETP Calculé':<30} {vi_fte:<20.4f} {vc_fte:<20.4f} {abs(vi_fte - vc_fte):<15.4f}")
    print(f"{'Total Heures':<30} {vi_heures:<20.2f} {vc_heures:<20.2f} {abs(vi_heures - vc_heures):<15.2f}")
    print(f"{'Heures Nettes/Jour':<30} {vi_heures_net:<20.2f} {vc_heures_net:<20.2f} {abs(vi_heures_net - vc_heures_net):<15.2f}")
    print(f"{'Nombre de Tâches':<30} {vi_taches:<20} {vc_taches:<20} {abs(vi_taches - vc_taches):<15}")
    
    # Analyse
    print("\n🔍 ANALYSE:")
    
    if abs(vi_fte - vc_fte) < 0.01:
        print("   ✅ Les ETP sont identiques (différence < 0.01)")
    else:
        print(f"   ⚠️  DIFFÉRENCE DÉTECTÉE: {abs(vi_fte - vc_fte):.4f} ETP")
        
        # Hypothèses
        if vi_taches != vc_taches:
            print(f"   💡 Hypothèse 1: Nombre de tâches différent ({vi_taches} vs {vc_taches})")
            print("      → Vue Intervenant filtre par poste, Vue Centre agrège tous les postes")
        
        if abs(vi_heures_net - vc_heures_net) > 0.01:
            print(f"   💡 Hypothèse 2: Heures nettes différentes ({vi_heures_net} vs {vc_heures_net})")
            print("      → Vérifier le paramètre idle_minutes")
        
        if abs(vi_heures - vc_heures) > 0.01:
            print(f"   💡 Hypothèse 3: Total heures différent ({vi_heures} vs {vc_heures})")
            print("      → Vérifier les volumes ou le calcul des tâches")


def main():
    """Fonction principale"""
    print("="*80)
    print("🧪 TEST DE COMPARAISON VUE CENTRE vs VUE INTERVENANT")
    print("="*80)
    
    # 1. Récupérer l'ID du centre Fès
    centre_id = get_centres()
    if not centre_id:
        print("\n❌ Impossible de continuer sans l'ID du centre Fès")
        print("💡 Modifiez TEST_PARAMS['centre_id'] manuellement dans le script")
        return
    
    TEST_PARAMS["centre_id"] = centre_id
    
    # 2. Récupérer un poste du centre
    poste_id = get_postes(centre_id)
    if not poste_id:
        print("\n❌ Impossible de continuer sans un poste_id")
        print("💡 Modifiez TEST_PARAMS['poste_id'] manuellement dans le script")
        return
    
    TEST_PARAMS["poste_id"] = poste_id
    
    # 3. Tester Vue Intervenant
    intervenant_data = test_vue_intervenant(centre_id, poste_id)
    
    # 4. Tester Vue Centre
    centre_data = test_vue_centre(centre_id)
    
    # 5. Comparer les résultats
    compare_results(intervenant_data, centre_data)
    
    print("\n" + "="*80)
    print("✅ Test terminé")
    print("="*80)
    print("\n💡 Consultez les logs du serveur backend pour plus de détails")


if __name__ == "__main__":
    main()
