"""
CNA (Centre National Amana) - Dedicated Simulation Service
Centre ID: 1964

This service is completely independent from other simulation services.
It handles all CNA-specific calculation logic with 4 volume inputs.
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.schemas.models import (
    SimulationResponse,
    TacheDetail,
    PosteResultat
)


class CNAVolumeContext:
    """
    CNA-specific volume context for managing input volumes
    """
    def __init__(self, volumes: Dict[str, Any]):
        self.volumes = volumes or {}
    
    def get_volume(self, key: str, default: float = 0.0) -> float:
        """Get volume value safely"""
        val = self.volumes.get(key, default)
        try:
            return float(val) if val is not None else default
        except (TypeError, ValueError):
            return default



def safe_float_conversion(val: Any) -> float:
    """Helper to convert potential string numbers with commas to float"""
    if val is None:
        return 0.0
    try:
        if isinstance(val, str):
            val = val.strip()
            if not val:
                return 0.0
            return float(val.replace(',', '.'))
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def calculate_cna_simulation(
    db: Session,
    centre_id: int,
    poste_id: Optional[int] = None,
    volumes: Dict[str, Any] = None,
    params: Dict[str, Any] = None
) -> SimulationResponse:
    """
    CNA-specific simulation calculation
    
    Args:
        db: Database session
        centre_id: CNA center ID (1964)
        poste_id: Optional position ID (None = all positions)
        volumes: Volume inputs (ANNUAL)
            - collecte: Annual Collecte volume
            - marche_ordinaire: Annual Marche ordinaire volume (uses collecte for calc)
            - recu_region: Annual Reçu région volume
            - global_amana: Calculated sum (disabled input)
        params: Simulation parameters
            - param_collecte: Percentage for Collecte (default: 100)
            - param_marche_ordinaire: Percentage for Marche ordinaire (default: 100)
            - productivite: Productivity percentage (default: 100)
            - heures_net: Net hours per day (default: 8.0)
            - idle_minutes: Idle time in minutes (default: 0)
            - taux_complexite: Complexity coefficient (default: 1.0)
            - nature_geo: Geographic nature coefficient (default: 1.0)
    
    Returns:
        SimulationResponse with CNA calculation results
    """
    
    # Initialize contexts
    print(f"DEBUG_CNA: Received volumes: {volumes}")
    vol_ctx = CNAVolumeContext(volumes or {})
    params = params or {}
    
    # Extract CNA-specific parameters
    param_collecte = float(params.get('param_collecte', 100.0))
    param_marche_ordinaire = float(params.get('param_marche_ordinaire', 100.0))
    productivite = float(params.get('productivite', 100.0))
    heures_net = float(params.get('heures_net', 8.0))
    idle_minutes = float(params.get('idle_minutes', 0.0))
    taux_complexite = float(params.get('taux_complexite', 1.0))
    nature_geo = float(params.get('nature_geo', 1.0))
    
    # Unit Conversion Params
    courrier_par_sac = float(params.get('courrier_par_sac', 2500.0) or 2500.0)
    cr_par_caisson = float(params.get('cr_par_caisson', 500.0) or 500.0)
    colis_amana_par_sac = float(params.get('colis_amana_par_sac', 5.0) or 5.0)
    # ratio_sac_caisson = float(params.get('ratio_sac_caisson', 1.0) or 1.0) # Reserved if needed
    
    # Calculate net hours
    heures_nettes = max(0, heures_net)

    # --- FETCH REAL ACTUAL DATA (MOD, MOI, APS) ---
    sql_cp = """
        SELECT 
            p.type_poste,
            SUM(COALESCE(cp.effectif_actuel, 0)) as total
        FROM dbo.centre_postes cp
        JOIN dbo.postes p ON p.id = cp.poste_id
        WHERE cp.centre_id = :cid
    """
    
    params_cp = {"cid": centre_id}
    
    # 2. MOD & MOI from CentrePostes
    if poste_id:
        sql_cp += " AND cp.poste_id = :pid"
        params_cp["pid"] = poste_id
        # If specific poste selected, we don't show Global APS
        real_aps = 0.0
    else:
        # Global view: Fetch APS from centres
        sql_centre = "SELECT APS FROM dbo.centres WHERE id = :cid"
        row_centre = db.execute(text(sql_centre), {"cid": centre_id}).fetchone()
        real_aps = float(row_centre[0] or 0.0) if row_centre else 0.0
        
    sql_cp += " GROUP BY p.type_poste"
    rows_cp = db.execute(text(sql_cp), params_cp).fetchall()
    
    real_mod = 0.0
    real_moi = 0.0
    
    for r in rows_cp:
        typ = (r[0] or "").strip().upper()
        cnt = float(r[1] or 0.0)
        if typ == 'MOD':
            real_mod += cnt
        elif typ == 'MOI':
            real_moi += cnt

    
    # 1. Load CNA tasks from database
    tasks = load_cna_tasks(db, centre_id, poste_id)
    
    if not tasks:
        return SimulationResponse(
            total_heures=0.0,
            fte_calcule=0.0,
            fte_arrondi=0,
            heures_net_jour=heures_nettes,
            details_taches=[],
            postes=[]
        )
    
    # 2. Calculate workload for each task
    details_taches = []
    total_heures = 0.0
    
    # Extract annual volumes (Cast to Int as requested)
    collecte_annual = int(vol_ctx.get_volume('collecte', 0.0))
    recu_region_annual = int(vol_ctx.get_volume('recu_region', 0.0))
    global_amana_annual = int(vol_ctx.get_volume('global_amana', 0.0))
    
    # Calculate daily volumes
    collecte_daily = (collecte_annual / 12.0 / 22.0) * (param_collecte / 100.0) if collecte_annual > 0 else 0.0
    marche_ordinaire_daily = (collecte_annual / 12.0 / 22.0) * (param_marche_ordinaire / 100.0) if collecte_annual > 0 else 0.0
    recu_region_daily = (recu_region_annual / 12.0 / 22.0) if recu_region_annual > 0 else 0.0
    global_amana_daily = (global_amana_annual / 12.0 / 22.0) if global_amana_annual > 0 else 0.0
    
    for task in tasks:
        task_name = task.get('nom_tache') or 'N/A'
        unite = task.get('unite_mesure') or ''
        moyenne_min = safe_float_conversion(task.get('moyenne_min'))
        base_calcul = safe_float_conversion(task.get('base_calcul'))
        famille_uo = task.get('famille_uo') or ''
        
        # --- CNA VOLUME SELECTION LOGIC ---
        volume_journalier = 0.0
        volume_source = "Unknown"
        famille_stripped = famille_uo.strip()
        famille_upper = famille_stripped.upper()
        
        if famille_upper == "COLLECTE":
            volume_journalier = collecte_daily
            volume_source = f"Collecte"
        elif "MARCHE" in famille_upper and "ORDINAIRE" in famille_upper:
            volume_journalier = marche_ordinaire_daily
            volume_source = f"Marche ord."
        elif "RECU" in famille_upper or "REÇU" in famille_upper:
            volume_journalier = recu_region_daily
            volume_source = f"Reçu région"
        elif "GLOBAL" in famille_upper and "AMANA" in famille_upper:
            volume_journalier = global_amana_daily
            volume_source = f"Global Amana"
        else:
            volume_journalier = 0.0
            volume_source = f"No match"
        
        # --- UNIT CONVERSION LOGIC ---
        nombre_unite = volume_journalier
        unite_upper = unite.upper().strip()
        divider_used = 1.0
        
        if volume_journalier > 0 and unite_upper:
            # Apply dividers based on Unit and Flow
            if "SAC" in unite_upper:
                # USER REQUEST: Always use COLIS/SAC for any "Sac" unit, regardless of family.
                divider_used = colis_amana_par_sac if colis_amana_par_sac > 0 else 1.0
            elif "CAISSON" in unite_upper:
                # Use CR par Caisson
                divider_used = cr_par_caisson if cr_par_caisson > 0 else 1.0
            
            # Apply division to unit count
            nombre_unite = volume_journalier / divider_used

        # Calculate workload
        base_calc_val = base_calcul if base_calcul > 0 else 1.0
        calc_prod = productivite if productivite > 0 else 100.0
        
        # Formula: (Volume / Divisor) * Moyenne * Base * (100/Prod)
        # User requested: Vol * Moyenne * Base / Divisor
        workload_minutes = (nombre_unite * moyenne_min * base_calc_val) * (100.0 / calc_prod)
        
        # Apply coefficients
        adjusted_minutes = workload_minutes * taux_complexite * nature_geo
        
        # 🆕 Shift Logic
        shift_val = float(params.get('shift_param', 1.0))
        target_roles = [
            "AGENT OPÉRATION", "AGENT OPERATION", 
            "CONTRÔLEUR", "CONTROLEUR", 
            "AGENT TRAITEMENT", 
            "RESPONSABLE OPÉRATION", "RESPONSABLE OPERATION", 
            "TRIEUR", 
            "MANUTENTIONNAIRE"
        ]
        p_label = str(task.get('poste_label') or "").strip().upper()
        
        if shift_val > 1.0 and p_label in target_roles:
            adjusted_minutes = adjusted_minutes * shift_val
            formule += f" × {shift_val:.0f}(Shift)"
        
        heures = adjusted_minutes / 60.0
        total_heures += heures
        
        # Build formula string for display
        # "Vol * Moy * Base / Div"
        formule = f"{volume_source}: {volume_journalier:.2f} × {moyenne_min:.2f}"
        
        if base_calc_val != 1.0:
            formule += f" × {base_calc_val:.2f}(base)"
            
        if divider_used != 1.0:
            formule += f" / {divider_used:.0f}(div)"
            
        if calc_prod != 100:
            formule += f" / {calc_prod:.0f}%"

        details_taches.append(TacheDetail(
            task=task_name,
            famille_uo=famille_uo,
            unit=unite,
            avg_sec=moyenne_min * 60,
            nombre_unite=round(nombre_unite, 2),
            heures=round(heures, 2),
            formule=formule
        ))
    
    # 3. Calculate FTE
    # Add global idle time impact if desired, but usually idle time reduces availability, not increases workload.
    # Params `idle_minutes` was passed. logic: Heures Net - Idle?
    # Actually, `heures_net` is usually availability. If idle is "Temps Mort", it reduces availability.
    # Logic: fte = total_heures / (heures_nettes - (idle/60))
    
    daily_capacity = max(0.1, heures_nettes - (idle_minutes / 60.0))
    fte_calcule = total_heures / daily_capacity
    fte_arrondi = round(fte_calcule)
    
    # --- OPTIMIZATION LOGIC (ARRONDI BREAKDOWN) ---
    total_mod_actuel = float(real_mod) 
    total_aps_actuel = float(real_aps)
    total_moi_actuel = float(real_moi)
    
    total_actuel_staff = total_mod_actuel + total_aps_actuel
    target_staff = fte_arrondi
    
    final_aps_target = 0
    final_mod_target = 0
    
    if total_actuel_staff > target_staff:
        # SURPLUS CASE
        surplus = total_actuel_staff - target_staff
        
        # 1. Reduce APS
        cut_from_aps = min(total_aps_actuel, surplus)
        final_aps_target = total_aps_actuel - cut_from_aps
        
        remaining_surplus = surplus - cut_from_aps
        
        # 2. Reduce MOD
        cut_from_mod = min(total_mod_actuel, remaining_surplus)
        final_mod_target = total_mod_actuel - cut_from_mod
    else:
        # DEFICIT CASE
        final_aps_target = total_aps_actuel
        final_mod_target = total_mod_actuel + (target_staff - total_actuel_staff)

    return SimulationResponse(
        total_heures=round(total_heures, 2),
        fte_calcule=round(fte_calcule, 4),
        fte_arrondi=fte_arrondi,
        heures_net_jour=round(daily_capacity, 2),
        details_taches=details_taches,
        postes=[],
        # Real Data
        total_mod_actuel=total_mod_actuel,
        total_moi_actuel=total_moi_actuel,
        total_aps_actuel=total_aps_actuel,
        
        # Target / Proposed
        total_mod_target=float(final_mod_target),
        total_moi_target=float(total_moi_actuel), # Pass through
        total_aps_target=float(final_aps_target),
        
        # Calculated
        total_mod_calcule=round(fte_calcule, 2),
        
        # Legacy
        total_moi=int(real_moi),
        total_aps=int(real_aps)
    )


def load_cna_tasks(
    db: Session,
    centre_id: int,
    poste_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Load CNA-specific tasks from database
    """
    sql = """
        SELECT 
            t.id,
            t.nom_tache,
            t.phase,
            t.unite_mesure,
            t.moyenne_min,
            t.base_calcul,
            t.famille_uo,
            t.centre_poste_id,
            cp.poste_id,
            p.label as poste_label
        FROM dbo.taches t
        INNER JOIN dbo.centre_postes cp ON cp.id = t.centre_poste_id
        LEFT JOIN dbo.postes p ON p.id = cp.poste_id
        WHERE cp.centre_id = :centre_id
    """
    
    params = {"centre_id": centre_id}
    
    if poste_id is not None:
        sql += " AND cp.poste_id = :poste_id"
        params["poste_id"] = poste_id
    
    sql += " ORDER BY t.nom_tache"
    
    rows = db.execute(text(sql), params).mappings().all()
    return [dict(r) for r in rows] if rows else []





def get_cna_postes(db: Session, centre_id: int) -> List[Dict[str, Any]]:
    """
    Get all positions for CNA center
    """
    sql = """
        SELECT
            cp.id as centre_poste_id,
            cp.poste_id as id,
            p.label as label,
            p.type_poste,
            COALESCE(cp.effectif_actuel, 0) as effectif_actuel
        FROM dbo.centre_postes cp
        LEFT JOIN dbo.postes p ON p.id = cp.poste_id
        WHERE cp.centre_id = :centre_id
        ORDER BY p.label
    """
    
    rows = db.execute(text(sql), {"centre_id": centre_id}).mappings().all()
    return [dict(r) for r in rows] if rows else []
