# scripts/init_mapping_rules.py
"""
Script d'initialisation des règles de mapping et de conversion.
À exécuter une seule fois pour peupler les tables de référence.
"""
import sys
from pathlib import Path

# Ajouter le répertoire backend au path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from app.core.db import SessionLocal, engine
from app.models.mapping_models import VolumeMappingRule, UniteConversionRule
from app.models.db_models import Flux, VolumeSens, VolumeSegment, Base


def get_or_create_flux(db: Session, code: str, libelle: str = None) -> int:
    """Récupère ou crée un flux."""
    flux = db.query(Flux).filter(Flux.code == code).first()
    if not flux:
        flux = Flux(code=code, libelle=libelle or code)
        db.add(flux)
        db.commit()
        db.refresh(flux)
    return flux.id


def get_or_create_sens(db: Session, code: str, libelle: str = None) -> int:
    """Récupère ou crée un sens."""
    sens = db.query(VolumeSens).filter(VolumeSens.code == code).first()
    if not sens:
        sens = VolumeSens(code=code, libelle=libelle or code)
        db.add(sens)
        db.commit()
        db.refresh(sens)
    return sens.id


def get_or_create_segment(db: Session, code: str, libelle: str = None) -> int:
    """Récupère ou crée un segment."""
    segment = db.query(VolumeSegment).filter(VolumeSegment.code == code).first()
    if not segment:
        segment = VolumeSegment(code=code, libelle=libelle or code)
        db.add(segment)
        db.commit()
        db.refresh(segment)
    return segment.id


def init_mapping_rules(db: Session):
    """Initialise les règles de mapping UI ↔ DB."""
    
    print("🔧 Initialisation des règles de mapping...")
    
    # Supprimer les règles existantes
    db.query(VolumeMappingRule).delete()
    db.commit()
    
    # Récupérer les IDs des référentiels
    flux_ids = {
        "AMANA": get_or_create_flux(db, "AMANA", "Amana"),
        "CO": get_or_create_flux(db, "CO", "Courrier Ordinaire"),
        "CR": get_or_create_flux(db, "CR", "Courrier Recommandé"),
        "EBARKIA": get_or_create_flux(db, "EBARKIA", "E-Barkia"),
        "LRH": get_or_create_flux(db, "LRH", "LRH"),
    }
    
    sens_ids = {
        "ARRIVEE": get_or_create_sens(db, "ARRIVEE", "Arrivée"),
        "DEPOT": get_or_create_sens(db, "DEPOT", "Dépôt"),
        "RECUP": get_or_create_sens(db, "RECUP", "Récupération"),
        "DEPART": get_or_create_sens(db, "DEPART", "Départ"),
    }
    
    segment_ids = {
        "GLOBAL": get_or_create_segment(db, "GLOBAL", "Global"),
        "PART": get_or_create_segment(db, "PART", "Particulier"),
        "PRO": get_or_create_segment(db, "PRO", "Professionnel"),
        "DIST": get_or_create_segment(db, "DIST", "Distribution"),
        "AXES": get_or_create_segment(db, "AXES", "Axes"),
    }
    
    # Mapping segment code → field UI
    segment_to_field = {
        "GLOBAL": "global_",
        "PART": "part",
        "PRO": "pro",
        "DIST": "dist",
        "AXES": "axes",
    }
    
    # Définir les règles de mapping
    rules = []
    
    # ========================================
    # RÈGLES GUICHET GLOBALES (PRIORITÉ MAXIMALE)
    # ========================================
    # Ces règles s'appliquent à TOUTES les tâches avec sens=DEPOT ou sens=RECUP
    # peu importe le flux ou le segment
    
    rules.append(
        VolumeMappingRule(
            flux_id=None,  # Wildcard - s'applique à tous les flux
            sens_id=sens_ids["DEPOT"],
            segment_id=None,  # Wildcard - s'applique à tous les segments
            nom_tache_keyword=None,
            ui_path="guichet.depot",
            priority=1000,  # Priorité maximale
            description="Guichet DEPOT - Règle globale pour tous flux/segments"
        )
    )
    
    rules.append(
        VolumeMappingRule(
            flux_id=None,  # Wildcard - s'applique à tous les flux
            sens_id=sens_ids["RECUP"],
            segment_id=None,  # Wildcard - s'applique à tous les segments
            nom_tache_keyword=None,
            ui_path="guichet.recup",
            priority=1000,  # Priorité maximale
            description="Guichet RECUP - Règle globale pour tous flux/segments"
        )
    )
    
    # ========================================
    # RÈGLES FLUX ARRIVÉE
    # ========================================
    for flux_code, flux_id in flux_ids.items():
        for segment_code, segment_id in segment_ids.items():
            flux_lower = flux_code.lower()
            segment_field = segment_to_field[segment_code]
            
            rules.append(
                VolumeMappingRule(
                    flux_id=flux_id,
                    sens_id=sens_ids["ARRIVEE"],
                    segment_id=segment_id,
                    nom_tache_keyword=None,
                    ui_path=f"flux_arrivee.{flux_lower}.{segment_field}",
                    priority=100,
                    description=f"Flux Arrivée - {flux_code} - {segment_code}"
                )
            )
    
    # ========================================
    # RÈGLES FLUX DÉPART
    # ========================================
    for flux_code, flux_id in flux_ids.items():
        for segment_code, segment_id in segment_ids.items():
            flux_lower = flux_code.lower()
            segment_field = segment_to_field[segment_code]
            
            rules.append(
                VolumeMappingRule(
                    flux_id=flux_id,
                    sens_id=sens_ids["DEPART"],
                    segment_id=segment_id,
                    nom_tache_keyword=None,
                    ui_path=f"flux_depart.{flux_lower}.{segment_field}",
                    priority=100,
                    description=f"Flux Départ - {flux_code} - {segment_code}"
                )
            )
    
    # Ajouter toutes les règles
    db.add_all(rules)
    db.commit()
    
    print(f"✅ {len(rules)} règles de mapping créées")


def init_conversion_rules(db: Session):
    """Initialise les règles de conversion d'unités."""
    
    print("\n🔧 Initialisation des règles de conversion...")
    
    # Supprimer les règles existantes
    db.query(UniteConversionRule).delete()
    db.commit()
    
    # Définir les règles de conversion
    conversion_rules = [
        UniteConversionRule(
            unite_mesure="SAC",
            facteur_conversion=0.2,  # 1 sac = 5 colis → volume / 5 = volume * 0.2
            description="1 sac = 5 colis"
        ),
        UniteConversionRule(
            unite_mesure="COLIS",
            facteur_conversion=1.0,
            description="Pas de conversion"
        ),
        UniteConversionRule(
            unite_mesure="COURRIER",
            facteur_conversion=1.0,
            description="Pas de conversion"
        ),
        UniteConversionRule(
            unite_mesure="RECOMMANDE",
            facteur_conversion=1.0,
            description="Pas de conversion"
        ),
        UniteConversionRule(
            unite_mesure="EBARKIA",
            facteur_conversion=1.0,
            description="Pas de conversion"
        ),
        UniteConversionRule(
            unite_mesure="LRH",
            facteur_conversion=1.0,
            description="Pas de conversion"
        ),
    ]
    
    db.add_all(conversion_rules)
    db.commit()
    
    print(f"✅ {len(conversion_rules)} règles de conversion créées")


def verify_rules(db: Session):
    """Vérifie que les règles ont bien été créées."""
    
    print("\n🔍 Vérification des règles...")
    
    mapping_count = db.query(VolumeMappingRule).count()
    conversion_count = db.query(UniteConversionRule).count()
    
    print(f"   - Règles de mapping: {mapping_count}")
    print(f"   - Règles de conversion: {conversion_count}")
    
    # Afficher quelques exemples
    print("\n📋 Exemples de règles de mapping:")
    sample_rules = db.query(VolumeMappingRule).limit(5).all()
    for rule in sample_rules:
        print(f"   - {rule.description}")
        print(f"     → ui_path: {rule.ui_path}")
        print(f"     → priority: {rule.priority}")
    
    print("\n📋 Règles de conversion:")
    conv_rules = db.query(UniteConversionRule).all()
    for rule in conv_rules:
        print(f"   - {rule.unite_mesure}: facteur={rule.facteur_conversion} ({rule.description})")


def main():
    """Point d'entrée principal."""
    
    print("="*80)
    print("🚀 INITIALISATION DES RÈGLES DE MAPPING ET CONVERSION")
    print("="*80)
    
    # Créer les tables si elles n'existent pas
    print("\n📦 Création des tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables créées")
    
    # Créer une session
    db = SessionLocal()
    
    try:
        # Initialiser les règles
        init_mapping_rules(db)
        init_conversion_rules(db)
        
        # Vérifier
        verify_rules(db)
        
        print("\n" + "="*80)
        print("✅ INITIALISATION TERMINÉE AVEC SUCCÈS")
        print("="*80)
        print("\n💡 Vous pouvez maintenant utiliser le moteur data-driven !")
        print("   → Les règles sont stockées dans les tables:")
        print("      - dbo.volume_mapping_rules")
        print("      - dbo.unite_conversion_rules")
        
    except Exception as e:
        print(f"\n❌ ERREUR: {e}")
        db.rollback()
        raise
    
    finally:
        db.close()


if __name__ == "__main__":
    main()
