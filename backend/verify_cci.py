
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from unittest.mock import MagicMock
from app.services.simulation_CCI import calculate_cci_simulation
from app.schemas.models import SimulationRequest, VolumeItemUI

def run_verification():
    print("Starting CCI Verification...")

    # 1. Mock Request
    request = SimulationRequest(
        centre_id=1952,
        productivite=100.0,
        idle_minutes=60.0, # Capacité Nette = (480-60)/60 = 7.0h
        volumes_ui=[
            VolumeItemUI(flux="CO", sens="IMPORT", segment="GLOBAL", volume=92400.0), # /12/22 = 350
            VolumeItemUI(flux="CR", sens="EXPORT", segment="GLOBAL", volume=26400.0)  # /12/22 = 100
        ],
        nbr_courrier_liasse=50.0
    )

    # 2. Mock DB Data
    # Row structure: (Tache, CentrePoste, Poste)
    
    # Task 1: CO IMPORT (350 vol applied)
    # Unite=SAC (div/4500) -> 350/4500 = 0.077 sac
    # Moy=10 min
    # Heures = (0.077 * 10) / 60 = 0.012 h
    t1 = MagicMock()
    t1.id = 1
    t1.nom_tache = "Sort CO Import"
    t1.famille_uo = "CO"
    t1.produit = "IMPORT"
    t1.unite_mesure = "SAC"
    t1.moyenne_min = 10.0
    t1.base_calcul = 100
    t1.phase = "TRI"

    # Task 2: CR EXPORT (100 vol applied)
    # Unite=LIASSE (div/50) -> 100/50 = 2 liasses
    # Moy=5 min
    # Heures = (2 * 5) / 60 = 0.166 h
    t2 = MagicMock()
    t2.id = 2
    t2.nom_tache = "Scan CR Export"
    t2.famille_uo = "CR"
    t2.produit = "EXPORT"
    t2.unite_mesure = "LIASSE"
    t2.moyenne_min = 5.0
    t2.base_calcul = 100
    t2.phase = "TRI"
    
    # CentrePoste / Poste
    cp1 = MagicMock()
    cp1.id = 101
    cp1.effectif_actuel = 1.0
    
    p1 = MagicMock()
    p1.id = 201
    p1.label = "AGENT TRI"
    p1.code = "AGT"
    p1.type_poste = "MOD"

    # Mock DB Query
    mock_db = MagicMock()
    # Chain: query().join().join().filter().all()
    mock_query = mock_db.query.return_value
    mock_query.join.return_value = mock_query
    mock_query.filter.return_value = mock_query
    mock_query.all.return_value = [
        (t1, cp1, p1),
        (t2, cp1, p1)
    ]

    # 3. Validations attendues
    # Cap Nette = 7.0 h
    # T1 VolJour = 92400/12/22 = 350
    # T1 VolApplique = 350 / 4500 = 0.07777..
    # T1 Heures = (0.0777.. * 10) / 60 = 0.01296..
    
    # T2 VolJour = 26400/12/22 = 100
    # T2 VolApplique = 100 / 50 = 2.0
    # T2 Heures = (2.0 * 5) / 60 = 0.16666..
    
    # Total Heures = ~0.1796
    # ETP = 0.1796 / 7.0 = 0.0256
    
    print("Running Calculation...")
    try:
        response = calculate_cci_simulation(mock_db, request)
        
        print(f"Calculation Success!")
        print(f"   Total Heures: {response.total_heures}")
        print(f"   FTE Calcule: {response.fte_calcule}")
        print(f"   Capacite Nette: {response.heures_net_jour}")
        
        for t in response.details_taches:
            print(f"   - Tache {t.task}: Vol={t.nombre_unite}, Heures={t.heures}, Formule={t.formule}")
            
    except Exception as e:
        print(f"Calculation Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_verification()
