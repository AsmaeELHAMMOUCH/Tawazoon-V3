# backend/app/services/cndp_engine.py
"""
Isolated CNDP Simulation Engine.

This module contains the core calculation logic for the CNDP (Centre National de Dépôt et de Partage),
separated from the main simulation flow for clarity and maintainability.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from sqlalchemy.orm import Session

from app.models.db_models import Tache, CentrePoste


@dataclass
class CNDPTaskResult:
    """Result for a single task calculation."""
    task_id: int
    task_name: str
    unite_mesure: str
    produit: str
    moyenne_min: float
    volume_source: str  # "IMPORT" or "EXPORT"
    volume_annuel: float
    volume_journalier: float
    heures_calculees: float
    formule: str


@dataclass
class CNDPSimulationResult:
    """Complete simulation result for CNDP."""
    tasks: List[CNDPTaskResult] = field(default_factory=list)
    total_heures: float = 0.0
    heures_net_jour: float = 8.0
    fte_calcule: float = 0.0
    fte_arrondi: int = 0
    debug_info: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CNDPInputVolumes:
    """Input volumes for CNDP simulation."""
    amana_import: float = 0.0  # Volume Import (Arrivée)
    amana_export: float = 0.0  # Volume Export (Départ)
    courrier_ordinaire: float = 0.0  # Future use
    courrier_recommande: float = 0.0  # Future use


@dataclass
class CNDPParameters:
    """CNDP-specific parameters."""
    pct_sac: float = 60.0       # % du volume traité en Sacs
    pct_ed: float = 40.0        # % du volume traité en ED (Colis hors sac)
    pct_retenue: float = 1.0    # % Retenue douanière
    pct_echantillon: float = 5.0  # % Échantillon
    colis_par_sac: float = 5.0  # Ratio: combien de colis par sac
    nb_jours_ouvres_an: int = 264
    productivite: float = 100.0
    heures_par_jour: float = 8.0
    idle_minutes: float = 0.0
    shift: int = 1              # Nombre de shifts (multiplicateur pour certains postes)
    

def calculate_task_duration(
    task: Tache,
    volumes: CNDPInputVolumes,
    params: CNDPParameters,
    poste_map: Optional[Dict[str, str]] = None
) -> CNDPTaskResult:
    """
    Calculate the duration for a single CNDP task based on its unite_mesure.
    
    Logic:
    - If unite_mesure contains "SAC" -> Apply pct_sac and divide by colis_par_sac
    - If unite_mesure contains "COLIS" -> Apply pct_ed (hors sac)
    - Otherwise -> 100% of volume (no conversion)
    
    The volume source (Import/Export) is determined by the 'produit' field.
    """
    nom_tache = str(task.nom_tache or "").strip()
    unite = str(task.unite_mesure or "").upper().strip()
    produit = str(task.produit or "").upper().strip()
    
    # 🆕 Utiliser moy_sec / 60 au lieu de moyenne_min
    moy_sec = float(task.moy_sec or 0.0)
    moy_min = moy_sec / 60.0
    
    # A. Determine volume source from produit field
    is_export = any(kw in produit for kw in ["EXPORT", "DEPART", "DÉPART"])
    vol_source_label = "EXPORT" if is_export else "IMPORT"
    vol_annuel_base = volumes.amana_export if is_export else volumes.amana_import
    
    # B. Apply coefficient based on unite_mesure
    coeff = 1.0
    conversion_factor = 1.0
    formula_parts = [f"Vol({vol_source_label})={vol_annuel_base:.0f}"]
    
    # 🆕 Cas spécial CAMION: Vol/Jour = 1 fixe
    is_camion = "CAMION" in unite
    
    if is_camion:
        # Pour les tâches CAMION, on fixe vol_jour = 1
        vol_annuel = 0.0  # Non utilisé
        vol_jour = 1.0
        formula_parts = ["Vol/Jour=1 (CAMION)"]
    elif "SAC" in unite:
        coeff = params.pct_sac / 100.0
        conversion_factor = 1.0 / max(1.0, params.colis_par_sac)
        formula_parts.append(f"× {params.pct_sac:.0f}%Sac")
        formula_parts.append(f"÷ {params.colis_par_sac:.0f}col/sac")
        vol_annuel = vol_annuel_base * coeff * conversion_factor
        vol_jour = vol_annuel / params.nb_jours_ouvres_an if params.nb_jours_ouvres_an > 0 else 0.0
        formula_parts.append(f"÷ {params.nb_jours_ouvres_an}j")
    elif "COLIS" in unite:
        coeff = params.pct_ed / 100.0
        formula_parts.append(f"× {params.pct_ed:.0f}%ED")
        vol_annuel = vol_annuel_base * coeff * conversion_factor
        vol_jour = vol_annuel / params.nb_jours_ouvres_an if params.nb_jours_ouvres_an > 0 else 0.0
        formula_parts.append(f"÷ {params.nb_jours_ouvres_an}j")
    else:
        # Other units - 100% by default
        formula_parts.append("× 100%")
        vol_annuel = vol_annuel_base * coeff * conversion_factor
        vol_jour = vol_annuel / params.nb_jours_ouvres_an if params.nb_jours_ouvres_an > 0 else 0.0
        formula_parts.append(f"÷ {params.nb_jours_ouvres_an}j")
    
    # E. Calculate hours (utilise moy_min = moy_sec / 60)
    minutes_jour = vol_jour * moy_min
    heures_tache = minutes_jour / 60.0
    formula_parts.append(f"× {moy_min:.2f}min (moy_sec={moy_sec:.0f}s)")
    
    # F. Apply Phase Multipliers (%International / %National)
    
    # F. Skip Phase Multipliers (User Request: National/International params removed)
    # The logic below is removed as per request to simplify CNDP engine.

    # G. Apply SHIFT Multiplier for Specific Roles
    # Roles: MANUTENTIONNAIRE, AGENT OP, etc.
    responsable = "N/A"
    if task.centre_poste:
        code_resp = task.centre_poste.code_resp
        if poste_map and code_resp and code_resp in poste_map:
            responsable = poste_map[code_resp]
        elif task.centre_poste.poste:
            responsable = str(task.centre_poste.poste.label or "Inconnu")

    resp_upper = responsable.upper()
    if (
        "MANUTENTIONNAIRE" in resp_upper or
        "AGENT OP" in resp_upper or
        "RESPONSABLE DES OP" in resp_upper or
        "AGENT TRAITEMENT" in resp_upper or
        "TRIEUR" in resp_upper or
        resp_upper.startswith("CONTR")
    ):
        shift_factor = params.shift
        if shift_factor > 1:
            heures_tache *= shift_factor
            formula_parts.append(f"× Shift({shift_factor})")

    # H. Apply productivity (Optional/Legacy - kept for consistency if needed)
    # if params.productivite > 0:
    #     heures_tache = heures_tache * (100.0 / params.productivite)
    #     if params.productivite != 100:
    #         formula_parts.append(f"÷ {params.productivite:.0f}%P")
    
    formule = " ".join(formula_parts) + f" = {heures_tache:.4f}h"
    
    return CNDPTaskResult(
        task_id=task.id,
        task_name=nom_tache,
        unite_mesure=task.unite_mesure or "",
        produit=task.produit or "",
        moyenne_min=moy_min,
        volume_source=vol_source_label,
        volume_annuel=vol_annuel,
        volume_journalier=vol_jour,
        heures_calculees=heures_tache,  # Pas de round() pendant les calculs
        formule=formule
    )


def run_cndp_simulation(
    db: Session,
    centre_id: int,
    volumes: CNDPInputVolumes,
    params: CNDPParameters,
    poste_code_filter: Optional[str] = None
) -> CNDPSimulationResult:
    """
    Run the complete CNDP simulation for a given centre.
    
    Args:
        db: Database session
        centre_id: CNDP centre ID (usually 1965)
        volumes: Input volumes
        params: CNDP-specific parameters
        poste_id_filter: Optional poste filter for intervenant view
        
    Returns:
        CNDPSimulationResult with all calculated tasks and totals
    """
    # Build query
    from app.models.db_models import Poste
    query = (
        db.query(Tache)
        .join(CentrePoste)
        .join(Poste, CentrePoste.code_resp == Poste.Code) # ✅ Join via Code for robustness
        .filter(CentrePoste.centre_id == centre_id)
    )
    
    if poste_code_filter:
        query = query.filter(CentrePoste.code_resp == poste_code_filter)
    
    taches = query.all()

    # ✅ Pre-fetch Poste labels by Code (for role-based logic)
    poste_map = {}
    postes_data = db.query(Poste.Code, Poste.label).filter(Poste.Code != None).all()
    for code, label in postes_data:
        poste_map[str(code)] = str(label)
    
    # Calculate hours for each task
    task_results: List[CNDPTaskResult] = []
    total_heures = 0.0
    
    for t in taches:
        result = calculate_task_duration(t, volumes, params, poste_map)
        task_results.append(result)
        total_heures += result.heures_calculees
    
    # Calculate net hours and FTE
    # Heures nettes = (heures_par_jour * productivité%) - temps_mort
    heures_prod = params.heures_par_jour * (params.productivite / 100.0)
    heures_net_jour = max(0.1, heures_prod - (params.idle_minutes / 60.0))
    fte_calcule = total_heures / heures_net_jour if heures_net_jour > 0 else 0.0
    fte_arrondi = int(round(fte_calcule))
    
    return CNDPSimulationResult(
        tasks=task_results,
        total_heures=total_heures,  # Round seulement à l'affichage
        heures_net_jour=heures_net_jour,
        fte_calcule=fte_calcule,
        fte_arrondi=fte_arrondi,
        debug_info={
            "centre_id": centre_id,
            "poste_code_filter": poste_code_filter,
            "tasks_count": len(taches),
            "volumes": {
                "import": volumes.amana_import,
                "export": volumes.amana_export
            },
            "params": {
                "pct_sac": params.pct_sac,
                "pct_ed": params.pct_ed,
                "colis_par_sac": params.colis_par_sac,
                "productivite": params.productivite
            }
        }
    )
