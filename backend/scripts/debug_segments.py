# scripts/debug_segments.py
"""
Script de debug pour vérifier les codes de segments dans la base.
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.db_models import Flux, VolumeSens, VolumeSegment
from app.models.mapping_models import VolumeMappingRule

def main():
    print("="*80)
    print("DEBUG - VÉRIFICATION DES RÉFÉRENTIELS")
    print("="*80)
    
    db = SessionLocal()
    
    try:
        # Vérifier les flux
        print("\n📋 FLUX:")
        flux_list = db.query(Flux).all()
        for flux in flux_list:
            print(f"   - ID={flux.id}, CODE={flux.code}, LIBELLE={flux.libelle}")
        
        # Vérifier les sens
        print("\n📋 SENS:")
        sens_list = db.query(VolumeSens).all()
        for sens in sens_list:
            print(f"   - ID={sens.id}, CODE={sens.code}, LIBELLE={sens.libelle}")
        
        # Vérifier les segments
        print("\n📋 SEGMENTS:")
        segment_list = db.query(VolumeSegment).all()
        for segment in segment_list:
            print(f"   - ID={segment.id}, CODE={segment.code}, LIBELLE={segment.libelle}")
        
        # Vérifier les règles de mapping
        print("\n📋 RÈGLES DE MAPPING:")
        rules = db.query(VolumeMappingRule).all()
        print(f"   Total: {len(rules)} règles")
        
        # Grouper par sens
        from collections import defaultdict
        by_sens = defaultdict(list)
        for rule in rules:
            by_sens[rule.sens_id].append(rule)
        
        for sens_id, sens_rules in by_sens.items():
            sens = db.query(VolumeSens).filter(VolumeSens.id == sens_id).first()
            sens_code = sens.code if sens else f"ID={sens_id}"
            print(f"\n   Sens {sens_code}: {len(sens_rules)} règles")
            for rule in sens_rules[:3]:  # Afficher 3 exemples
                flux = db.query(Flux).filter(Flux.id == rule.flux_id).first() if rule.flux_id else None
                segment = db.query(VolumeSegment).filter(VolumeSegment.id == rule.segment_id).first() if rule.segment_id else None
                flux_code = flux.code if flux else "NULL"
                segment_code = segment.code if segment else "NULL"
                print(f"      - {flux_code} / {sens_code} / {segment_code} → {rule.ui_path}")
        
        # Vérifier spécifiquement CO/DEPART/PART
        print("\n🔍 VÉRIFICATION SPÉCIFIQUE CO/DEPART/PART:")
        co_flux = db.query(Flux).filter(Flux.code == "CO").first()
        depart_sens = db.query(VolumeSens).filter(VolumeSens.code == "DEPART").first()
        part_segment = db.query(VolumeSegment).filter(VolumeSegment.code.in_(["PART", "PARTICULIER"])).first()
        
        print(f"   - Flux CO: ID={co_flux.id if co_flux else 'NOT FOUND'}")
        print(f"   - Sens DEPART: ID={depart_sens.id if depart_sens else 'NOT FOUND'}")
        print(f"   - Segment PART/PARTICULIER: ID={part_segment.id if part_segment else 'NOT FOUND'}, CODE={part_segment.code if part_segment else 'NOT FOUND'}")
        
        if co_flux and depart_sens and part_segment:
            rule = db.query(VolumeMappingRule).filter(
                VolumeMappingRule.flux_id == co_flux.id,
                VolumeMappingRule.sens_id == depart_sens.id,
                VolumeMappingRule.segment_id == part_segment.id
            ).first()
            
            if rule:
                print(f"   ✅ Règle trouvée: {rule.ui_path}")
            else:
                print(f"   ❌ RÈGLE MANQUANTE pour CO/DEPART/{part_segment.code}")
        
        print("\n" + "="*80)
        
    finally:
        db.close()

if __name__ == "__main__":
    main()
