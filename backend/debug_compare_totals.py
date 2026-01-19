
import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ajouter le dossier courant (où se trouve app)
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.db import DATABASE_URL
from app.models.db_models import Centre, CentrePoste, Tache, Poste
from app.services.simulation_data_driven import calculer_simulation_data_driven, calculer_simulation_centre_data_driven
from app.schemas.volumes_ui import VolumesUIInput, VolumeFlux_Input

# Config DB
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def run_comparison(centre_id=2064):
    print(f"--- COMPARAISON SIMULATION CENTRE {centre_id} ---")
    
    # Payload reconstruit d'après les logs
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
    params = {
        "productivite": 100.0,
        "heures_par_jour": 8.0,
        "idle_minutes": 0.0,
        "ed_percent": 0.0,
        "colis_amana_par_sac": 10.0,
        "debug": False
    }

    # 1. Simulation CENTRE GLOBAL
    print("\n1. Simulation CENTRE (Global)...")
    try:
        res_centre = calculer_simulation_centre_data_driven(
            db=db,
            centre_id=centre_id,
            volumes_ui=volumes_ui,
            **params
        )
        print(f"   ETP CENTRE = {res_centre.fte_calcule:.4f}")
        print(f"   Heures Totales = {res_centre.total_heures:.2f}")
    except Exception as e:
        print(f"ERREUR CENTRE: {e}")
        return

    # 2. Simulation POSTE par POSTE (Somme)
    print("\n2. Simulation POSTE par POSTE (Somme)...")
    centre_postes = db.query(CentrePoste).filter(CentrePoste.centre_id == centre_id).all()
    
    total_heures_sum = 0.0
    details_postes = {}
    
    for cp in centre_postes:
        res_poste = calculer_simulation_data_driven(
            db=db,
            centre_poste_id=cp.id,
            volumes_ui=volumes_ui,
            productivite=100.0,
            heures_par_jour=8.0,
            idle_minutes=0.0,
            ed_percent=0.0,
            debug=False
        )
        total_heures_sum += res_poste.total_heures
        details_postes[cp.id] = res_poste.total_heures
        
        # Comparer avec le résultat unitaire dans res_centre
        heures_centre = res_centre.heures_par_poste.get(cp.id, 0.0)
        diff = heures_centre - res_poste.total_heures
        
        nom_poste = cp.poste.label if cp.poste else f"Poste {cp.id}"
        
        if abs(diff) > 0.001:
            print(f"   ⚠️ ÉCART SUR {cp.id} ({nom_poste}): Centre={heures_centre:.2f} vs Poste={res_poste.total_heures:.2f} (Diff={diff:.2f})")
        else:
             # print(f"   ✅ OK {cp.id} ({nom_poste}): {heures_centre:.2f}")
             pass

    etp_sum = total_heures_sum / 8.0
    print(f"\n   ETP SOMME = {etp_sum:.4f}")
    print(f"   Heures Somme = {total_heures_sum:.2f}")
    
    print(f"\n--- CONCLUSION ---")
    print(f"Différence ETP: {res_centre.fte_calcule - etp_sum:.4f}")
    print(f"Différence Heures: {res_centre.total_heures - total_heures_sum:.2f}")

if __name__ == "__main__":
    run_comparison()
