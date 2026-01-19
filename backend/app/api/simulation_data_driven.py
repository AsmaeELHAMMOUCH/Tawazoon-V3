# app/api/simulation_data_driven.py
"""
Endpoints API pour la simulation data-driven.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.db import get_db
from app.schemas.volumes_ui import VolumesUIInput
from app.schemas.models import SimulationResponse
from app.services.simulation_data_driven import (
    calculer_simulation_data_driven,
    calculer_simulation_centre_data_driven,
    calculer_simulation_multi_centres_data_driven
)
from app.models.db_models import CentrePoste, Centre
from app.services.data_driven_engine import DataDrivenEngine

router = APIRouter(prefix="/api/simulation-dd", tags=["Simulation Data-Driven"])


@router.post("/intervenant/{centre_poste_id}", response_model=SimulationResponse)
def simulate_intervenant_data_driven(
    centre_poste_id: int,
    volumes_ui: VolumesUIInput,
    productivite: float = Query(100.0, ge=0, le=200),
    heures_par_jour: float = Query(8.0, ge=0, le=24),
    idle_minutes: float = Query(0.0, ge=0, le=480),
    ed_percent: float = Query(0.0, ge=0, le=100),  # 🆕 Pourcentage "En Dehors"
    debug: bool = Query(False),
    db: Session = Depends(get_db)
):
    try:
        print(f"\n{'='*80}")
        print(f"🎯 [BACKEND - STEP 1] API INTERVENANT - Requête reçue")
        print(f"{'='*80}")
        print(f"   Centre/Poste ID: {centre_poste_id}")
        print(f"   Productivité: {productivite}%")
        print(f"   Heures/jour: {heures_par_jour}h")
        print(f"   Idle minutes: {idle_minutes} min")
        print(f"   Debug: {debug}")
        print(f"   Volumes UI reçus: {volumes_ui.dict()}")
        print(f"{'='*80}\n")
        
        print(f"📋 [BACKEND - STEP 2] Vérification du centre/poste ID={centre_poste_id}")
        # Vérifier que le centre/poste existe
        centre_poste = db.query(CentrePoste).filter(CentrePoste.id == centre_poste_id).first()
        if not centre_poste:
            print(f"❌ [BACKEND - STEP 2] Centre/Poste {centre_poste_id} non trouvé")
            raise HTTPException(status_code=404, detail=f"Centre/Poste {centre_poste_id} non trouvé")
        
        print(f"✅ [BACKEND - STEP 2] Centre/Poste trouvé: {centre_poste.centre.label if centre_poste.centre else 'N/A'} - {centre_poste.poste.label if centre_poste.poste else 'N/A'}")
        
        print(f"\n🔄 [BACKEND - STEP 3] Appel du service de calcul data-driven...")
        print(f"   ED%: {ed_percent}%")
        # Calculer la simulation
        result = calculer_simulation_data_driven(
            db=db,
            centre_poste_id=centre_poste_id,
            volumes_ui=volumes_ui,
            productivite=productivite,
            heures_par_jour=heures_par_jour,
            idle_minutes=idle_minutes,
            ed_percent=ed_percent,  # 🆕 Passage du paramètre ED%
            debug=debug
        )
        
        print(f"\n✅ [BACKEND - STEP 10] Résultat final calculé:")
        print(f"   ETP: {result.fte_arrondi}")
        print(f"   Heures totales: {result.total_heures}h")
        print(f"   Nombre de tâches: {len(result.details_taches)}")
        print(f"{'='*80}\n")
        
        return result
    except Exception as e:
        print(f"\n❌ [BACKEND - ERROR] Exception lors du traitement:")
        import traceback
        traceback.print_exc()
        raise e


@router.post("/centre/{centre_id}", response_model=SimulationResponse)
def simulate_centre_data_driven(
    centre_id: int,
    volumes_ui: VolumesUIInput,
    productivite: float = Query(100.0, ge=0, le=200),
    heures_par_jour: float = Query(8.0, ge=0, le=24),
    idle_minutes: float = Query(0.0, ge=0, le=480),
    ed_percent: float = Query(0.0, ge=0, le=100),  # 🆕 Paramètre ED%
    colis_amana_par_sac: float = Query(1.0, ge=0.1, le=1000), # 🆕 Paramètre Sacs
    debug: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Simulation pour un centre complet (tous les postes) avec le moteur data-driven.
    
    **Architecture 100% data-driven :**
    - Agrégation automatique de tous les postes du centre
    - Mapping et conversion pilotés par les tables de référence
    
    **Paramètres :**
    - `centre_id` : ID du centre
    - `volumes_ui` : Volumes annuels saisis dans l'UI
    - `productivite` : Productivité en % (défaut: 100%)
    - `heures_par_jour` : Heures de travail par jour (défaut: 8h)
    - `idle_minutes` : Marge d'inactivité en minutes/jour (défaut: 0)
    - `debug` : Activer les logs détaillés (défaut: false)
    
    **Retourne :**
    - Résultats agrégés pour le centre
    - ETP total calculé
    """
    
    print(f"\n{'='*80}")
    print(f"🏢 API CENTRE - Requête reçue")
    print(f"{'='*80}")
    print(f"   Centre ID: {centre_id}")
    print(f"   Productivité: {productivite}%")
    print(f"   Heures/jour: {heures_par_jour}h")
    print(f"   Idle minutes: {idle_minutes} min")
    print(f"   Debug: {debug}")
    print(f"   Volumes UI: {volumes_ui.dict()}")
    print(f"{'='*80}\n")
    
    # Vérifier que le centre existe
    centre = db.query(Centre).filter(Centre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail=f"Centre {centre_id} non trouvé")
    
    print(f"✅ Centre trouvé: {centre.label}")
    
    # Calculer la simulation
    return calculer_simulation_centre_data_driven(
        db=db,
        centre_id=centre_id,
        volumes_ui=volumes_ui,
        productivite=productivite,
        heures_par_jour=heures_par_jour,
        idle_minutes=idle_minutes,
        ed_percent=ed_percent,  # 🆕 Propagation du paramètre
        colis_amana_par_sac=colis_amana_par_sac, # 🆕 Propagation du paramètre
        debug=debug
    )


@router.post("/multi-centres", response_model=SimulationResponse)
def simulate_multi_centres_data_driven(
    centre_ids: List[int],
    volumes_ui: VolumesUIInput,
    productivite: float = Query(100.0, ge=0, le=200),
    heures_par_jour: float = Query(8.0, ge=0, le=24),
    idle_minutes: float = Query(0.0, ge=0, le=480),
    debug: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Simulation pour plusieurs centres (direction/national) avec le moteur data-driven.
    
    **Architecture 100% data-driven :**
    - Agrégation automatique de plusieurs centres
    - Scalable pour vue direction et vue nationale
    
    **Paramètres :**
    - `centre_ids` : Liste des IDs de centres (dans le body)
    - `volumes_ui` : Volumes annuels saisis dans l'UI
    - `productivite` : Productivité en % (défaut: 100%)
    - `heures_par_jour` : Heures de travail par jour (défaut: 8h)
    - `idle_minutes` : Marge d'inactivité en minutes/jour (défaut: 0)
    - `debug` : Activer les logs détaillés (défaut: false)
    
    **Retourne :**
    - Résultats agrégés pour tous les centres
    - ETP total calculé
    """
    
    if not centre_ids:
        raise HTTPException(status_code=400, detail="La liste centre_ids ne peut pas être vide")
    
    # Vérifier que tous les centres existent
    centres = db.query(Centre).filter(Centre.id.in_(centre_ids)).all()
    if len(centres) != len(centre_ids):
        raise HTTPException(status_code=404, detail="Un ou plusieurs centres non trouvés")
    
    # Calculer la simulation
    return calculer_simulation_multi_centres_data_driven(
        db=db,
        centre_ids=centre_ids,
        volumes_ui=volumes_ui,
        productivite=productivite,
        heures_par_jour=heures_par_jour,
        idle_minutes=idle_minutes,
        debug=debug
    )


@router.get("/test-mapping/{centre_poste_id}")
def test_mapping_data_driven(
    centre_poste_id: int,
    db: Session = Depends(get_db)
):
    """
    Teste le mapping data-driven pour un centre/poste.
    
    Retourne les informations de mapping pour toutes les tâches,
    sans effectuer de calcul.
    
    **Utile pour :**
    - Vérifier que les règles de mapping sont correctes
    - Débugger les problèmes de correspondance
    - Valider la configuration
    """
    
    from app.models.db_models import Tache
    
    # Vérifier que le centre/poste existe
    centre_poste = db.query(CentrePoste).filter(CentrePoste.id == centre_poste_id).first()
    if not centre_poste:
        raise HTTPException(status_code=404, detail=f"Centre/Poste {centre_poste_id} non trouvé")
    
    # Récupérer les tâches
    taches = db.query(Tache).filter(Tache.centre_poste_id == centre_poste_id).all()
    
    # Créer le moteur
    engine = DataDrivenEngine(db)
    
    # Tester le mapping pour chaque tâche
    results = []
    
    for tache in taches:
        # Trouver la règle
        rule = engine.find_matching_rule(tache)
        
        # Récupérer les codes
        codes = engine.get_reference_codes(tache)
        
        # Récupérer le facteur de conversion
        facteur_conv = engine.get_conversion_factor(tache.unite_mesure)
        
        results.append({
            "tache_id": tache.id,
            "nom_tache": tache.nom_tache,
            "unite_mesure": tache.unite_mesure,
            "flux": codes["flux"],
            "sens": codes["sens"],
            "segment": codes["segment"],
            "mapping_found": rule is not None,
            "ui_path": rule.ui_path if rule else None,
            "priority": rule.priority if rule else None,
            "facteur_conversion": facteur_conv,
            "description": rule.description if rule else "Aucune règle trouvée"
        })
    
    return {
        "centre_poste_id": centre_poste_id,
        "centre_label": centre_poste.centre.label if centre_poste.centre else "N/A",
        "poste_label": centre_poste.poste.label if centre_poste.poste else "N/A",
        "nombre_taches": len(taches),
        "taches_avec_mapping": sum(1 for r in results if r["mapping_found"]),
        "taches_sans_mapping": sum(1 for r in results if not r["mapping_found"]),
        "details": results
    }


@router.get("/mapping-rules")
def list_mapping_rules(
    db: Session = Depends(get_db)
):
    """
    Liste toutes les règles de mapping configurées.
    
    **Utile pour :**
    - Voir la configuration actuelle
    - Documenter les règles
    - Vérifier la cohérence
    """
    
    from app.models.mapping_models import VolumeMappingRule
    
    rules = db.query(VolumeMappingRule).order_by(VolumeMappingRule.priority.desc()).all()
    
    return {
        "total_rules": len(rules),
        "rules": [
            {
                "id": rule.id,
                "flux_id": rule.flux_id,
                "sens_id": rule.sens_id,
                "segment_id": rule.segment_id,
                "nom_tache_keyword": rule.nom_tache_keyword,
                "ui_path": rule.ui_path,
                "priority": rule.priority,
                "description": rule.description
            }
            for rule in rules
        ]
    }


@router.get("/conversion-rules")
def list_conversion_rules(
    db: Session = Depends(get_db)
):
    """
    Liste toutes les règles de conversion d'unités configurées.
    
    **Utile pour :**
    - Voir les facteurs de conversion
    - Vérifier la configuration
    - Documenter les règles métier
    """
    
    from app.models.mapping_models import UniteConversionRule
    
    rules = db.query(UniteConversionRule).all()
    
    return {
        "total_rules": len(rules),
        "rules": [
            {
                "id": rule.id,
                "unite_mesure": rule.unite_mesure,
                "facteur_conversion": rule.facteur_conversion,
                "description": rule.description
            }
            for rule in rules
        ]
    }


@router.get("/coverage/{centre_poste_id}")
def analyze_mapping_coverage(
    centre_poste_id: int,
    db: Session = Depends(get_db)
):
    """
    Analyse la couverture des règles de mapping pour un centre/poste.
    
    **Retourne :**
    - Nombre total de tâches
    - Nombre de tâches avec règle de mapping
    - Nombre de tâches avec volume = 0 (règle existe mais pas de données)
    - Liste des tâches sans règle
    - Liste des ui_path manquants dans le payload
    
    **Utile pour :**
    - Déboguer les problèmes de mapping
    - Identifier les règles manquantes
    - Vérifier la complétude du payload UI
    """
    
    from app.models.db_models import Tache
    
    # Vérifier que le centre/poste existe
    centre_poste = db.query(CentrePoste).filter(CentrePoste.id == centre_poste_id).first()
    if not centre_poste:
        raise HTTPException(status_code=404, detail=f"Centre/Poste {centre_poste_id} non trouvé")
    
    # Récupérer toutes les tâches
    taches = db.query(Tache).filter(Tache.centre_poste_id == centre_poste_id).all()
    
    # Créer le moteur
    engine = DataDrivenEngine(db)
    
    # Analyser chaque tâche
    taches_avec_regle = []
    taches_sans_regle = []
    ui_paths_requis = set()
    
    for tache in taches:
        rule = engine.find_matching_rule(tache)
        codes = engine.get_reference_codes(tache)
        
        if rule:
            taches_avec_regle.append({
                "tache_id": tache.id,
                "nom_tache": tache.nom_tache,
                "flux": codes["flux"],
                "sens": codes["sens"],
                "segment": codes["segment"],
                "ui_path": rule.ui_path,
                "priority": rule.priority
            })
            ui_paths_requis.add(rule.ui_path)
        else:
            taches_sans_regle.append({
                "tache_id": tache.id,
                "nom_tache": tache.nom_tache,
                "flux": codes["flux"],
                "sens": codes["sens"],
                "segment": codes["segment"],
                "flux_id": tache.flux_id,
                "sens_id": tache.sens_id,
                "segment_id": tache.segment_id
            })
    
    # Calculer les statistiques
    nb_total = len(taches)
    nb_avec_regle = len(taches_avec_regle)
    nb_sans_regle = len(taches_sans_regle)
    taux_couverture = (nb_avec_regle / nb_total * 100) if nb_total > 0 else 0
    
    return {
        "centre_poste_id": centre_poste_id,
        "centre_label": centre_poste.centre.label if centre_poste.centre else "N/A",
        "poste_label": centre_poste.poste.label if centre_poste.poste else "N/A",
        "statistiques": {
            "nb_taches_total": nb_total,
            "nb_taches_avec_regle": nb_avec_regle,
            "nb_taches_sans_regle": nb_sans_regle,
            "taux_couverture": round(taux_couverture, 2)
        },
        "taches_sans_regle": taches_sans_regle,
        "ui_paths_requis": sorted(list(ui_paths_requis)),
        "recommandations": [
            f"Ajouter {nb_sans_regle} règles de mapping pour couvrir toutes les tâches" if nb_sans_regle > 0 else "Toutes les tâches ont une règle de mapping",
            f"Vérifier que le payload UI contient les champs : {', '.join(sorted(ui_paths_requis))}" if ui_paths_requis else "Aucun champ UI requis"
        ]
    }


@router.get("/debug/compare-totals/{centre_id}")
def debug_compare_totals(
    centre_id: int,
    db: Session = Depends(get_db)
):
    """
    Endpoint de DEBUG pour comparer le calcul 'Centre' vs 'Somme des Postes'.
    """
    # Payload HARDCODÉ pour reproduire le cas utilisateur
    volumes_payload = {
        "volumes_flux": [
            {'flux': 'AMANA', 'sens': 'ARRIVEE', 'segment': 'PROFESSIONNEL', 'volume': 92520.0},
            {'flux': 'AMANA', 'sens': 'ARRIVEE', 'segment': 'PARTICULIER', 'volume': 17397.0},
            {'flux': 'AMANA', 'sens': 'DEPART', 'segment': 'PROFESSIONNEL', 'volume': 20236.0},
            {'flux': 'AMANA', 'sens': 'DEPART', 'segment': 'PARTICULIER', 'volume': 1615.0},
            {'flux': 'AMANA', 'sens': 'DEPOT', 'segment': 'GLOBAL', 'volume': 21851.0},
            {'flux': 'AMANA', 'sens': 'RECUPERATION', 'segment': 'GLOBAL', 'volume': 109917.0},
            {'flux': 'CO', 'sens': 'ARRIVEE', 'segment': 'GLOBAL', 'volume': 1043148.0},
            {'flux': 'CO', 'sens': 'DEPART', 'segment': 'GLOBAL', 'volume': 678150.0},
            {'flux': 'CR', 'sens': 'ARRIVEE', 'segment': 'GLOBAL', 'volume': 22335.0},
            {'flux': 'CR', 'sens': 'DEPART', 'segment': 'GLOBAL', 'volume': 23701.0},
            {'flux': 'EB', 'sens': 'ARRIVEE', 'segment': 'GLOBAL', 'volume': 72373.0},
            {'flux': 'EB', 'sens': 'DEPART', 'segment': 'GLOBAL', 'volume': 72373.0}
        ],
        "nb_jours_ouvres_an": 264,
        "colis_amana_par_sac": 10.0,
        "courriers_par_sac": 5000.0,
        "courriers_co_par_sac": 4500.0,
        "courriers_cr_par_sac": 500.0,
        "cr_par_caisson": 500.0,
        "pct_axes_arrivee": 0.3, # 30%
        "pct_axes_depart": 0.3, # 30%
        "pct_collecte": 5.0
    }
    
    volumes_ui = VolumesUIInput(**volumes_payload)
    
    # Paramètres globaux
    productivite = 100.0
    heures_par_jour = 8.0
    idle_minutes = 0.0
    ed_percent = 0.0
    colis_amana_par_sac = 10.0

    # 1. Simulation CENTRE GLOBAL
    print("\\n--- DEBUG AGREGATION: CALCUL VUE CENTRE ---")
    res_centre = calculer_simulation_centre_data_driven(
        db=db,
        centre_id=centre_id,
        volumes_ui=volumes_ui,
        productivite=productivite,
        heures_par_jour=heures_par_jour,
        idle_minutes=idle_minutes,
        ed_percent=ed_percent,
        colis_amana_par_sac=colis_amana_par_sac,
        debug=True
    )

    # 2. Simulation POSTE par POSTE (Somme manuelle)
    print("\\n--- DEBUG AGREGATION: CALCUL PROFIL INTERVENANT (SOMME) ---")
    centre_postes = db.query(CentrePoste).filter(CentrePoste.centre_id == centre_id).all()
    
    total_heures_sum = 0.0
    liste_ecarts = []
    
    for cp in centre_postes:
        res_poste = calculer_simulation_data_driven(
            db=db,
            centre_poste_id=cp.id,
            volumes_ui=volumes_ui,
            productivite=productivite,
            heures_par_jour=heures_par_jour,
            idle_minutes=idle_minutes,
            ed_percent=ed_percent,
            debug=False
        )
        total_heures_sum += res_poste.total_heures
        
        # Comparer avec le résultat unitaire dans res_centre
        heures_centre = res_centre.heures_par_poste.get(cp.id, 0.0)
        diff = heures_centre - res_poste.total_heures
        
        if abs(diff) > 0.001:
            nom_poste = cp.poste.label if cp.poste else f"Poste {cp.id}"
            liste_ecarts.append({
                "centre_poste_id": cp.id,
                "poste": nom_poste,
                "heures_vue_centre": heures_centre,
                "heures_vue_intervenant": res_poste.total_heures,
                "diff": diff
            })

    heures_net = max(0.0, heures_par_jour - (idle_minutes / 60))
    etp_centre = res_centre.total_heures / heures_net if heures_net > 0 else 0
    etp_sum = total_heures_sum / heures_net if heures_net > 0 else 0

    return {
        "centre_id": centre_id,
        "ETP_VUE_CENTRE": etp_centre,
        "ETP_VUE_INTERVENANT_SOMME": etp_sum,
        "DIFF_ETP": etp_centre - etp_sum,
        "DIFF_HEURES": res_centre.total_heures - total_heures_sum,
        "ECARTS_DETAILLES": liste_ecarts
    }
