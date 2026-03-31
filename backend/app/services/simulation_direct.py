# app/services/simulation_direct.py
"""
Service de simulation DIRECT (sans table VolumeSimulation).
Utilise le VolumeMapper pour affecter automatiquement les volumes UI aux tâches.
"""
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from app.schemas.volumes_ui import VolumesUIInput, VolumeTaskMapping
from app.schemas.models import SimulationResponse, TacheDetail
from app.models.db_models import Tache, CentrePoste, Poste
from app.services.volume_mapper import VolumeMapper
from app.services.utils import round_half_up


def calculer_simulation_direct(
    db: Session,
    centre_poste_id: int,
    volumes_ui: VolumesUIInput,
    productivite: float = 100.0,
    heures_par_jour: float = 8.5,
    idle_minutes: float = 0.0,
    debug: bool = True
) -> SimulationResponse:
    """
    Calcule la simulation directement à partir des volumes UI,
    sans passer par la table VolumeSimulation.
    
    Args:
        db: Session SQLAlchemy
        centre_poste_id: ID du centre/poste concerné
        volumes_ui: Volumes saisis dans l'UI (annuels)
        productivite: Productivité en % (défaut: 100%)
        heures_par_jour: Heures de travail par jour (défaut: 8h)
        idle_minutes: Marge d'inactivité en minutes/jour (défaut: 0)
        debug: Activer les logs de debug (défaut: True)
    
    Returns:
        SimulationResponse avec les résultats calculés
    """
    
    # 1. Créer le mapper de volumes
    mapper = VolumeMapper(db)
    
    # 2. Récupérer toutes les tâches du centre/poste
    taches = db.query(Tache).filter(
        Tache.centre_poste_id == centre_poste_id
    ).all()
    
    if debug:
        print(f"\n{'='*80}")
        print(f"🔹 SIMULATION DIRECTE - Centre/Poste ID: {centre_poste_id}")
        print(f"{'='*80}")
        print(f"📊 Paramètres:")
        print(f"   - Productivité: {productivite}%")
        print(f"   - Heures/jour: {heures_par_jour}h")
        print(f"   - Marge inactivité: {idle_minutes} min/jour")
        print(f"   - Jours ouvrés/an: {volumes_ui.nb_jours_ouvres_an}")
        print(f"   - Nombre de tâches: {len(taches)}")
        print(f"{'='*80}\n")
    
    # 3. Calculer les heures nettes (après marge d'inactivité)
    idle_heures = idle_minutes / 60.0
    heures_nettes = max(0.0, heures_par_jour - idle_heures)
    
    # Ajuster selon la productivité
    heures_nettes_effectives = heures_nettes * (productivite / 100.0)
    
    if debug:
        print(f"⏱️  Heures nettes effectives:")
        print(f"   - Heures brutes: {heures_par_jour}h")
        print(f"   - Marge inactivité: {idle_heures:.2f}h")
        print(f"   - Heures nettes: {heures_nettes:.2f}h")
        print(f"   - Productivité: {productivite}%")
        print(f"   - Heures nettes effectives: {heures_nettes_effectives:.2f}h\n")
    
    # 4. Traiter chaque tâche
    details_taches: List[TacheDetail] = []
    heures_par_poste: Dict[int, float] = {}
    total_heures = 0.0
    mappings_debug: List[VolumeTaskMapping] = []
    
    taches_traitees = 0
    taches_ignorees = 0
    
    for tache in taches:
        # Résoudre le volume/jour pour cette tâche
        volume_jour, source_ui = mapper.resolve_volume_jour(tache, volumes_ui)
        
        # Si le volume est 0, ignorer la tâche
        if volume_jour <= 0:
            taches_ignorees += 1
            if debug:
                flux_code = mapper.get_flux_code(tache.flux_id)
                sens_code = mapper.get_sens_code(tache.sens_id)
                segment_code = mapper.get_segment_code(tache.segment_id)
                print(f"⚠️  Tâche ignorée (volume=0): {tache.nom_tache}")
                print(f"    → flux={flux_code}, sens={sens_code}, segment={segment_code}")
                print(f"    → source: {source_ui}\n")
            continue
        
        # Récupérer le chrono moyen (en minutes)
        moyenne_min = float(tache.moyenne_min or 0.0)
        
        if moyenne_min <= 0:
            taches_ignorees += 1
            if debug:
                print(f"⚠️  Tâche ignorée (chrono=0): {tache.nom_tache}")
                print(f"    → volume_jour={volume_jour:.2f}\n")
            continue
        
        # Calculer les heures nécessaires
        minutes_cumulees = moyenne_min * volume_jour
        heures_calculees = minutes_cumulees / 60.0
        total_heures += heures_calculees
        
        # Récupérer le centre_poste pour grouper
        cp_id = tache.centre_poste_id
        heures_par_poste[cp_id] = heures_par_poste.get(cp_id, 0.0) + heures_calculees
        
        # Créer le détail de la tâche
        details_taches.append(
            TacheDetail(
                task=tache.nom_tache,
                phase=tache.phase or "N/A",
                unit=tache.unite_mesure,
                avg_sec=moyenne_min * 60.0,
                heures=round(heures_calculees, 2),
                nombre_unite=volume_jour,
                poste_id=tache.centre_poste.poste_id if tache.centre_poste else None,
                centre_poste_id=cp_id
            )
        )
        
        # Debug mapping
        if debug:
            flux_code = mapper.get_flux_code(tache.flux_id)
            sens_code = mapper.get_sens_code(tache.sens_id)
            segment_code = mapper.get_segment_code(tache.segment_id)
            
            volume_annuel = volume_jour * volumes_ui.nb_jours_ouvres_an
            
            mappings_debug.append(
                VolumeTaskMapping(
                    tache_id=tache.id,
                    nom_tache=tache.nom_tache,
                    flux_code=flux_code,
                    sens_code=sens_code,
                    segment_code=segment_code,
                    volume_annuel=volume_annuel,
                    volume_jour=volume_jour,
                    source_ui=source_ui
                )
            )
            
            print(f"✅ Tâche traitée: {tache.nom_tache}")
            print(f"    → flux={flux_code}, sens={sens_code}, segment={segment_code}")
            print(f"    → volume_annuel={volume_annuel:.2f}, volume_jour={volume_jour:.2f}")
            print(f"    → chrono={moyenne_min:.2f} min")
            print(f"    → heures={heures_calculees:.4f}h")
            print(f"    → source: {source_ui}\n")
        
        taches_traitees += 1
    
    # 5. Calculer l'ETP
    fte_calcule = total_heures / heures_nettes_effectives if heures_nettes_effectives > 0 else 0.0
    
    # Arrondi métier
    if fte_calcule <= 0.1:
        fte_arrondi = 0
    else:
        fte_arrondi = round_half_up(fte_calcule)
    
    if debug:
        print(f"\n{'='*80}")
        print(f"📊 RÉSULTATS DE LA SIMULATION")
        print(f"{'='*80}")
        print(f"   - Tâches traitées: {taches_traitees}")
        print(f"   - Tâches ignorées: {taches_ignorees}")
        print(f"   - Total heures nécessaires: {total_heures:.2f}h")
        print(f"   - Heures nettes effectives: {heures_nettes_effectives:.2f}h")
        print(f"   - ETP calculé: {fte_calcule:.2f}")
        print(f"   - ETP arrondi: {fte_arrondi}")
        print(f"{'='*80}\n")
        
        # Afficher les 5 premiers mappings pour debug
        print(f"🔍 ÉCHANTILLON DE MAPPINGS (5 premières tâches):")
        for i, mapping in enumerate(mappings_debug[:5], 1):
            print(f"\n{i}. {mapping.nom_tache}")
            print(f"   → ID: {mapping.tache_id}")
            print(f"   → Flux: {mapping.flux_code}, Sens: {mapping.sens_code}, Segment: {mapping.segment_code}")
            print(f"   → Volume annuel: {mapping.volume_annuel:.2f}")
            print(f"   → Volume/jour: {mapping.volume_jour:.2f}")
            print(f"   → Source UI: {mapping.source_ui}")
        print(f"\n{'='*80}\n")
    
    return SimulationResponse(
        details_taches=details_taches,
        total_heures=round(total_heures, 2),
        heures_net_jour=round(heures_nettes_effectives, 2),
        fte_calcule=round(fte_calcule, 2),
        fte_arrondi=fte_arrondi,
        heures_par_poste=heures_par_poste
    )


def calculer_simulation_multi_centres(
    db: Session,
    centre_poste_ids: List[int],
    volumes_ui: VolumesUIInput,
    productivite: float = 100.0,
    heures_par_jour: float = 8.5,
    idle_minutes: float = 0.0,
    debug: bool = False
) -> SimulationResponse:
    """
    Calcule la simulation pour plusieurs centres/postes (agrégation).
    Utilisé pour VueCentre, VueDirection, VueNationale.
    
    Args:
        db: Session SQLAlchemy
        centre_poste_ids: Liste des IDs centre/poste à agréger
        volumes_ui: Volumes saisis dans l'UI (annuels)
        productivite: Productivité en % (défaut: 100%)
        heures_par_jour: Heures de travail par jour (défaut: 8h)
        idle_minutes: Marge d'inactivité en minutes/jour (défaut: 0)
        debug: Activer les logs de debug (défaut: False)
    
    Returns:
        SimulationResponse avec les résultats agrégés
    """
    
    # Agréger les résultats de tous les centres/postes
    all_details: List[TacheDetail] = []
    all_heures_par_poste: Dict[int, float] = {}
    total_heures_global = 0.0
    
    for cp_id in centre_poste_ids:
        result = calculer_simulation_direct(
            db=db,
            centre_poste_id=cp_id,
            volumes_ui=volumes_ui,
            productivite=productivite,
            heures_par_jour=heures_par_jour,
            idle_minutes=idle_minutes,
            debug=debug
        )
        
        all_details.extend(result.details_taches)
        total_heures_global += result.total_heures
        
        for poste_id, heures in result.heures_par_poste.items():
            all_heures_par_poste[poste_id] = all_heures_par_poste.get(poste_id, 0.0) + heures
    
    # Calculer l'ETP global
    idle_heures = idle_minutes / 60.0
    heures_nettes = max(0.0, heures_par_jour - idle_heures)
    heures_nettes_effectives = heures_nettes * (productivite / 100.0)
    
    fte_calcule = total_heures_global / heures_nettes_effectives if heures_nettes_effectives > 0 else 0.0
    
    if fte_calcule <= 0.1:
        fte_arrondi = 0
    else:
        fte_arrondi = round_half_up(fte_calcule)
    
    return SimulationResponse(
        details_taches=all_details,
        total_heures=round(total_heures_global, 2),
        heures_net_jour=round(heures_nettes_effectives, 2),
        fte_calcule=round(fte_calcule, 2),
        fte_arrondi=fte_arrondi,
        heures_par_poste=all_heures_par_poste
    )
