
import sys
import os
from typing import Dict, Any, List

# Add backend to sys.path
sys.path.append(os.getcwd())

from app.services.simulation import calculer_simulation, safe_float
from app.schemas.models import VolumesInput

def run_test():
    print("--- START DEBUG REPRO ---")

    # 1. Mock Data matches what API would produce
    # Taches with ID-based structure (new mode)
    taches_mock = [
        {
            "id": 101,
            "nom_tache": "Réception courrier",
            "phase": "Réception",
            "unite_mesure": "courrier",
            "moyenne_min": 1.5,
            "centre_poste_id": "CP_1",
            "flux_id": 1,     # Flux AMANA
            "sens_id": 10,    # ARRIVEE
            "segment_id": 100 # GLOBAL
        },
        {
            "id": 102,
            "nom_tache": "Tri Colis",
            "phase": "Tri",
            "unite_mesure": "colis",
            "moyenne_min": 2.0,
            "centre_poste_id": "CP_1",
            "flux_id": 1,     # AMANA
            "sens_id": 10,    # ARRIVEE
            "segment_id": 100 # GLOBAL
        }
    ]

    # 2. Mock Volumes Request (New Mode)
    # Simulate a request where we pass volumes_flux
    volumes_flux_ids = [
        {"flux_id": 1, "sens_id": 10, "segment_id": 100, "volume": 120}
    ]

    # 3. Simulate "Legacy" None values that might crash
    volumes_obj = VolumesInput(
        colis=None, # Should default to 0
        sacs=None,
        courriers_par_sac=None, # Should default to 4500.0 via safe_float logic
        colis_amana_par_sac=None
    )

    with open("debug_output.txt", "w", encoding="utf-8") as f:
        f.write("--- START DEBUG REPRO ---\n")
        f.write(f"Testing with volumes_flux: {volumes_flux_ids}\n")
        
        try:
            result = calculer_simulation(
                taches=taches_mock,
                volumes=volumes_obj,
                productivite=100.0,
                heures_net_input=None,
                idle_minutes=None,
                volumes_annuels=None,
                volumes_mensuels=None,
                volumes_flux=volumes_flux_ids
            )
            
            f.write("\n--- RESULTAT SUCCESS ---\n")
            f.write(f"Total Heures: {result.total_heures}\n")
            f.write(f"FTE Calcule: {result.fte_calcule}\n")
            f.write("Details Taches:\n")
            for t in result.details_taches:
                f.write(f" - {t.task}: {t.nombre_unite} un search_volume -> {t.heures}h\n")

        except Exception as e:
            f.write("\n--- CRASH DETECTED ---\n")
            import traceback
            f.write(traceback.format_exc())

if __name__ == "__main__":
    run_test()
