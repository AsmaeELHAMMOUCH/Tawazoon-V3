# scripts/test_quick.py
"""
Test rapide de l'architecture data-driven.
"""
import sys
from pathlib import Path

# Ajouter le répertoire backend au path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.mapping_models import VolumeMappingRule, UniteConversionRule

def main():
    print("="*80)
    print("TEST RAPIDE - ARCHITECTURE DATA-DRIVEN")
    print("="*80)
    
    db = SessionLocal()
    
    try:
        # Compter les règles
        mapping_count = db.query(VolumeMappingRule).count()
        conversion_count = db.query(UniteConversionRule).count()
        
        print(f"\n✅ Règles de mapping : {mapping_count}")
        print(f"✅ Règles de conversion : {conversion_count}")
        
        if mapping_count == 0:
            print("\n⚠️  Aucune règle de mapping trouvée !")
            print("   Exécutez : python scripts/init_mapping_rules.py")
        else:
            print("\n✅ Les règles sont bien chargées !")
            
            # Afficher quelques exemples
            print("\n📋 Exemples de règles de mapping (5 premières) :")
            sample_rules = db.query(VolumeMappingRule).limit(5).all()
            for i, rule in enumerate(sample_rules, 1):
                print(f"\n{i}. {rule.description}")
                print(f"   → ui_path: {rule.ui_path}")
                print(f"   → priority: {rule.priority}")
            
            print("\n📋 Règles de conversion :")
            conv_rules = db.query(UniteConversionRule).all()
            for rule in conv_rules:
                print(f"   - {rule.unite_mesure}: facteur={rule.facteur_conversion} ({rule.description})")
        
        print("\n" + "="*80)
        print("✅ TEST TERMINÉ")
        print("="*80)
        
    except Exception as e:
        print(f"\n❌ ERREUR : {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    main()
