"""
Script de test pour les règles métier du centre 2064
Test avec des données réelles
"""

import sys
import os

# Ajouter le chemin du backend au PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.business_rules_2064 import BusinessRules2064


def test_regle_co_arrivee_donnees_reelles():
    """
    Test de la règle CO Arrivée avec les données réelles de l'image
    
    Données d'entrée (de l'image) :
    - Volume CO Global Arrivée : 1,043,148
    - pr_AXES : 60%
    - base_calcul : 40 (ED)
    - chrono_minute : À définir (exemple: 0.5 min/colis)
    """
    print("\n" + "="*80)
    print("TEST RÈGLE MÉTIER 2064 - CO ARRIVÉE")
    print("="*80)
    
    # Initialiser le moteur pour le centre 2064
    business_rules = BusinessRules2064(centre_id=2064)
    
    print(f"\n✓ Moteur initialisé")
    print(f"  - Centre ID: 2064")
    print(f"  - Actif: {business_rules.is_active}")
    
    # Créer une tâche mock qui correspond aux critères
    class TacheMock:
        def __init__(self):
            self.produit = 'CO'
            self.famille_uo = 'Arrivée Camion Principal'
            self.unite_mesure = 'colis'
            self.base_calcul = 40  # ED
            self.chrono = 0.5  # 30 secondes par colis (exemple)
    
    tache = TacheMock()
    
    print(f"\n✓ Tâche de test créée")
    print(f"  - Produit: {tache.produit}")
    print(f"  - Famille UO: {tache.famille_uo}")
    print(f"  - Base calcul: {tache.base_calcul}")
    print(f"  - Chrono: {tache.chrono} min/colis")
    
    # Volumes réels de l'image
    volumes = {
        'ARRIVEE': {
            'CO': {
                'GLOBAL': 1043148,  # Volume total journalier
                'PART': 17397,
                'PRO': 92520,
                'DIST': 0,
                'AXES': 0
            }
        }
    }
    
    print(f"\n✓ Volumes configurés")
    print(f"  - CO Global Arrivée: {volumes['ARRIVEE']['CO']['GLOBAL']:,}")
    
    # Paramètres réels de l'image
    parametres = {
        'pr_AXES': 60.0  # 60% Axes
    }
    
    print(f"\n✓ Paramètres configurés")
    print(f"  - pr_AXES: {parametres['pr_AXES']}%")
    
    # Calculer la charge
    print(f"\n⚙️  Calcul en cours...")
    charge_minutes = business_rules.calculer_charge_minutes(
        tache=tache,
        volumes=volumes,
        parametres=parametres
    )
    
    if charge_minutes is not None:
        print(f"\n✅ RÈGLE APPLIQUÉE AVEC SUCCÈS")
        print(f"\n📊 RÉSULTATS:")
        print(f"  - Charge totale: {charge_minutes:,.2f} minutes")
        print(f"  - Charge totale: {charge_minutes/60:,.2f} heures")
        print(f"  - Charge totale: {charge_minutes/60/8:,.2f} jours (8h/jour)")
        
        # Détail du calcul
        print(f"\n🔍 DÉTAIL DU CALCUL:")
        base_facteur = tache.base_calcul / 100.0
        axes_facteur = 1 - (parametres['pr_AXES'] / 100.0)
        volume = volumes['ARRIVEE']['CO']['GLOBAL']
        
        print(f"  - Facteur base (ED): {tache.base_calcul}% = {base_facteur}")
        print(f"  - Facteur Axes: (1 - {parametres['pr_AXES']}%) = {axes_facteur}")
        print(f"  - Volume CO: {volume:,}")
        print(f"  - Chrono: {tache.chrono} min/colis")
        print(f"\n  Formule: {base_facteur} × {tache.chrono} × {volume:,} × {axes_facteur}")
        print(f"         = {charge_minutes:,.2f} minutes")
        
        return True
    else:
        print(f"\n❌ RÈGLE NON APPLIQUÉE")
        print(f"  La tâche ne correspond pas aux critères de la règle CO Arrivée")
        return False


def test_matching_regle():
    """
    Test du système de matching des règles
    """
    print("\n" + "="*80)
    print("TEST MATCHING RÈGLES")
    print("="*80)
    
    business_rules = BusinessRules2064(centre_id=2064)
    
    # Test 1: Tâche qui devrait matcher
    print("\n✓ Test 1: Tâche CO Arrivée (devrait matcher)")
    match1 = business_rules._match_regle_co_arrivee(
        produit='CO',
        famille_uo='Arrivée Camion Principal',
        unite_mesure='colis',
        base_calcul=40
    )
    print(f"  Résultat: {'✅ MATCH' if match1 else '❌ NO MATCH'}")
    
    # Test 2: Tâche qui ne devrait PAS matcher (mauvais produit)
    print("\n✓ Test 2: Tâche Amana Arrivée (ne devrait PAS matcher)")
    match2 = business_rules._match_regle_co_arrivee(
        produit='Amana',
        famille_uo='Arrivée Camion Principal',
        unite_mesure='colis',
        base_calcul=40
    )
    print(f"  Résultat: {'✅ MATCH' if match2 else '❌ NO MATCH'}")
    
    # Test 3: Tâche qui ne devrait PAS matcher (mauvaise famille)
    print("\n✓ Test 3: Tâche CO Départ (ne devrait PAS matcher)")
    match3 = business_rules._match_regle_co_arrivee(
        produit='CO',
        famille_uo='Départ Camion',
        unite_mesure='colis',
        base_calcul=40
    )
    print(f"  Résultat: {'✅ MATCH' if match3 else '❌ NO MATCH'}")
    
    # Test 4: Tâche qui ne devrait PAS matcher (mauvais base_calcul)
    print("\n✓ Test 4: Tâche CO Arrivée base 60 (ne devrait PAS matcher)")
    match4 = business_rules._match_regle_co_arrivee(
        produit='CO',
        famille_uo='Arrivée Camion Principal',
        unite_mesure='colis',
        base_calcul=60
    )
    print(f"  Résultat: {'✅ MATCH' if match4 else '❌ NO MATCH'}")
    
    return match1 and not match2 and not match3 and not match4


if __name__ == "__main__":
    print("\n" + "#"*80)
    print("# TESTS RÈGLES MÉTIER CENTRE 2064")
    print("#"*80)
    
    # Test 1: Matching
    success_matching = test_matching_regle()
    
    # Test 2: Calcul avec données réelles
    success_calcul = test_regle_co_arrivee_donnees_reelles()
    
    # Résumé
    print("\n" + "="*80)
    print("RÉSUMÉ DES TESTS")
    print("="*80)
    print(f"  - Test Matching: {'✅ PASS' if success_matching else '❌ FAIL'}")
    print(f"  - Test Calcul: {'✅ PASS' if success_calcul else '❌ FAIL'}")
    print(f"\n  Résultat global: {'✅ TOUS LES TESTS PASSENT' if (success_matching and success_calcul) else '❌ ÉCHEC'}")
    print("="*80 + "\n")
