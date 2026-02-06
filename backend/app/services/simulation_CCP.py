"""
CCP (Centre de Courrier Postal) - Dedicated Simulation Service
Centre ID: 2053

This service is completely independent from other simulation services.
It handles all CCP-specific calculation logic.
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.schemas.models import (
    SimulationResponse,
    TacheDetail,
    PosteResultat
)


class CCPVolumeContext:
    """
    CCP-specific volume context for managing input volumes
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


def calculate_ccp_simulation(
    db: Session,
    centre_id: int,
    poste_id: Optional[int] = None,
    volumes: Dict[str, Any] = None,
    params: Dict[str, Any] = None
) -> SimulationResponse:
    """
    CCP-specific simulation calculation
    
    Args:
        db: Database session
        centre_id: CCP center ID (2053)
        poste_id: Optional position ID (None = all positions)
        volumes: Volume inputs
            - courrier_ordinaire: Annual CO volume
            - courrier_recommande: Annual CR volume
            - ebarkia: Annual EB volume
            - lrh: Annual LRH volume
            - amana: Annual AMANA volume (legacy)
            - volume_global_amana_depot: Annual Amana depot volume
            - volume_global_amana_recu: Annual Amana recu volume
            - sac_input: Number of colis per sac (for Amana Sac conversion)
            - caisson_input: Number of colis per caisson (for Amana Caisson conversion)
            - courrier_input: Number of colis per courrier (for Amana Courrier conversion)
        params: Simulation parameters
            - productivite: Productivity percentage (default: 100)
            - heures_net: Net hours per day (default: 8.0)
            - idle_minutes: Idle time in minutes (default: 0)
            - taux_complexite: Complexity coefficient (default: 1.0)
            - nature_geo: Geographic nature coefficient (default: 1.0)
    
    Returns:
        SimulationResponse with CCP calculation results
    """
    
    # Initialize contexts
    print(f"DEBUG_CCP: Received volumes: {volumes}")
    vol_ctx = CCPVolumeContext(volumes or {})
    params = params or {}
    
    # Extract parameters
    productivite = float(params.get('productivite', 100.0))
    heures_net = float(params.get('heures_net', 8.0))
    idle_minutes = float(params.get('idle_minutes', 0.0))
    taux_complexite = float(params.get('taux_complexite', 1.0))
    nature_geo = float(params.get('nature_geo', 1.0))
    pct_retour = float(params.get('pct_retour', 0.0))
    
    pct_retour = float(params.get('pct_retour', 0.0))
    pct_international = float(params.get('pct_international', 0.0)) # New Param
    
    # Calculate net hours (Already calculated in Frontend)
    heures_nettes = max(0, heures_net)

    # --- FETCH REAL ACTUAL DATA (MOD, MOI, APS) ---
    # 2. MOD & MOI from CentrePostes
    # Sum effectif_actuel based on poste type, filtered by poste_id if selected
    sql_cp = """
        SELECT 
            p.type_poste,
            SUM(COALESCE(cp.effectif_actuel, 0)) as total
        FROM dbo.centre_postes cp
        JOIN dbo.postes p ON p.id = cp.poste_id
        WHERE cp.centre_id = :cid
    """
    
    params_cp = {"cid": centre_id}
    if poste_id:
        sql_cp += " AND cp.poste_id = :pid"
        params_cp["pid"] = poste_id
        
        # If specific poste selected, we don't show Global APS from Centres table
        # unless this specific poste IS somehow linked to APS (unlikely if APS is column in Centres)
        # We set real_aps to 0 to reflect we are looking at a specific scope.
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

    
    # 1. Load CCP tasks from database
    tasks = load_ccp_tasks(db, centre_id, poste_id)
    
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
    
    JOURS_OUVRES_AN = 264
    
    # Get Amana unit conversion inputs
    sac_input = vol_ctx.get_volume('sac_input', 1.0)
    caisson_input = vol_ctx.get_volume('caisson_input', 1.0)
    courrier_input = vol_ctx.get_volume('courrier_input', 1.0)
    
    for task in tasks:
        task_name = task.get('nom_tache') or 'N/A'
        unite = task.get('unite_mesure') or ''
        moyenne_min = safe_float_conversion(task.get('moyenne_min'))
        base_calcul = safe_float_conversion(task.get('base_calcul'))
        famille_uo = task.get('famille_uo') or ''
        
        famille_upper = famille_uo.upper().strip()
        
        # --- VOLUME SELECTION LOGIC ---
        volume_annuel = 0.0
        volume_source = "Unknown"
        is_amana_logic = False
        
        # 1. AMANA
        if "AMANA" in famille_upper:
            is_amana_logic = True
            if any(k in famille_upper for k in ["DEPOT", "DÉPOT", "DEPART", "DÉPART"]):
                volume_annuel = vol_ctx.get_volume('volume_global_amana_depot', 0.0)
                volume_source = "Amana Depot"
            elif any(k in famille_upper for k in ["RECU", "REÇU", "ARRIVEE", "ARRIVÉ", "ARRIVE"]):
                volume_annuel = vol_ctx.get_volume('volume_global_amana_recu', 0.0)
                volume_source = "Amana Recu"
            else:
                # Fallback Amana
                volume_annuel = vol_ctx.get_volume('volume_global_amana_depot', 0.0)
                volume_source = "Amana Depot (Fallback)"
                if volume_annuel == 0:
                    volume_annuel = vol_ctx.get_volume('volume_global_amana_recu', 0.0)
                    volume_source = "Amana Recu (Fallback)"

        # 2. CO (Courrier Ordinaire)
        elif any(k in famille_upper for k in ["CO", "ORDINAIRE"]):
            if any(k in famille_upper for k in ["DEPOT", "DÉPOT", "DEPART", "DÉPART", "MED"]):
                volume_annuel = vol_ctx.get_volume('courrier_ordinaire', 0.0) # Maps to CO MED
                volume_source = "CO Depot/MED"
            elif any(k in famille_upper for k in ["RECU", "REÇU", "ARRIVEE", "ARRIVÉ", "ARRIVE"]):
                volume_annuel = vol_ctx.get_volume('co_arrive', 0.0)
                volume_source = "CO Arrive"
            else:
                # Fallback to standard logic if ambiguous
                volume_annuel = calculate_task_units(task_name, unite, famille_uo, vol_ctx, JOURS_OUVRES_AN) * JOURS_OUVRES_AN
                volume_source = "Legacy Calculation"

        # 3. CR (Courrier Recommande)
        elif any(k in famille_upper for k in ["CR", "RECOMMANDE", "RECOMMANDÉ"]):
            if any(k in famille_upper for k in ["DEPOT", "DÉPOT", "DEPART", "DÉPART", "MED"]):
                volume_annuel = vol_ctx.get_volume('courrier_recommande', 0.0) # Maps to CR MED
                volume_source = "CR Depot/MED"
            elif any(k in famille_upper for k in ["RECU", "REÇU", "ARRIVEE", "ARRIVÉ", "ARRIVE"]):
                volume_annuel = vol_ctx.get_volume('cr_arrive', 0.0)
                volume_source = "CR Arrive"
            else:
                volume_annuel = calculate_task_units(task_name, unite, famille_uo, vol_ctx, JOURS_OUVRES_AN) * JOURS_OUVRES_AN
                volume_source = "Legacy Calculation"

        # 4. Other Legacy (Ebarkia, LRH, generic)
        else:
             # Use legacy helper which returns DAILY units
             nombre_unite_legacy = calculate_task_units(task_name, unite, famille_uo, vol_ctx, JOURS_OUVRES_AN)
             volume_annuel = nombre_unite_legacy * JOURS_OUVRES_AN
             volume_source = "Legacy Helper"


        # --- CALCULATION LOGIC ---
        
        formule_parts = []
        
        if is_amana_logic:
            # Amana Formula: Vol / 12 / 22
            volume_journalier = volume_annuel / 12.0 / 22.0 if volume_annuel > 0 else 0.0
            formule_parts = [f"{volume_annuel:.0f} ({volume_source})", "/ 12 / 22", f"= {volume_journalier:.2f}/j"]
            
            # Base Calcul
            if base_calcul > 10: base_calcul = base_calcul / 100.0
            base_calcul_decimal = base_calcul
            
            workload_minutes = volume_journalier * base_calcul_decimal * moyenne_min
            nombre_unite = volume_journalier * base_calcul_decimal # Base unit count
            
            if base_calcul_decimal != 1.0:
                 formule_parts.append(f"× {base_calcul_decimal:.2f}")
            formule_parts.append(f"× {moyenne_min:.4f}min")

            # Unit Divisor
            unite_upper = unite.upper().strip()
            divisor = 1.0
            divisor_name = ""
            if unite_upper not in ["COLIS", ""]:
                if "SAC" in unite_upper and sac_input > 0:
                    divisor = sac_input; divisor_name = "sac"
                elif "CAISSON" in unite_upper and caisson_input > 0:
                    divisor = caisson_input; divisor_name = "caisson"
                elif ("COURRIER" in unite_upper or "LETTRE" in unite_upper) and courrier_input > 0:
                    divisor = courrier_input; divisor_name = "courrier"
            
            if divisor > 1.0:
                workload_minutes /= divisor
                nombre_unite /= divisor
                formule_parts.append(f"/ {divisor:.0f} ({divisor_name})")

            # Specifique: Etats non distribué + AMANA Reçu
            if "ETATS NON DISTRIBU" in task_name.upper() and volume_source == "Amana Recu":
                 ratio_retour = pct_retour / 100.0
                 workload_minutes = workload_minutes * ratio_retour
                 formule_parts.append(f"× {ratio_retour:.2f} (pctRetour)")

        else:
            # Standard Logic: Vol / 264
            # Identify if it came from legacy helper (already daily) or manual volume selection (needs / 264)
            if "Legacy" in volume_source:
                 # Re-call/use calculated units strictly
                 nombre_unite = calculate_task_units(task_name, unite, famille_uo, vol_ctx, JOURS_OUVRES_AN)
                 volume_annuel = nombre_unite * JOURS_OUVRES_AN # For display
                 # Standard logic assumes unit conversion is done inside 'calculate_task_units' or implicit 1:1
                 # But user might want unit conversion here too? For now stick to standard behavior.
                 workload_minutes = nombre_unite * moyenne_min
                 formule_parts = [f"{nombre_unite:.2f} (Legacy) × {moyenne_min:.2f} min"]
            else:
                 # Manual Volume Selection (CO Arrive etc)
                 nombre_unite = volume_annuel / JOURS_OUVRES_AN if volume_annuel > 0 else 0.0
                 workload_minutes = nombre_unite * moyenne_min
                 formule_parts = [f"{volume_annuel:.0f} ({volume_source})", f"/ {JOURS_OUVRES_AN}", f"= {nombre_unite:.2f}/j", f"× {moyenne_min:.4f} min"]


        if is_amana_logic:
             # Specifique: Etats non distribué + AMANA Reçu
             if "ETATS NON DISTRIBU" in task_name.upper() and volume_source == "Amana Recu":
                  ratio_retour = pct_retour / 100.0
                  workload_minutes = workload_minutes * ratio_retour
                  formule_parts.append(f"× {ratio_retour:.2f} (pctRetour)")

        # --- NEW: INTERNATIONAL & NATIONAL RATE LOGIC ---
        # centre_poste_id = 8312 ONLY
        t_cp_id = task.get('centre_poste_id')
        t_phase = str(task.get('phase', '')).strip()
        
        # --- NEW: INTERNATIONAL & NATIONAL RATE LOGIC ---
        # TARGET: Task Name = 'Opération guichet : Dépôt' AND Phase check
        # centre_poste_id condition REMOVED
        
        t_phase = str(task.get('phase', '')).strip()
        t_name_check = task_name.strip()
        
        if t_name_check == 'Opération guichet : Dépôt':
            if t_phase == 'International':
                # International Rate - applies the user input directly
                ratio_inter = pct_international / 100.0
                workload_minutes = workload_minutes * ratio_inter
                formule_parts.append(f"× {ratio_inter:.2f} (Inter)")
            elif t_phase == 'Guichet':
                # National Rate = 100% - International Rate
                pct_national = max(0, 100.0 - pct_international)
                ratio_nat = pct_national / 100.0
                workload_minutes = workload_minutes * ratio_nat
                formule_parts.append(f"× {ratio_nat:.2f} (National)")



        # --- SHIFT PARAMETER LOGIC ---
        # Apply shift multiplier (heures x shift) for specific roles
        # Roles: agent opération, CONTRÔLEUR, agent traitement, responsable opération, Trieur, MANUTENTIONNAIRE
        shift_val = float(params.get('shift_param', 1.0))
        
        target_roles = [
            "AGENT OPÉRATION", "AGENT OPERATION", 
            "CONTRÔLEUR", "CONTROLEUR", 
            "AGENT TRAITEMENT", 
            "RESPONSABLE OPÉRATION", "RESPONSABLE OPERATION", 
            "TRIEUR", 
            "MANUTENTIONNAIRE"
        ]
        
        # Check if task's poste_label matches any target role
        p_label = str(task.get('poste_label', '')).strip().upper()
        
        # DEBUG PRINT
        if "AGENT" in p_label:
            print(f"DEBUG SHIFT: Task={task_name}, Label={p_label}, Param={shift_val}, Match={any(role in p_label for role in target_roles)}")

        # Check for EXACT match to allow list targeting
        # substring matching can be too aggressive
        # p_label is already upper and strip
        is_shift_role = p_label in target_roles
        
        if is_shift_role and shift_val > 1.0:
            workload_minutes = workload_minutes * shift_val
            formule_parts.append(f"× {shift_val:.0f} (Shift)")
        
        # DEBUG: Removed
        # formule_parts.append(f"[{p_label}|S:{shift_val}]") 
        
        # --- FINAL ADJUSTMENTS ---
        adjusted_minutes = workload_minutes * taux_complexite * nature_geo
        # REMOVED Productivity adjustment on tasks because it is now applied to Capacity (Heures Net)
        # if productivite > 0:
        #     adjusted_minutes = adjusted_minutes / (productivite / 100.0)
        
        heures = adjusted_minutes / 60.0
        total_heures += heures

        # Add coeffs to formula
        if is_amana_logic:
             if taux_complexite != 1.0: formule_parts.append(f"× {taux_complexite:.2f} (cplx)")
             if nature_geo != 1.0: formule_parts.append(f"× {nature_geo:.2f} (geo)")
             if productivite != 100.0: formule_parts.append(f"/ {productivite/100:.2f} (prod)")
             formule = " ".join(formule_parts)
        else:
             if "Legacy" not in volume_source:
                  if taux_complexite != 1.0: formule_parts.append(f"× {taux_complexite:.2f} (cplx)")
                  if nature_geo != 1.0: formule_parts.append(f"× {nature_geo:.2f} (geo)")
                  formule = " ".join(formule_parts)
             else:
                  formule = f"{nombre_unite:.2f} × {moyenne_min:.2f} min" # Simple legacy

        details_taches.append(TacheDetail(
            task=task_name,
            phase=task.get('phase'), # Added phase for frontend disambiguation
            famille_uo=famille_uo,
            unit=unite,
            avg_sec=moyenne_min * 60,
            nombre_unite=round(nombre_unite, 2),
            heures=round(heures, 2),
            formule=formule
        ))
    
    # 3. Calculate FTE (Total Needed)
    fte_calcule = total_heures / heures_nettes if heures_nettes > 0 else 0
    fte_arrondi = round(fte_calcule) # This is the Target Total Count for MOD work
    
    # --- OPTIMIZATION LOGIC (ARRONDI BREAKDOWN) ---
    # User Rule: 
    # If Actuel (MOD+APS) > Target (Calculated):
    #   1. Reduce APS first (down to 0)
    #   2. Reduce MOD (down to Target)
    # Else:
    #   Target is just the Calculated Need (MOD). 
    #   (We assume for Deficit we just need to reach Target, composition is implied as MOD).
    
    total_actuel_staff = real_mod + real_aps
    target_staff = fte_arrondi # Based on workload
    
    final_aps_target = 0
    final_mod_target = 0
    
    if total_actuel_staff > target_staff:
        # SURPLUS CASE
        surplus = total_actuel_staff - target_staff
        
        # 1. Reduce APS
        # We can cut up to 'real_aps' amount
        cut_from_aps = min(real_aps, surplus)
        final_aps_target = real_aps - cut_from_aps
        
        remaining_surplus = surplus - cut_from_aps
        
        # 2. Reduce MOD
        # We can cut up to 'real_mod' amount
        cut_from_mod = min(real_mod, remaining_surplus)
        final_mod_target = real_mod - cut_from_mod
        
        # Check: final_aps + final_mod should equal target_staff
    else:
        # DEFICIT or MATCH CASE
        # We need 'target_staff' people.
        # We keep existing APS? Or replace with MOD?
        # Usually we keep existing workforce.
        # Let's assume we keep APS and fill rest with MOD, or just set MOD = Target?
        # User only specified reduction logic.
        # Standard assumption: Target defines the "Ideal" state. Ideally we want MOD.
        # But if we have APS we can't just fire them in a deficit.
        # Let's default to: Target APS = 0, Target MOD = fte_arrondi. 
        # (This aligns with "Calculated" view which shows only MOD need).
        # Wait, if I do that, Ecart = Target - Actuel might be weird if we ignore APS.
        # User said: "Ecart Total is Arrondi - Actuel".
        # If I set Target=10 (all MOD) and Actuel=9 (3 APS, 6 MOD).
        # Ecart = 10 - 9 = 1. Correct.
        # Breakdown: Target MOD=10, Target APS=0.
        # This seems consistent. The "Surplus Reduction" was to explain *which* specific actual resources are removed.
        # So for Deficit, we just show the Goal: 10 MOD.
        
        # RE-READING USER CAREFULLY: "if actuel > calculé we only keep the amount needed... reduce APS... then MOD".
        # This implies for Surplus we show a Specific Breakdown.
        # Does he want a specific breakdown for Deficit? Probably not detailed.
        # I will set Default Target = Calculated (MOD only, APS 0).
        # AND Override ONLY if Surplus logic dictates retaining some APS?
        # In the example: Need 5. Actuel 9 (3 APS, 6 MOD).
        # Reduced APS to 0. Reduced MOD to 5.
        # Result: APS 0, MOD 5.
        # Suppose Need 8. Actuel 9 (3 APS, 6 MOD).
        # Surplus 1.
        # Cut APS by 1 -> APS 2.
        # Remaining APS 2. MOD 6. Total 8.
        # So here Target Breakdown IS DIFFERENT from "Calculated=MOD Only".
        # Target shows APS=2, MOD=6.
        
        final_aps_target = real_aps # Start with full
        final_mod_target = real_mod
        
        # Apply standard Target (Total)
        # But wait, if Deficit, we need to INCREASE.
        # If Deficit, we just go to target.
        if target_staff >= total_actuel_staff:
             # Just hit the target number. 
             # Composition? Assume we keep current and hire MOD.
             final_aps_target = real_aps
             final_mod_target = real_mod + (target_staff - total_actuel_staff)
        
    
    # 4. Build response
    return SimulationResponse(
        total_heures=round(total_heures, 2),
        fte_calcule=round(fte_calcule, 4),
        fte_arrondi=fte_arrondi,
        heures_net_jour=round(heures_nettes, 2),
        details_taches=details_taches,
        postes=[],
        # Populate Real Data
        total_mod_actuel=float(real_mod),
        total_moi_actuel=float(real_moi),
        total_aps_actuel=float(real_aps),
        
        # Calculated & Target Data
        total_mod_calcule=round(fte_calcule, 2), # Calculated Need (Simulation)
        total_mod_target=float(final_mod_target),
        total_moi_target=float(real_moi), # MOI matches actual
        total_aps_target=float(final_aps_target),
        
        # Legacy fields
        total_moi=int(real_moi),
        total_aps=int(real_aps)
    )


def load_ccp_tasks(
    db: Session,
    centre_id: int,
    poste_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Load CCP-specific tasks from database
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


def calculate_task_units(
    task_name: str,
    unite: str,
    famille_uo: str,
    vol_ctx: CCPVolumeContext,
    jours_ouvres: int = 264
) -> float:
    """
    Calculate number of units for a task based on volumes
    
    CCP-specific logic for converting annual volumes to daily units
    """
    task_lower = task_name.lower()
    unite_lower = unite.lower()
    famille_lower = famille_uo.lower()
    
    # Get annual volumes
    co_annual = vol_ctx.get_volume('courrier_ordinaire', 0)
    cr_annual = vol_ctx.get_volume('courrier_recommande', 0)
    eb_annual = vol_ctx.get_volume('ebarkia', 0)
    lrh_annual = vol_ctx.get_volume('lrh', 0)
    amana_annual = vol_ctx.get_volume('amana', 0)
    
    # Convert to daily
    co_daily = co_annual / jours_ouvres if co_annual > 0 else 0
    cr_daily = cr_annual / jours_ouvres if cr_annual > 0 else 0
    eb_daily = eb_annual / jours_ouvres if eb_annual > 0 else 0
    lrh_daily = lrh_annual / jours_ouvres if lrh_annual > 0 else 0
    amana_daily = amana_annual / jours_ouvres if amana_annual > 0 else 0
    
    # Match task to volume type
    if 'ordinaire' in task_lower or 'co' in famille_lower:
        return co_daily
    elif 'recommand' in task_lower or 'cr' in famille_lower:
        return cr_daily
    elif 'ebarkia' in task_lower or 'eb' in famille_lower:
        return eb_daily
    elif 'lrh' in task_lower:
        return lrh_daily
    elif 'amana' in task_lower:
        return amana_daily
    elif 'courrier' in unite_lower:
        # Generic courrier task - sum all courrier types
        return co_daily + cr_daily + eb_daily + lrh_daily
    
    return 0.0


def get_ccp_postes(db: Session, centre_id: int) -> List[Dict[str, Any]]:
    """
    Get all positions for CCP center
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
