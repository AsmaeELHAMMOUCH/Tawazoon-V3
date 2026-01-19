# check_reference_data.py
"""
Script pour vérifier la cohérence des données de référence (flux, sens, segments).
"""
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.db import get_db_url
from app.models.db_models import Flux, VolumeSens, VolumeSegment, Tache


def print_section(title: str):
    """Affiche un titre de section."""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")


def check_flux(session):
    """Vérifie les données de la table flux."""
    print_section("1. Vérification de la table FLUX")
    
    flux_list = session.query(Flux).all()
    
    if not flux_list:
        print("⚠️  ATTENTION: Aucun flux trouvé dans la base de données!")
        return False
    
    print(f"✅ {len(flux_list)} flux trouvés:\n")
    
    for flux in flux_list:
        print(f"   ID: {flux.id:2d} | Code: {flux.code:15s} | Libellé: {flux.libelle or 'N/A'}")
    
    # Vérifier les codes attendus
    expected_codes = ["AMANA", "CO", "CR", "EBARKIA", "E-BARKIA", "LRH"]
    found_codes = [f.code.upper() for f in flux_list]
    
    print(f"\n📋 Codes attendus: {expected_codes}")
    print(f"📋 Codes trouvés: {found_codes}\n")
    
    missing = [code for code in expected_codes if code not in found_codes]
    if missing:
        print(f"⚠️  Codes manquants: {missing}")
        return False
    else:
        print("✅ Tous les codes attendus sont présents")
        return True


def check_sens(session):
    """Vérifie les données de la table volume_sens."""
    print_section("2. Vérification de la table VOLUME_SENS")
    
    sens_list = session.query(VolumeSens).all()
    
    if not sens_list:
        print("⚠️  ATTENTION: Aucun sens trouvé dans la base de données!")
        return False
    
    print(f"✅ {len(sens_list)} sens trouvés:\n")
    
    for sens in sens_list:
        print(f"   ID: {sens.id:2d} | Code: {sens.code:15s} | Libellé: {sens.libelle or 'N/A'}")
    
    # Vérifier les codes attendus
    expected_codes = ["ARRIVEE", "ARRIVÉE", "DEPART", "DÉPART", "GUICHET"]
    found_codes = [s.code.upper() for s in sens_list]
    
    print(f"\n📋 Codes attendus (au moins un de chaque): {expected_codes}")
    print(f"📋 Codes trouvés: {found_codes}\n")
    
    # Au moins un code pour arrivée, départ, guichet
    has_arrivee = any(code in found_codes for code in ["ARRIVEE", "ARRIVÉE"])
    has_depart = any(code in found_codes for code in ["DEPART", "DÉPART"])
    has_guichet = "GUICHET" in found_codes
    
    if not has_arrivee:
        print("⚠️  Code ARRIVÉE manquant")
    if not has_depart:
        print("⚠️  Code DÉPART manquant")
    if not has_guichet:
        print("⚠️  Code GUICHET manquant")
    
    if has_arrivee and has_depart and has_guichet:
        print("✅ Tous les sens nécessaires sont présents")
        return True
    else:
        return False


def check_segments(session):
    """Vérifie les données de la table volume_segments."""
    print_section("3. Vérification de la table VOLUME_SEGMENTS")
    
    segment_list = session.query(VolumeSegment).all()
    
    if not segment_list:
        print("⚠️  ATTENTION: Aucun segment trouvé dans la base de données!")
        return False
    
    print(f"✅ {len(segment_list)} segments trouvés:\n")
    
    for segment in segment_list:
        print(f"   ID: {segment.id:2d} | Code: {segment.code:20s} | Libellé: {segment.libelle or 'N/A'}")
    
    # Vérifier les codes attendus
    expected_codes = ["GLOBAL", "PART", "PARTICULIER", "PRO", "PROFESSIONNEL", "DIST", "DISTRIBUTION", "AXES"]
    found_codes = [s.code.upper() for s in segment_list]
    
    print(f"\n📋 Codes attendus (au moins un de chaque type): {expected_codes}")
    print(f"📋 Codes trouvés: {found_codes}\n")
    
    # Au moins un code pour chaque type
    has_global = "GLOBAL" in found_codes
    has_part = any(code in found_codes for code in ["PART", "PARTICULIER"])
    has_pro = any(code in found_codes for code in ["PRO", "PROFESSIONNEL"])
    has_dist = any(code in found_codes for code in ["DIST", "DISTRIBUTION"])
    has_axes = "AXES" in found_codes
    
    if not has_global:
        print("⚠️  Code GLOBAL manquant")
    if not has_part:
        print("⚠️  Code PART/PARTICULIER manquant")
    if not has_pro:
        print("⚠️  Code PRO/PROFESSIONNEL manquant")
    if not has_dist:
        print("⚠️  Code DIST/DISTRIBUTION manquant")
    if not has_axes:
        print("⚠️  Code AXES manquant")
    
    if has_global and has_part and has_pro and has_dist and has_axes:
        print("✅ Tous les segments nécessaires sont présents")
        return True
    else:
        return False


def check_taches_mapping(session):
    """Vérifie que les tâches ont bien des flux/sens/segments définis."""
    print_section("4. Vérification du mapping des TÂCHES")
    
    # Compter les tâches totales
    total_taches = session.query(Tache).count()
    print(f"📊 Total de tâches: {total_taches}\n")
    
    # Compter les tâches avec flux/sens/segment NULL
    taches_sans_flux = session.query(Tache).filter(Tache.flux_id.is_(None)).count()
    taches_sans_sens = session.query(Tache).filter(Tache.sens_id.is_(None)).count()
    taches_sans_segment = session.query(Tache).filter(Tache.segment_id.is_(None)).count()
    
    print(f"⚠️  Tâches sans flux_id: {taches_sans_flux} ({taches_sans_flux/total_taches*100:.1f}%)")
    print(f"⚠️  Tâches sans sens_id: {taches_sans_sens} ({taches_sans_sens/total_taches*100:.1f}%)")
    print(f"⚠️  Tâches sans segment_id: {taches_sans_segment} ({taches_sans_segment/total_taches*100:.1f}%)")
    
    # Compter les tâches avec mapping complet
    taches_completes = session.query(Tache).filter(
        Tache.flux_id.isnot(None),
        Tache.sens_id.isnot(None),
        Tache.segment_id.isnot(None)
    ).count()
    
    print(f"\n✅ Tâches avec mapping complet: {taches_completes} ({taches_completes/total_taches*100:.1f}%)")
    
    # Afficher quelques exemples de tâches complètes
    if taches_completes > 0:
        print(f"\n📋 Exemples de tâches avec mapping complet (5 premières):\n")
        
        taches_sample = session.query(Tache).filter(
            Tache.flux_id.isnot(None),
            Tache.sens_id.isnot(None),
            Tache.segment_id.isnot(None)
        ).limit(5).all()
        
        for i, tache in enumerate(taches_sample, 1):
            flux = session.query(Flux).filter(Flux.id == tache.flux_id).first()
            sens = session.query(VolumeSens).filter(VolumeSens.id == tache.sens_id).first()
            segment = session.query(VolumeSegment).filter(VolumeSegment.id == tache.segment_id).first()
            
            print(f"{i}. {tache.nom_tache}")
            print(f"   → Flux: {flux.code if flux else 'N/A'} (ID: {tache.flux_id})")
            print(f"   → Sens: {sens.code if sens else 'N/A'} (ID: {tache.sens_id})")
            print(f"   → Segment: {segment.code if segment else 'N/A'} (ID: {tache.segment_id})")
            print(f"   → Unité: {tache.unite_mesure}, Chrono: {tache.moyenne_min or 0} min")
            print()
    
    # Afficher quelques exemples de tâches incomplètes
    taches_incompletes = total_taches - taches_completes
    if taches_incompletes > 0:
        print(f"\n⚠️  Exemples de tâches SANS mapping complet (5 premières):\n")
        
        taches_sample = session.query(Tache).filter(
            (Tache.flux_id.is_(None)) |
            (Tache.sens_id.is_(None)) |
            (Tache.segment_id.is_(None))
        ).limit(5).all()
        
        for i, tache in enumerate(taches_sample, 1):
            print(f"{i}. {tache.nom_tache}")
            print(f"   → flux_id: {tache.flux_id or 'NULL'}")
            print(f"   → sens_id: {tache.sens_id or 'NULL'}")
            print(f"   → segment_id: {tache.segment_id or 'NULL'}")
            print()
    
    return taches_completes > 0


def check_centre_postes(session):
    """Vérifie les centres/postes disponibles."""
    print_section("5. Vérification des CENTRES/POSTES")
    
    from app.models.db_models import CentrePoste, Centre, Poste
    
    # Compter les centres/postes
    total_cp = session.query(CentrePoste).count()
    print(f"📊 Total de centres/postes: {total_cp}\n")
    
    if total_cp == 0:
        print("⚠️  ATTENTION: Aucun centre/poste trouvé!")
        return False
    
    # Afficher quelques exemples
    print(f"📋 Exemples de centres/postes (5 premiers):\n")
    
    cp_sample = session.query(CentrePoste).limit(5).all()
    
    for i, cp in enumerate(cp_sample, 1):
        centre = session.query(Centre).filter(Centre.id == cp.centre_id).first()
        poste = session.query(Poste).filter(Poste.id == cp.poste_id).first()
        
        # Compter les tâches pour ce centre/poste
        nb_taches = session.query(Tache).filter(Tache.centre_poste_id == cp.id).count()
        nb_taches_completes = session.query(Tache).filter(
            Tache.centre_poste_id == cp.id,
            Tache.flux_id.isnot(None),
            Tache.sens_id.isnot(None),
            Tache.segment_id.isnot(None)
        ).count()
        
        print(f"{i}. Centre/Poste ID: {cp.id}")
        print(f"   → Centre: {centre.label if centre else 'N/A'} (ID: {cp.centre_id})")
        print(f"   → Poste: {poste.label if poste else 'N/A'} (ID: {cp.poste_id})")
        print(f"   → Tâches: {nb_taches} total, {nb_taches_completes} avec mapping complet")
        print()
    
    return True


def main():
    """Exécute toutes les vérifications."""
    print_section("🔍 VÉRIFICATION DES DONNÉES DE RÉFÉRENCE")
    
    try:
        # Créer une session
        db_url = get_db_url()
        engine = create_engine(db_url)
        SessionLocal = sessionmaker(bind=engine)
        session = SessionLocal()
        
        # Exécuter les vérifications
        results = {
            "flux": check_flux(session),
            "sens": check_sens(session),
            "segments": check_segments(session),
            "taches": check_taches_mapping(session),
            "centres_postes": check_centre_postes(session)
        }
        
        # Résumé
        print_section("📊 RÉSUMÉ")
        
        all_ok = all(results.values())
        
        for key, value in results.items():
            status = "✅" if value else "❌"
            print(f"{status} {key.upper()}: {'OK' if value else 'PROBLÈME DÉTECTÉ'}")
        
        print()
        
        if all_ok:
            print("✅ Toutes les vérifications sont passées avec succès!")
            print("   Vous pouvez utiliser la simulation directe.")
        else:
            print("⚠️  Certaines vérifications ont échoué.")
            print("   Veuillez corriger les problèmes avant d'utiliser la simulation directe.")
        
        session.close()
        
        return 0 if all_ok else 1
        
    except Exception as e:
        print(f"\n❌ Erreur lors de la vérification: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
