# scripts/test_data_driven.py
"""
Script de test complet pour l'architecture data-driven.
"""
import sys
from pathlib import Path
import json

# Ajouter le répertoire backend au path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.db_models import CentrePoste, Tache
from app.models.mapping_models import VolumeMappingRule, UniteConversionRule
from app.schemas.volumes_ui import VolumesUIInput, FluxVolumesInput, VolumeSegmentInput, GuichetVolumesInput
from app.services.simulation_data_driven import calculer_simulation_data_driven
from app.services.data_driven_engine import DataDrivenEngine


def print_section(title: str):
    """Affiche un titre de section."""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")


def test_1_verify_rules(db: Session):
    """Test 1 : Vérifier que les règles sont bien chargées."""
    print_section("TEST 1 : Vérification des règles de mapping et conversion")
    
    # Compter les règles
    mapping_count = db.query(VolumeMappingRule).count()
    conversion_count = db.query(UniteConversionRule).count()
    
    print(f"✅ Règles de mapping : {mapping_count}")
    print(f"✅ Règles de conversion : {conversion_count}")
    
    if mapping_count == 0:
        print("\n⚠️  ATTENTION : Aucune règle de mapping trouvée !")
        print("   → Exécutez d'abord : python scripts/init_mapping_rules.py")
        return False
    
    # Afficher quelques exemples
    print("\n📋 Exemples de règles de mapping :")
    sample_rules = db.query(VolumeMappingRule).limit(5).all()
    for rule in sample_rules:
        print(f"   - {rule.description}")
        print(f"     → ui_path: {rule.ui_path}")
        print(f"     → priority: {rule.priority}")
    
    print("\n📋 Règles de conversion :")
    conv_rules = db.query(UniteConversionRule).all()
    for rule in conv_rules:
        print(f"   - {rule.unite_mesure}: facteur={rule.facteur_conversion} ({rule.description})")
    
    return True


def test_2_engine_initialization(db: Session):
    """Test 2 : Vérifier l'initialisation du moteur."""
    print_section("TEST 2 : Initialisation du moteur data-driven")
    
    try:
        engine = DataDrivenEngine(db)
        
        print(f"✅ Moteur initialisé avec succès")
        print(f"   - Règles de mapping chargées : {len(engine._mapping_rules)}")
        print(f"   - Règles de conversion chargées : {len(engine._conversion_rules)}")
        print(f"   - Flux en cache : {len(engine._flux_codes)}")
        print(f"   - Sens en cache : {len(engine._sens_codes)}")
        print(f"   - Segments en cache : {len(engine._segment_codes)}")
        
        return True
    
    except Exception as e:
        print(f"❌ ERREUR lors de l'initialisation : {e}")
        return False


def test_3_mapping_for_centre_poste(db: Session, centre_poste_id: int):
    """Test 3 : Tester le mapping pour un centre/poste."""
    print_section(f"TEST 3 : Mapping pour centre/poste ID {centre_poste_id}")
    
    # Vérifier que le centre/poste existe
    centre_poste = db.query(CentrePoste).filter(CentrePoste.id == centre_poste_id).first()
    if not centre_poste:
        print(f"❌ Centre/Poste {centre_poste_id} non trouvé")
        return False
    
    print(f"📍 Centre/Poste : {centre_poste.centre.label if centre_poste.centre else 'N/A'} - {centre_poste.poste.label if centre_poste.poste else 'N/A'}")
    
    # Récupérer les tâches
    taches = db.query(Tache).filter(Tache.centre_poste_id == centre_poste_id).all()
    print(f"📊 Nombre de tâches : {len(taches)}")
    
    if len(taches) == 0:
        print("⚠️  Aucune tâche trouvée pour ce centre/poste")
        return False
    
    # Créer le moteur
    engine = DataDrivenEngine(db)
    
    # Tester le mapping pour chaque tâche
    taches_avec_mapping = 0
    taches_sans_mapping = 0
    
    print("\n📋 Échantillon de mappings (5 premières tâches) :")
    for i, tache in enumerate(taches[:5], 1):
        rule = engine.find_matching_rule(tache)
        codes = engine.get_reference_codes(tache)
        facteur_conv = engine.get_conversion_factor(tache.unite_mesure)
        
        if rule:
            taches_avec_mapping += 1
            print(f"\n{i}. ✅ {tache.nom_tache}")
            print(f"   → flux={codes['flux']}, sens={codes['sens']}, segment={codes['segment']}")
            print(f"   → ui_path: {rule.ui_path}")
            print(f"   → facteur_conversion: {facteur_conv}")
        else:
            taches_sans_mapping += 1
            print(f"\n{i}. ❌ {tache.nom_tache}")
            print(f"   → flux={codes['flux']}, sens={codes['sens']}, segment={codes['segment']}")
            print(f"   → Aucune règle trouvée")
    
    # Compter toutes les tâches
    for tache in taches:
        rule = engine.find_matching_rule(tache)
        if rule:
            taches_avec_mapping += 1
        else:
            taches_sans_mapping += 1
    
    print(f"\n📊 Résumé du mapping :")
    print(f"   - Tâches avec mapping : {taches_avec_mapping}")
    print(f"   - Tâches sans mapping : {taches_sans_mapping}")
    
    return taches_avec_mapping > 0


def test_4_simulation_complete(db: Session, centre_poste_id: int):
    """Test 4 : Simulation complète."""
    print_section(f"TEST 4 : Simulation complète pour centre/poste ID {centre_poste_id}")
    
    # Créer un payload de test
    volumes_ui = VolumesUIInput(
        flux_arrivee=FluxVolumesInput(
            amana=VolumeSegmentInput(
                global_=10000.0,
                part=5000.0,
                pro=3000.0,
                dist=2000.0,
                axes=0.0
            ),
            co=VolumeSegmentInput(
                global_=50000.0,
                part=20000.0,
                pro=15000.0,
                dist=10000.0,
                axes=5000.0
            )
        ),
        guichet=GuichetVolumesInput(
            depot=1000.0,
            recup=800.0
        ),
        flux_depart=FluxVolumesInput(
            amana=VolumeSegmentInput(
                global_=8000.0,
                part=4000.0,
                pro=2500.0,
                dist=1500.0,
                axes=0.0
            )
        ),
        nb_jours_ouvres_an=264
    )
    
    print("📊 Volumes UI de test :")
    print(f"   - Flux Arrivée AMANA GLOBAL : {volumes_ui.flux_arrivee.amana.global_}")
    print(f"   - Guichet Dépôt : {volumes_ui.guichet.depot}")
    print(f"   - Flux Départ AMANA GLOBAL : {volumes_ui.flux_depart.amana.global_}")
    
    try:
        # Lancer la simulation
        result = calculer_simulation_data_driven(
            db=db,
            centre_poste_id=centre_poste_id,
            volumes_ui=volumes_ui,
            productivite=100.0,
            heures_par_jour=8.0,
            idle_minutes=30.0,
            debug=True  # Activer les logs détaillés
        )
        
        print("\n✅ SIMULATION RÉUSSIE !")
        print(f"\n📊 Résultats :")
        print(f"   - Total heures : {result.total_heures}h")
        print(f"   - Heures nettes/jour : {result.heures_net_jour}h")
        print(f"   - ETP calculé : {result.fte_calcule}")
        print(f"   - ETP arrondi : {result.fte_arrondi}")
        print(f"   - Nombre de tâches : {len(result.details_taches)}")
        
        return True
    
    except Exception as e:
        print(f"\n❌ ERREUR lors de la simulation : {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Point d'entrée principal."""
    
    print("="*80)
    print("🧪 TESTS DE L'ARCHITECTURE DATA-DRIVEN")
    print("="*80)
    
    # Créer une session
    db = SessionLocal()
    
    try:
        # Test 1 : Vérifier les règles
        if not test_1_verify_rules(db):
            print("\n❌ Test 1 échoué. Arrêt des tests.")
            return
        
        # Test 2 : Initialiser le moteur
        if not test_2_engine_initialization(db):
            print("\n❌ Test 2 échoué. Arrêt des tests.")
            return
        
        # Trouver un centre/poste pour les tests
        centre_poste = db.query(CentrePoste).first()
        if not centre_poste:
            print("\n❌ Aucun centre/poste trouvé dans la base de données.")
            return
        
        centre_poste_id = centre_poste.id
        
        # Test 3 : Tester le mapping
        if not test_3_mapping_for_centre_poste(db, centre_poste_id):
            print("\n⚠️  Test 3 échoué, mais on continue...")
        
        # Test 4 : Simulation complète
        test_4_simulation_complete(db, centre_poste_id)
        
        print("\n" + "="*80)
        print("✅ TOUS LES TESTS TERMINÉS")
        print("="*80)
        
    except Exception as e:
        print(f"\n❌ ERREUR GLOBALE : {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()


if __name__ == "__main__":
    main()
