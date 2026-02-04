import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from unittest.mock import MagicMock
from app.services.cndp_engine import (
    calculate_task_duration, 
    CNDPInputVolumes, 
    CNDPParameters,
    run_cndp_simulation
)
from app.models.db_models import Tache, CentrePoste, Poste

def test_cndp_logic():
    print("Starting CNDP Logic Verification...")
    
    # 1. Setup Mock Objects
    volumes = CNDPInputVolumes(amana_import=1000, amana_export=500)
    params = CNDPParameters(
        pct_sac=100, 
        colis_par_sac=1, 
        nb_jours_ouvres_an=1, 
        shift=1,
        pct_international=100,
        pct_national=100
    )
    
    # Mock Tache: Normal Task
    tache_normal = MagicMock(spec=Tache)
    tache_normal.id = 1
    tache_normal.nom_tache = "Tri Normal"
    tache_normal.unite_mesure = "COLIS"
    tache_normal.produit = "IMPORT"
    tache_normal.moy_sec = 60 # 1 minute
    tache_normal.phase = None
    tache_normal.centre_poste = MagicMock(spec=CentrePoste)
    tache_normal.centre_poste.code_resp = "TRIEUR"
    
    # Test Normal
    res = calculate_task_duration(tache_normal, volumes, params)
    print("Normal Task: " + str(res.heures_calculees) + "h (Expect 16.67h)")
    
    # 2. Test Shift Multiplier
    params_shift2 = CNDPParameters(nb_jours_ouvres_an=1, shift=2)
    poste_map = {"MANUT": "MANUTENTIONNAIRE"}
    
    tache_manut = MagicMock(spec=Tache)
    tache_manut.id = 2
    tache_manut.nom_tache = "Dechargement"
    tache_manut.unite_mesure = "CAMION"
    tache_manut.produit = "IMPORT"
    tache_manut.moy_sec = 3600 # 1 hour
    tache_manut.phase = None
    tache_manut.centre_poste = MagicMock(spec=CentrePoste)
    tache_manut.centre_poste.code_resp = "MANUT"
    
    res_shift1 = calculate_task_duration(tache_manut, volumes, params, poste_map)
    res_shift2 = calculate_task_duration(tache_manut, volumes, params_shift2, poste_map)
    
    print("Shift 1: " + str(res_shift1.heures_calculees) + "h")
    print("Shift 2: " + str(res_shift2.heures_calculees) + "h")
    assert res_shift2.heures_calculees == res_shift1.heures_calculees * 2
    print("Shift Logic Verified!")
    
    # 3. Test International Multiplier
    tache_intl = MagicMock(spec=Tache)
    tache_intl.id = 3
    tache_intl.nom_tache = "Tri Intl"
    tache_intl.unite_mesure = "COLIS"
    tache_intl.produit = "IMPORT"
    tache_intl.moy_sec = 60
    tache_intl.phase = "international"
    tache_intl.centre_poste = MagicMock(spec=CentrePoste)
    tache_intl.centre_poste.code_resp = "TRIEUR"
    
    params_intl50 = CNDPParameters(nb_jours_ouvres_an=1, pct_international=50, pct_national=100)
    res_intl100 = calculate_task_duration(tache_intl, volumes, params)
    res_intl50 = calculate_task_duration(tache_intl, volumes, params_intl50)
    
    print("Intl 100%: " + str(res_intl100.heures_calculees) + "h")
    print("Intl 50%: " + str(res_intl50.heures_calculees) + "h")
    assert round(res_intl50.heures_calculees, 4) == round(res_intl100.heures_calculees * 0.5, 4)
    print("International Logic Verified!")

    # 4. Test National Multiplier
    tache_natl = MagicMock(spec=Tache)
    tache_natl.id = 4
    tache_natl.nom_tache = "Tri Natl"
    tache_natl.unite_mesure = "COLIS"
    tache_natl.produit = "IMPORT"
    tache_natl.moy_sec = 60
    tache_natl.phase = "national"
    tache_natl.centre_poste = MagicMock(spec=CentrePoste)
    tache_natl.centre_poste.code_resp = "TRIEUR"
    
    params_natl70 = CNDPParameters(nb_jours_ouvres_an=1, pct_international=100, pct_national=70)
    res_natl100 = calculate_task_duration(tache_natl, volumes, params)
    res_natl70 = calculate_task_duration(tache_natl, volumes, params_natl70)
    
    print("Natl 100%: " + str(res_natl100.heures_calculees) + "h")
    print("Natl 70%: " + str(res_natl70.heures_calculees) + "h")
    assert round(res_natl70.heures_calculees, 4) == round(res_natl100.heures_calculees * 0.7, 4)
    print("National Logic Verified!")

    print("\nALL BACKEND LOGIC VERIFIED!")

if __name__ == "__main__":
    test_cndp_logic()
