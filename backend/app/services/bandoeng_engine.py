from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from sqlalchemy.orm import Session
from app.models.db_models import Tache, CentrePoste, Poste

@dataclass
class BandoengTaskResult:
    task_id: int
    task_name: str
    unite_mesure: str
    produit: str
    moyenne_min: float
    volume_source: str
    volume_annuel: float
    volume_journalier: float
    heures_calculees: float
    formule: str
    famille: str = ""
    responsable: str = ""
    moy_sec: float = 0.0
    centre_poste_id: int = 0
    phase: str = ""

@dataclass
class BandoengSimulationResult:
    tasks: List[BandoengTaskResult] = field(default_factory=list)
    total_heures: float = 0.0
    heures_net_jour: float = 8.0
    fte_calcule: float = 0.0
    fte_arrondi: int = 0
    besoin_trieur: float = 0.0
    besoin_preparateur: float = 0.0
    besoin_magasinier: float = 0.0
    total_ressources_humaines: float = 0.0
    ressources_par_poste: Dict[str, float] = field(default_factory=dict)
    debug_info: Dict[str, Any] = field(default_factory=dict)

@dataclass
class BandoengInputVolumes:
    amana_import: float = 0.0
    amana_export: float = 0.0
    courrier_ordinaire_import: float = 0.0
    courrier_ordinaire_export: float = 0.0
    courrier_recommande_import: float = 0.0
    courrier_recommande_export: float = 0.0
    gare_import: float = 0.0
    gare_export: float = 0.0
    presse_import: float = 0.0
    presse_export: float = 0.0
    grid_values: Dict[str, Any] = field(default_factory=dict)

@dataclass
class BandoengParameters:
    pct_sac: float = 60.0
    colis_amana_par_canva_sac: float = 35.0
    nbr_co_sac: float = 350.0
    nbr_cr_sac: float = 400.0
    coeff_circ: float = 1.0
    coeff_geo: float = 1.0
    pct_retour: float = 0.0
    pct_collecte: float = 0.0
    pct_axes: float = 0.0
    pct_local: float = 0.0
    pct_international: float = 0.0
    pct_national: float = 0.0
    pct_march_ordinaire: float = 0.0
    productivite: float = 100.0
    idle_minutes: float = 0.0
    ratio_trieur: float = 1200.0
    ratio_preparateur: float = 1000.0
    ratio_magasinier: float = 800.0
    shift: int = 1
    pct_mois: Optional[float] = None  # Nouveau paramètre pour la saisonnalité

def safe_float(val: Any) -> float:
    try:
        if isinstance(val, str):
            val = val.replace(',', '.').replace(' ', '').replace('%', '').strip()
            if not val:
                return 0.0
        return float(val)
    except (ValueError, TypeError):
        return 0.0

def get_grid_val(grid: Dict, path: List[str]) -> float:
    current = grid
    for key in path:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return 0.0
    return safe_float(current)

def get_volume_by_product(produit: str, volumes: BandoengInputVolumes) -> float:
    """
    Mappe le nom du produit (Tache.produit) vers le volume spécifique issu de la grille.
    Logique basée sur les spécifications exactes.
    """
    p = produit.upper().strip() if produit else ""
    g = volumes.grid_values

    # Helper sums - ✅ UNIQUEMENT local + axes (pas global)
    def sum_amana_recu():
        # Amana Recu = GC + Part (local + axes UNIQUEMENT)
        total = 0.0
        for seg in ['gc', 'part']:
            for geo in ['local', 'axes']:  # ✅ Exclusion de 'global'
                total += get_grid_val(g, ['amana', 'recu', seg, geo])
        return total

    def sum_amana_depot():
        total = 0.0
        for seg in ['gc', 'part']:
            for geo in ['local', 'axes']:  # ✅ Exclusion de 'global'
                total += get_grid_val(g, ['amana', 'depot', seg, geo])
        return total

    def sum_cr_arrive():
        # ✅ local + axes uniquement
        return (get_grid_val(g, ['cr', 'arrive', 'local']) + 
                get_grid_val(g, ['cr', 'arrive', 'axes']))

    def sum_co_med():
        # ✅ local + axes uniquement
        return (get_grid_val(g, ['co', 'med', 'local']) + 
                get_grid_val(g, ['co', 'med', 'axes']))
    
    def sum_cr_med():
        # ✅ local + axes uniquement
        return (get_grid_val(g, ['cr', 'med', 'local']) + 
                get_grid_val(g, ['cr', 'med', 'axes']))

    # Direct Mappings
    if p in ["AMANA REÇU TOTAL","AMANA REÇU"]:
        return sum_amana_recu()
    
    if p == "CR ARRIVÉ":
        return sum_cr_arrive()

    if p == "CO ARRIVÉ AXES":
        return get_grid_val(g, ['co', 'arrive', 'axes'])
    


    if p == "AMANA REÇU AXES":
        # GC Axes + Part Axes
        return (get_grid_val(g, ['amana', 'recu', 'gc', 'axes']) + 
                get_grid_val(g, ['amana', 'recu', 'part', 'axes']))
    
    if p == "CR ARRIVÉ AXES":
        return get_grid_val(g, ['cr', 'arrive', 'axes'])
    
    if p == "CO ARRIVÉ LOCAL":
        return get_grid_val(g, ['co', 'arrive', 'local'])
    
    if p == "AMANA REÇU LOCAL":
        # GC Local + Part Local
        return (get_grid_val(g, ['amana', 'recu', 'gc', 'local']) + 
                get_grid_val(g, ['amana', 'recu', 'part', 'local']))
    
    if p == "CR ARRIVÉ LOCAL":
        return get_grid_val(g, ['cr', 'arrive', 'local'])
    
    if p == "CO MED AXES":
        return get_grid_val(g, ['co', 'med', 'axes'])
    
    if p == "CO MED":
        return sum_co_med()
    
    if p == "CR MED AXES":
        return get_grid_val(g, ['cr', 'med', 'axes'])
    
    if p == "AMANA DÉPÔT LOCAL":
        return (get_grid_val(g, ['amana', 'depot', 'gc', 'local']) + 
                get_grid_val(g, ['amana', 'depot', 'part', 'local']))
    
    if p == "CR MED":
        return sum_cr_med()
    
    if p == "AMANA DÉPÔT AXES":
        return (get_grid_val(g, ['amana', 'depot', 'gc', 'axes']) + 
                get_grid_val(g, ['amana', 'depot', 'part', 'axes']))
    
    if p in ["AMANA DÉPÔT TOTAL","AMANA DEPOT","AMANA DÉPÔT","AMANA DEPÔT"]:
        return sum_amana_depot()
    
    if p == "CO LOCAL":
        # Request: CO Local = CO Med Local + CO Arrivé Local
        return (get_grid_val(g, ['co', 'med', 'local']) + 
                get_grid_val(g, ['co', 'arrive', 'local']))

    if p == "CR LOCAL":
        # Request: CR Local = CR Med Local + CR Arrivé Local
        return (get_grid_val(g, ['cr', 'med', 'local']) + 
                get_grid_val(g, ['cr', 'arrive', 'local']))

    if p == "CO MED LOCAL":
        return get_grid_val(g, ['co', 'med', 'local'])
    
    if p == "CR MED LOCAL":
        return get_grid_val(g, ['cr', 'med', 'local'])
    
    if p in ["CO ARRIVÉ", "CO ARRIVE", "CO ARRIVÉ TOTAL"]:
        # User defined: Total des volumes CO Arrivé axes et local (sans global/part?)
        # "on garde juste CO Arrivé (le total des volumes CO Arrivé axes et local)"
        return (get_grid_val(g, ['co', 'arrive', 'local']) + 
                get_grid_val(g, ['co', 'arrive', 'axes']))

    if p == "TOTAL CO":
        # CO MED + CO Arrivé (Calculé selon la règle ci-dessus)
        co_arrive_custom = (get_grid_val(g, ['co', 'arrive', 'local']) + 
                            get_grid_val(g, ['co', 'arrive', 'axes']))
        return sum_co_med() + co_arrive_custom

    if p == "TOTAL CR":
        # CR MED + CR Arrivé
        return sum_cr_med() + sum_cr_arrive()
    
    # ElBarkia mappings (structure simplifiée : seulement med et arrive)
    if p in ["E BARKIA MED", "ELBARKIA MED", "EL BARKIA MED"]:
        return get_grid_val(g, ['ebarkia', 'med'])
    
    if p in ["E BARKIA ARRIVÉ", "ELBARKIA ARRIVÉ", "EL BARKIA ARRIVÉ", "E BARKIA ARRIVE", "ELBARKIA ARRIVE", "EL BARKIA ARRIVE"]:
        return get_grid_val(g, ['ebarkia', 'arrive'])

    # LRH mappings (structure simplifiée : seulement med et arrive)
    if p in ["LRH MED"]:
        return get_grid_val(g, ['lrh', 'med'])

    if p in ["LRH ARRIVÉ", "LRH ARRIVE"]:
        return get_grid_val(g, ['lrh', 'arrive'])

    # Fallback to old flat volumes if no match (legacy safety)
    if "EXPORT" in p:
        if "AMANA" in p: return volumes.amana_export
        if "CO" in p: return volumes.courrier_ordinaire_export
        if "CR" in p: return volumes.courrier_recommande_export
    
    return 0.0

def calculate_task_duration(
    task: Tache,
    volumes: BandoengInputVolumes,
    params: BandoengParameters,
    poste_map: Dict[str, str] = None
) -> BandoengTaskResult:
    nom_tache = str(task.nom_tache or "").strip()
    unite = str(task.unite_mesure or "").upper().strip()
    produit = str(task.produit or "").upper().strip()
    phase = str(task.phase or "").lower().strip()
    
    moy_sec = safe_float(task.moy_sec)
    base_calcul_raw = task.base_calcul
    if base_calcul_raw is None or str(base_calcul_raw).strip() == "":
        base_calcul = 100.0
    else:
        base_calcul = safe_float(base_calcul_raw)
    
    # Base Formula Components
    # Formule = moy_sec/60 * base_calcul/100 * (Volume / Divisor) * PhaseMultiplier
    
    # 1. Get Volume
    volume_source_val = get_volume_by_product(produit, volumes)
    
    # 2. Determine Day Divisor (Annual -> Daily)
    # User Request: "on garde Calcul du Volume Journalier comme précedemment on divise par 264 ensuite en divise par 350 ou 24 ça depend phase"
    # Seasonal Request: "en saisonalité on va multiplier par le prct mois et diviser par 22"
    
    # Step 1: Divide by 264 (default) or use Seasonality (pct_mois / 22)
    if params.pct_mois is not None:
        vol_jour_brut = (volume_source_val * (params.pct_mois / 100.0)) / 22.0
        days_divisor_str = f"({params.pct_mois}% / 22)"
    else:
        vol_jour_brut = volume_source_val / 264.0
        days_divisor_str = "264"
    
    # Step 2: Apply specific phase divisors IF present (cumulative/sequential)
    if "day_350" in phase:
        vol_jour_brut /= 350.0
        days_divisor_str += " * 350"
    elif "day_24" in phase:
        vol_jour_brut /= 24.0
        days_divisor_str += " * 24"
    elif "retour_day_350" in phase:
        vol_jour_brut /= 350.0
        days_divisor_str += " * 350"
        
    # 3. Determine Unit Divisor (Caisson, Sac...)
    divisor = 1.0
    formula_unit_part = ""
    
    if "DEPECHE" in unite.upper() or "DÉPÊCHE" in unite.upper() or "DÉPECHE" in unite.upper() or "PART" in unite.upper():
        # Pas de diviseur pour ces unités (formule simplifiée fixe)
        divisor = 1.0
        formula_unit_part = ""
        
    elif "CAISSON" in unite:
        divisor = max(1.0, params.nbr_cr_sac) 
        formula_unit_part = f" / {divisor:.0f} (Caisson)"
        
    elif "SAC" in unite:
        flux_is_amana = "AMANA" in produit
        flux_is_cr = "CR" in produit or "RECOMMANDE" in produit
        flux_is_co = "CO" in produit or "ORDINAIRE" in produit
        
        if flux_is_amana:
            divisor = max(1.0, params.colis_amana_par_canva_sac)
            formula_unit_part = f" / {divisor:.0f} (Sac Amana)"
        elif flux_is_cr:
            divisor = max(1.0, params.nbr_cr_sac)
            formula_unit_part = f" / {divisor:.0f} (Sac CR)"
        elif flux_is_co:
            divisor = max(1.0, params.nbr_co_sac)
            formula_unit_part = f" / {divisor:.0f} (Sac CO)"
        else:
             divisor = max(1.0, params.nbr_co_sac) 

    # 4. Apply Phase Multiplier
    multiplier = 1.0
    phase_part = ""
    
    if "circul_geo" in phase:
        m = params.coeff_circ * params.coeff_geo
        multiplier *= m
        phase_part = f" * Coeff({m:.2f})"
        
    elif "circul_collect" in phase:
        pct = (params.pct_collecte / 100.0)
        m = params.coeff_circ * pct
        multiplier *= m
        phase_part = f" * Circ*Collect({m:.4f})"

    elif "circul_march" in phase:
        pct = (params.pct_march_ordinaire / 100.0)
        m = params.coeff_circ * pct
        multiplier *= m
        phase_part = f" * Circ*March({m:.4f})"

        
    elif "retour" in phase:
        pct = (params.pct_retour / 100.0)
        multiplier *= pct
        phase_part = f" * Retour({pct:.2f})"
    elif "retour_day_350" in phase:
        pct = (params.pct_retour / 100.0)
        multiplier *= pct
        phase_part = f" * Retour({pct:.2f})"

    # --- National / International Logic ---
    if "national" in phase and "international" not in phase:
        pct = (params.pct_national / 100.0)
        multiplier *= pct
        phase_part += f" * Natl({pct:.2f})"
    elif "international" in phase:
        pct = (params.pct_international / 100.0)
        multiplier *= pct
        phase_part += f" * Intl({pct:.2f})"

    # Final Calculation
    # Let's assume inputs are DAILY volumes because "Vol/Jour" is standard.
    # However, existing code had `volume_annuel`.
    # I will assume inputs are DAILY.
    # So `volume_journalier` = `volume_adjusted`.
    
    # WAIT! `day_350` "diviser le volume sur 350" -> 350 sounds like days in a year!
    # If `day_350` means "divide by 350", it strongly suggests the input volume IS ANNUAL.
    # If inputs were daily, dividing by 350 would make it tiny.
    # So: INPUTS ARE ANNUAL.
    # Step A: Vol Jour Adjusted = (Vol / Days) / UnitDivisor * Multiplier
    vol_jour = (vol_jour_brut / divisor) * multiplier
    
    # Step B: Time Calculation
    # ✅ CAS SPÉCIAL : Unités DEPECHE et PART ont une formule simplifiée
    unite_upper = unite.upper()
    if "DEPECHE" in unite_upper or "DÉPÊCHE" in unite_upper or "DÉPECHE" in unite_upper or "PART" in unite_upper:
        # Formule simplifiée : moy_sec/60 * base_calcul (PAS de division par 60 finale, PAS de volume)
        heures_tache = ((moy_sec / 60.0) * (base_calcul / 100.0)) / 60.0
        friendly_formula = f"{moy_sec}s/60 * {base_calcul}%"
    else:
        # Formule standard : moy_sec/60 * base_calcul/100 * vol_jour / 60
        minutes_jour = (moy_sec / 60.0) * (base_calcul / 100.0) * vol_jour
        heures_tache = minutes_jour / 60.0
        friendly_formula = f"(Vol/{days_divisor_str}) / {divisor:.0f} * {multiplier:.2f} * {moy_sec}s/60 * {base_calcul}%"

    
    # Retrieve Responsable and Family
    responsable = "N/A"
    famille = str(task.famille_uo or "").strip()
    cp_id = task.centre_poste_id
    
    if task.centre_poste:
        code_resp = task.centre_poste.code_resp
        # ✅ Priorité au Code pour la résolution du nom (Demande User)
        if poste_map and code_resp and code_resp in poste_map:
             responsable = poste_map[code_resp]
        elif task.centre_poste.poste:
             responsable = str(task.centre_poste.poste.label or "Inconnu")

    # --- Apply SHIFT Multiplier for Specific Roles ---
    # Roles: MANUTENTIONNAIRE, Agent op, Responsable des op, Contr...
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
            friendly_formula += f" * Shift({shift_factor})"

    return BandoengTaskResult(
        task_id=task.id,
        task_name=nom_tache,
        unite_mesure=unite,
        produit=produit,
        moyenne_min=moy_sec/60.0,
        volume_source=produit,
        volume_annuel=volume_source_val,
        volume_journalier=vol_jour,
        heures_calculees=heures_tache,
        formule=friendly_formula,
        famille=famille,
        responsable=responsable,
        moy_sec=moy_sec,
        centre_poste_id=cp_id,
        phase=phase
    )

def run_bandoeng_simulation(
    db: Session,
    centre_id: int,
    volumes: BandoengInputVolumes,
    params: BandoengParameters,
    poste_code: Optional[str] = None
) -> BandoengSimulationResult:
    
    # 1. Récupérer les tâches associées aux postes MOD uniquement
    query = (
        db.query(Tache)
        .join(CentrePoste)
        .join(Poste, CentrePoste.code_resp == Poste.Code)  # ✅ Join avec la table Poste via Code (plus robuste)
        .filter(CentrePoste.centre_id == centre_id)
        .filter(Poste.type_poste == 'MOD')  # ✅ Strictement MOD uniquement
    )
    
    if poste_code:
        query = query.filter(CentrePoste.code_resp == poste_code)
        
    taches = query.all()
    
    # ✅ Pre-fetch Poste labels by Code
    poste_map = {}
    postes_data = db.query(Poste.Code, Poste.label).filter(Poste.Code != None).all()
    for code, label in postes_data:
        poste_map[str(code)] = str(label)
    
    task_results = []
    total_heures = 0.0
    
    for t in taches:
        res = calculate_task_duration(t, volumes, params, poste_map)
        task_results.append(res)
        total_heures += res.heures_calculees
        
    # Calcul Capacité Nette (Net Capacity)
    # Heures Prod = 8h * Productivité
    # Capacité Nette = Heures Prod - Temps Mort
    heures_prod = 8.0 * (params.productivite / 100.0)
    capacite_nette = max(0.1, heures_prod - (params.idle_minutes/60.0))
    
    # ETP Calculé = Total Heures Nécessaires / Capacité Nette d'un agent
    fte_calcule = total_heures / capacite_nette
    
    # Calcul des ressources par poste (Intervenant)
    ressources_par_poste = {}
    for res in task_results:
        resp = res.responsable
        if resp not in ressources_par_poste:
            ressources_par_poste[resp] = 0.0
        # ETP pour cette tâche = Heures / Capacité Nette
        ressources_par_poste[resp] += (res.heures_calculees / capacite_nette)

    # Calcul des besoins spécifiques (Sommaire - Legacy/Global logic, might need adjustment if filtered)
    vol_total_colis = get_volume_by_product("AMANA REÇU TOTAL", volumes) + get_volume_by_product("AMANA DÉPÔT TOTAL", volumes)
    besoin_trieur = (vol_total_colis / 264.0) / max(1, params.ratio_trieur)
    besoin_preparateur = (vol_total_colis / 264.0) / max(1, params.ratio_preparateur)
    besoin_magasinier = (vol_total_colis / 264.0) / max(1, params.ratio_magasinier)
    
    return BandoengSimulationResult(
        tasks=task_results,
        total_heures=total_heures,
        heures_net_jour=capacite_nette,
        fte_calcule=fte_calcule,
        fte_arrondi=int(round(fte_calcule)),
        besoin_trieur=besoin_trieur,
        besoin_preparateur=besoin_preparateur,
        besoin_magasinier=besoin_magasinier,
        total_ressources_humaines=fte_calcule,
        ressources_par_poste=ressources_par_poste,
        debug_info={}
    )