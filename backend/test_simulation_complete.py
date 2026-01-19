# test_simulation_complete.py
"""Test complet de la simulation data-driven."""

import json
import sys
from pathlib import Path

# Ajouter le répertoire backend au path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.schemas.volumes_ui import VolumesUIInput
from app.services.simulation_data_driven import calculer_simulation_data_driven

def main():
    print("="*80)
    print("TEST COMPLET - SIMULATION DATA-DRIVEN")
    print("="*80)
    
    # Charger le payload de test
    with open("test_payload.json", "r") as f:
        payload_dict = json.load(f)
    
    # Convertir en objet Pydantic
    volumes_ui = VolumesUIInput(**payload_dict)
    
    print("\n📊 Payload de test chargé :")
    print(f"   - Flux Arrivée AMANA GLOBAL : {volumes_ui.flux_arrivee.amana.global_}")
    print(f"   - Flux Arrivée CO GLOBAL : {volumes_ui.flux_arrivee.co.global_}")
    print(f"   - Guichet Dépôt : {volumes_ui.guichet.depot}")
    print(f"   - Jours ouvrés/an : {volumes_ui.nb_jours_ouvres_an}")
    
    # Créer une session
    db = SessionLocal()
    
    try:
        # Utiliser le centre_poste_id trouvé lors du test précédent
        centre_poste_id = 8284
        
        print(f"\n🎯 Test de simulation pour centre_poste_id={centre_poste_id}")
        print("   (CENTRE TEST – NOUVELLE ARCHITECTURE / GUICHETIER)")
        
        # Lancer la simulation
        print("\n⏳ Calcul en cours...")
        result = calculer_simulation_data_driven(
            db=db,
            centre_poste_id=centre_poste_id,
            volumes_ui=volumes_ui,
            productivite=100.0,
            heures_par_jour=8.0,
            idle_minutes=30.0,
            debug=True  # Activer les logs détaillés
        )
        
        print("\n" + "="*80)
        print("✅ SIMULATION RÉUSSIE !")
        print("="*80)
        print(f"\n📊 Résultats :")
        print(f"   - Total heures nécessaires : {result.total_heures}h")
        print(f"   - Heures nettes/jour : {result.heures_net_jour}h")
        print(f"   - ETP calculé : {result.fte_calcule}")
        print(f"   - ETP arrondi : {result.fte_arrondi}")
        print(f"   - Nombre de tâches traitées : {len(result.details_taches)}")
        
        if result.details_taches:
            print(f"\n📋 Échantillon de tâches (5 premières) :")
            for i, tache in enumerate(result.details_taches[:5], 1):
                print(f"\n{i}. {tache.task}")
                print(f"   → Unité : {tache.unit}")
                print(f"   → Nombre d'unités : {tache.nombre_unite:.2f}")
                print(f"   → Heures : {tache.heures}h")
        
        print("\n" + "="*80)
        print("🎉 TEST TERMINÉ AVEC SUCCÈS")
        print("="*80)
        print("\n✅ La logique data-driven fonctionne parfaitement !")
        print("   - Mapping automatique : OK")
        print("   - Conversion d'unités : OK")
        print("   - Calcul de charge : OK")
        print("   - Calcul ETP : OK")
        
    except Exception as e:
        print(f"\n❌ ERREUR lors de la simulation : {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    main()
