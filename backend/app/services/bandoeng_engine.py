from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from sqlalchemy.orm import Session
from sqlalchemy import func
import unicodedata
from app.models.db_models import Tache, CentrePoste, Poste

def normalize_text(text: str) -> str:
    """
    Normalise le texte en supprimant les accents, en mettant en majuscules
    et en nettoyant les espaces superflus.
    """
    if not text:
        return ""
    # Décomposer les caractères accentués
    nfkd_form = unicodedata.normalize('NFKD', str(text))
    # Filtrer les caractères non-spacing marks (accents) et reconstruire
    res = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    # Tout en majuscule, sans espaces superflus (intermédiaires et bords)
    return " ".join(res.upper().split())

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
    heures_net_jour: float = 8.5
    fte_calcule: float = 0.0
    fte_arrondi: int = 0
    total_ressources_humaines: float = 0.0
    ressources_par_poste: Dict[str, float] = field(default_factory=dict)
    grid_values: Dict[str, Any] = field(default_factory=dict) # Ajouté pour le forecast
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
    ed_percent: float = 40.0
    colis_amana_par_canva_sac: float = 35.0
    nbr_co_sac: float = 350.0
    nbr_cr_sac: float = 400.0
    coeff_circ: float = 0.0
    coeff_geo: float = 0.0
    pct_retour: float = 0.0
    pct_collecte: float = 0.0
    pct_guichet: float = 0.0
    pct_axes: float = 0.0
    pct_local: float = 0.0
    pct_international: float = 0.0
    pct_national: float = 100.0
    pct_marche_ordinaire: float = 0.0
    pct_vague_master: float = 0.0
    pct_boite_postale: float = 0.0
    pct_crbt: float = 0.0
    pct_hors_crbt: float = 0.0
    productivite: float = 100.0
    idle_minutes: float = 0.0
    shift: int = 1
    duree_trajet: float = 0.0  # Durée du trajet A/R en minutes
    has_guichet: int = 1  # 1: Oui, 0: Non
    cr_par_caisson: float = 40.0 # Par défaut
    pct_mois: Optional[float] = None  # Saisonnalité globale (fallback)
    # --- Saisonnalité mensuelle par flux ---
    pct_mois_amana:   Optional[float] = None
    pct_mois_co:      Optional[float] = None
    pct_mois_cr:      Optional[float] = None
    pct_mois_lrh:     Optional[float] = None
    pct_mois_ebarkia: Optional[float] = None
    pct_annee: Optional[float] = None  # Nouveau paramètre pour le forecast (croissance)
    # --- Taux de croissance annuelle par flux ---
    amana_pct_annee:   Optional[float] = None
    co_pct_annee:      Optional[float] = None
    cr_pct_annee:      Optional[float] = None
    lrh_pct_annee:     Optional[float] = None
    ebarkia_pct_annee: Optional[float] = None

    # --- Paramètres Découplés par Flux ---
    # AMANA
    amana_pct_collecte: Optional[float] = None
    amana_pct_guichet: Optional[float] = None
    amana_pct_retour: Optional[float] = None
    amana_pct_axes_arrivee: Optional[float] = None
    amana_pct_axes_depart: Optional[float] = None
    amana_pct_national: Optional[float] = None
    amana_pct_international: Optional[float] = None
    amana_pct_marche_ordinaire: Optional[float] = None
    amana_pct_crbt: Optional[float] = None
    amana_pct_hors_crbt: Optional[float] = None

    # CO (Courrier Ordinaire)
    co_pct_collecte: Optional[float] = None
    co_pct_guichet: Optional[float] = None
    co_pct_retour: Optional[float] = None
    co_pct_axes_arrivee: Optional[float] = None
    co_pct_axes_depart: Optional[float] = None
    co_pct_national: Optional[float] = None
    co_pct_international: Optional[float] = None
    co_pct_marche_ordinaire: Optional[float] = None
    co_pct_vague_master: Optional[float] = None
    co_pct_boite_postale: Optional[float] = None

    # CR (Courrier Recommandé)
    cr_pct_collecte: Optional[float] = None
    cr_pct_guichet: Optional[float] = None
    cr_pct_retour: Optional[float] = None
    cr_pct_axes_arrivee: Optional[float] = None
    cr_pct_axes_depart: Optional[float] = None
    cr_pct_national: Optional[float] = None
    cr_pct_international: Optional[float] = None
    cr_pct_marche_ordinaire: Optional[float] = None
    cr_pct_vague_master: Optional[float] = None
    cr_pct_boite_postale: Optional[float] = None
    cr_pct_crbt: Optional[float] = None
    cr_pct_hors_crbt: Optional[float] = None

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

def apply_growth_to_grid(grid: Any, growth_pct: float) -> Any:
    """
    Applique récursivement un taux de croissance à toutes les valeurs numériques d'une grille.
    (Growth = 1 + growth_pct/100)
    """
    factor = 1.0 + (growth_pct / 100.0)
    
    if isinstance(grid, dict):
        new_grid = {}
        for k, v in grid.items():
            new_grid[k] = apply_growth_to_grid(v, growth_pct)
        return new_grid
    elif isinstance(grid, (int, float)):
        return grid * factor
    elif isinstance(grid, str):
        # Tenter de convertir si c'est une chaîne numérique
        try:
            val = safe_float(grid)
            return val * factor
        except:
            return grid
    return grid

def apply_growth_per_flux(grid: dict, flux_rates: dict) -> dict:
    """
    Applique un taux de croissance différent par flux (clé de premier niveau de grid_values).
    flux_rates = { "amana": 5.0, "co": 3.0, "cr": 2.0, "lrh": 1.0, "ebarkia": 0.0 }
    Les clés absentes ou à 0 ne sont pas modifiées.
    """
    new_grid = {}
    for flux_key, sub_grid in grid.items():
        rate = flux_rates.get(flux_key, 0)
        if rate != 0:
            new_grid[flux_key] = apply_growth_to_grid(sub_grid, rate)
        else:
            new_grid[flux_key] = sub_grid
    return new_grid

def detect_flux(produit: str) -> str:
    """
    Identifie le flux (amana, co, cr) à partir du nom du produit.
    """
    if not produit: return "general"
    p = produit.upper().strip()
    
    # AMANA
    if "AMANA" in p: return "amana"
    
    # CO (Courrier Ordinaire)
    if any(k in p for k in ["CO ", " CO", "ORDINAIRE", "COURRIER O"]): 
        return "co"
    if p == "CO": return "co"
    
    # CR (Courrier Recommandé)
    if any(k in p for k in ["CR ", " CR", "RECOMMANDE", "RECOMMANDÉ", "COURRIER R"]): 
        return "cr"
    if p == "CR": return "cr"
    
    return "general"

def is_factor_role(responsable_label: str) -> bool:
    """
    Vérifie si le responsable est un facteur.
    """
    if not responsable_label:
        return False
    return "FACTEUR" in responsable_label.upper()

def get_flux_param(params: BandoengParameters, flux: str, param_name: str) -> float:
    """
    Récupère un paramètre spécifique au flux s'il existe, sinon la valeur globale.
    """
    # 1. Tentative avec le préfixe de flux (ex: amana_pct_collecte)
    attr_name = f"{flux}_{param_name}"
    if hasattr(params, attr_name):
        val = getattr(params, attr_name)
        if val is not None:
            return val
            
    # 2. Fallback sur la valeur globale (ex: pct_collecte)
    if hasattr(params, param_name):
        val = getattr(params, param_name)
        if val is not None:
             return val
             
    return 0.0

def minus_group(*values: float) -> float:
    """Helper pour simuler (1 - X - Y) d'Excel."""
    return 1.0 - sum(values)

def plus_group(*values: float) -> float:
    """Helper pour simuler (1 + X + Y) d'Excel."""
    return 1.0 + sum(values)

def apply_factors(base: float, factors: List[float]) -> float:
    """Multiplie une base par une liste de facteurs (moteur dynamique)."""
    result = base
    for f in factors:
        result *= f
    return result

def resolve_phase_multipliers(phase: str, flux: str, params: BandoengParameters) -> List[float]:
    """
    Résout dynamiquement les multiplicateurs en fonction de la phase et du flux.
    Centralise la logique métier Excel dans TON moteur.
    """
    factors = []
    
    # --- RÈGLES SPÉCIFIQUES (User defined) ---
    
    # 1) circul_geo => plus_group(coeff_circ, coeff_geo)
    if phase == "circul_geo":
        factors.append(plus_group(params.coeff_circ, params.coeff_geo))
    
    # 2) crbt_circul_geo => plus_group(coeff_circ, coeff_geo) * pct_crbt/100
    elif phase == "crbt_circul_geo":
        factors.append(plus_group(params.coeff_circ, params.coeff_geo))
        pct_crbt = get_flux_param(params, flux, "pct_crbt") / 100.0
        factors.append(pct_crbt)

    # 3) hcrbt_circul_geo => plus_group(coeff_circ, coeff_geo) * pct_hors_crbt/100
    elif phase == "hcrbt_circul_geo":
        factors.append(plus_group(params.coeff_circ, params.coeff_geo))
        pct_hcrbt = get_flux_param(params, flux, "pct_hors_crbt") / 100.0
        factors.append(pct_hcrbt)

    # 4) march_collect => minus_group(pct_march, pct_collecte)
    elif phase == "march_collect":
        pct_march = get_flux_param(params, flux, "pct_marche_ordinaire") / 100.0
        pct_collecte = get_flux_param(params, flux, "pct_collecte") / 100.0
        factors.append(minus_group(pct_march, pct_collecte))
    
    elif "min_retour_crbt" in phase:
        pct = get_flux_param(params, flux, "pct_retour") / 100.0
        factors.append(minus_group(pct))
        factors.append(get_flux_param(params, flux, "pct_crbt") / 100.0)

    # 5) v_master => pct_vague_master / 100
    elif phase == "v_master":
        factors.append(get_flux_param(params, flux, "pct_vague_master") / 100.0)

    # 6) b_postale => pct_boite_postale / 100
    elif phase == "b_postale":
        factors.append(get_flux_param(params, flux, "pct_boite_postale") / 100.0)

    # 7) collect => pct_collecte / 100
    elif phase == "collect":
        factors.append(get_flux_param(params, flux, "pct_collecte") / 100.0)

    # 8) march => pct_marche_ordinaire / 100
    elif phase == "march":
        factors.append(get_flux_param(params, flux, "pct_marche_ordinaire") / 100.0)
    
    # 8.5) national_guichet => pct_national * pct_guichet
    elif "national_guichet" in phase:
        factors.append(get_flux_param(params, flux, "pct_national") / 100.0)
        factors.append(get_flux_param(params, flux, "pct_guichet") / 100.0)

    # 8.6) inter_guichet => pct_international * pct_guichet
    elif "inter_guichet" in phase:
        factors.append(get_flux_param(params, flux, "pct_international") / 100.0)
        factors.append(get_flux_param(params, flux, "pct_guichet") / 100.0)

    # 8.7) guichet => pct_guichet / 100
    elif "guichet" in phase:
        factors.append(get_flux_param(params, flux, "pct_guichet") / 100.0)

    # 9) retour_crbt => retour * pct_crbt / 100
    elif phase == "retour_crbt":
        factors.append(get_flux_param(params, flux, "pct_retour") / 100.0)
        factors.append(get_flux_param(params, flux, "pct_crbt") / 100.0)
    elif phase == "crbt":
        factors.append(get_flux_param(params, flux, "pct_crbt") / 100.0)

    # --- AUTRES PHASES (Logique existante maintenue pour compatibilité) ---
    elif "circul_collect" in phase:
        factors.append(params.coeff_circ)
        pct = get_flux_param(params, flux, "pct_collecte") / 100.0
        factors.append(pct)

    elif "circul_march" in phase:
        factors.append(params.coeff_circ)
        pct = get_flux_param(params, flux, "pct_marche_ordinaire") / 100.0
        factors.append(pct)
        
    elif "retour" in phase or "retour_day_350" in phase:
        pct = get_flux_param(params, flux, "pct_retour") / 100.0
        factors.append(pct)

    # 2. Logique National / International (Cumulable avec les phases ci-dessus)
    if "national" in phase and "international" not in phase and "national_guichet" not in phase:
        pct = get_flux_param(params, flux, "pct_national") / 100.0
        factors.append(pct)
    elif "international" in phase and "inter_guichet" not in phase:
        pct = get_flux_param(params, flux, "pct_international") / 100.0
        factors.append(pct)
        
    return factors

def get_volume_by_product(produit: str, volumes: BandoengInputVolumes) -> float:
    """
    Mappe le nom du produit (Tache.produit) vers le volume spécifique issu de la grille.
    Logique basée sur les spécifications exactes.
    """
    # Normalisation pour plus de robustesse (accents, espaces)
    p = normalize_text(produit)
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

    # Direct Mappings (Utilisant des clés normalisées sans accents)
    if p in ["AMANA RECU TOTAL", "AMANA RECU"]:
        return sum_amana_recu()
    
    if p == "CR ARRIVE":
        return sum_cr_arrive()

    if p == "CO ARRIVE AXES":
        return get_grid_val(g, ['co', 'arrive', 'axes'])
    
    if p == "AMANA RECU AXES":
        # GC Axes + Part Axes
        return (get_grid_val(g, ['amana', 'recu', 'gc', 'axes']) + 
                get_grid_val(g, ['amana', 'recu', 'part', 'axes']))
    
    if p == "CR ARRIVE AXES":
        return get_grid_val(g, ['cr', 'arrive', 'axes'])
    
    if p == "CO ARRIVE LOCAL":
        return get_grid_val(g, ['co', 'arrive', 'local'])
    
    if p == "AMANA RECU LOCAL":
        # GC Local + Part Local
        return (get_grid_val(g, ['amana', 'recu', 'gc', 'local']) + 
                get_grid_val(g, ['amana', 'recu', 'part', 'local']))
    
    if p == "CR ARRIVE LOCAL":
        return get_grid_val(g, ['cr', 'arrive', 'local'])
    
    if p == "CO MED AXES":
        return get_grid_val(g, ['co', 'med', 'axes'])
    
    if p == "CO MED":
        return sum_co_med()
    
    if p == "CR MED AXES":
        return get_grid_val(g, ['cr', 'med', 'axes'])
    
    if p == "AMANA DEPOT LOCAL":
        return (get_grid_val(g, ['amana', 'depot', 'gc', 'local']) + 
                get_grid_val(g, ['amana', 'depot', 'part', 'local']))
    
    if p == "CR MED":
        return sum_cr_med()
    
    if p == "AMANA DEPOT AXES":
        return (get_grid_val(g, ['amana', 'depot', 'gc', 'axes']) + 
                get_grid_val(g, ['amana', 'depot', 'part', 'axes']))
    
    if p in ["AMANA DEPOT TOTAL", "AMANA DEPOT"]:
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
    
    if p in ["CO ARRIVE", "CO ARRIVE TOTAL"]:
        # User defined: Total des volumes CO Arrivé axes et local (sans global/part?)
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
    
    if p in ["E BARKIA ARRIVE", "ELBARKIA ARRIVE", "EL BARKIA ARRIVE"]:
        return get_grid_val(g, ['ebarkia', 'arrive'])

    # LRH mappings (structure simplifiée : seulement med et arrive)
    if p in ["LRH MED"]:
        return get_grid_val(g, ['lrh', 'med'])

    if p in ["LRH ARRIVE"]:
        return get_grid_val(g, ['lrh', 'arrive'])

    # Fallback to old flat volumes if no match (legacy safety)
    if "EXPORT" in p:
        if "AMANA" in p: return volumes.amana_export
        if "CO" in p: return volumes.courrier_ordinaire_export
        if "CR" in p: return volumes.courrier_recommande_export

    return 0.0

def calculate_task_duration(
    task: Any,  # Use Any to support both DB models and mock objects for tests
    volumes: BandoengInputVolumes,
    params: BandoengParameters,
    poste_map: Dict[str, str] = None,
    role_mapping: Dict[str, str] = None
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
    
    # 0. Detect Flux
    flux = detect_flux(produit)
    
    # 1. Get Volume
    volume_source_val = get_volume_by_product(produit, volumes)
    
    # 2. Determine Day Divisor (Annual -> Daily)
    if params.pct_annee is not None:
        # Note: volume_source_val contient déjà la croissance si appliquée au préalable sur grid_values
        vol_jour_brut = volume_source_val / 264.0
        days_divisor_str = f"264 (Forecast +{params.pct_annee}%)"
    elif params.pct_mois is not None or any([
        params.pct_mois_amana, params.pct_mois_co, params.pct_mois_cr,
        params.pct_mois_lrh, params.pct_mois_ebarkia
    ]):
        # Priorité : pct_mois spécifique au flux, sinon fallback sur pct_mois global
        flux_pct_map = {
            "amana":   params.pct_mois_amana,
            "co":      params.pct_mois_co,
            "cr":      params.pct_mois_cr,
            "lrh":     params.pct_mois_lrh,
            "ebarkia": params.pct_mois_ebarkia,
        }
        effective_pct = flux_pct_map.get(flux) or params.pct_mois or 8.33
        vol_jour_brut = (volume_source_val * (effective_pct / 100.0)) / 22.0
        days_divisor_str = f"({effective_pct}% [{flux}] / 22)"
    else:
        vol_jour_brut = volume_source_val / 264.0
        days_divisor_str = "264"
    
    if vol_jour_brut > 1000:
        print(f"DEBUG: Task {nom_tache} has high vol_jour_brut: {vol_jour_brut} (source={volume_source_val}, divisor={days_divisor_str})")
    
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
        divisor = 1.0
    elif "CAISSON" in unite or "BAC" in unite:
        divisor = max(1.0, params.cr_par_caisson) 
        formula_unit_part = f" / {divisor:.0f} (Caisson)"
    elif "DNL" in unite:
        divisor = max(1.0, 5) 
        formula_unit_part = f" / {divisor:.0f} (DNL)"
    elif "SAC" in unite:
        if flux == "amana":
            divisor = max(1.0, params.colis_amana_par_canva_sac)
            formula_unit_part = f" / {divisor:.0f} (Sac Amana)"
        elif flux == "cr":
            divisor = max(1.0, params.nbr_cr_sac)
            formula_unit_part = f" / {divisor:.0f} (Sac CR)"
        elif flux == "co":
            divisor = max(1.0, params.nbr_co_sac)
            formula_unit_part = f" / {divisor:.0f} (Sac CO)"
        else:
             divisor = max(1.0, params.nbr_co_sac) 

    # 4. Apply Phase Multiplier (Dynamic Engine)
    factors = resolve_phase_multipliers(phase, flux, params)
    multiplier = apply_factors(1.0, factors)
    phase_part = f" * Factors({multiplier:.4f})" if factors else ""

    # Final Calculation
    # Let's assume inputs are DAILY volumes because "Vol/Jour" is standard.
    # However, existing code had `volume_annuel`.
    # I will assume inputs are DAILY.
    # So `volume_journalier` = `volume_adjusted`.
    
    # WAIT! `day_350` "diviser le volume sur 350" -> 350 sounds like days in a year!
    # If `day_350` means "divide by 350", it strongly suggests the input volume IS ANNUAL.
    # If inputs were daily, dividing by 350 would make it tiny.
    # So: INPUTS ARE ANNUAL.
    # --- Logic for ED factor ---
    # AMANA + COLIS :
    #   - Si base_calcul == 100 en BDD → ed_factor = 1.0 (pas d'ajustement ED)
    #   - Sinon                        → ed_factor = ed_percent / 100
    # AMANA + SAC   : toujours → (100 - ed_percent) / 100
    # Autre         : toujours → 1.0
    ed_factor = 1.0
    ed_label = "1.0"
    unite_upper = unite.upper()

    if "AMANA" in produit:
        if "COLIS" in unite_upper:
            if base_calcul == 100.0:
                # base_calcul = 100% → on utilise directement, pas d'ajustement ED
                ed_factor = 1.0
                ed_label = "100% (base_calcul=100)"
            elif phase == "sac":
                # Si la phase est "sac", on utilise (100 - %ED)
                ed_factor = (100.0 - params.ed_percent) / 100.0
                ed_label = f"{100 - params.ed_percent}% (non-ED car phase=sac)"
            else:
                ed_factor = params.ed_percent / 100.0
                ed_label = f"{params.ed_percent}% (ED)"
        elif "SAC" in unite_upper:
            if base_calcul == 100.0:
                ed_factor = 1.0
                ed_label = "100% (base_calcul=100)"
            else:
                ed_factor = (100.0 - params.ed_percent) / 100.0
                ed_label = f"{100 - params.ed_percent}% (non-ED)"
        else:
            ed_factor = 1.0
            ed_label = "1.0"

    # Final Calculation
    # Step A: Vol Jour Adjusted = (Vol / Days) / UnitDivisor * Multiplier
    vol_jour = (vol_jour_brut / divisor) * multiplier
    
    # Step B: Time Calculation
    # Note: On remplace (base_calcul / 100.0) par ed_factor selon demande
    if "DEPECHE" in unite_upper or "DÉPÊCHE" in unite_upper or "DÉPECHE" in unite_upper or "PART" in unite_upper:
        # Formule simplifiée : moy_sec/60 * ed_factor (PAS de division par 60 finale, PAS de volume)
        heures_tache = ((moy_sec / 60.0) * ed_factor) / 60.0
        friendly_formula = f"{moy_sec}s/60 * {ed_label}"
    else:
        # Formule standard : (moy_sec/60) * ed_factor * vol_jour / 60
        minutes_jour = (moy_sec / 60.0) * ed_factor * vol_jour
        heures_tache = minutes_jour / 60.0
        friendly_formula = f"(Vol/{days_divisor_str}) / {divisor:.0f} * {multiplier:.2f} * {moy_sec}s/60 * {ed_label}"

    
    # Retrieve Responsable and Family
    responsable = "N/A"
    famille = str(getattr(task, 'famille_uo', "") or "").strip()
    cp_id = getattr(task, 'centre_poste_id', 0)
    
    # Try to get responsable from virtual attribute first
    if hasattr(task, 'responsable_label') and task.responsable_label:
        responsable = str(task.responsable_label)
    elif hasattr(task, 'centre_poste') and task.centre_poste:
        code_resp = task.centre_poste.code_resp
        
        # --- Apply Role Mapping (Recommended Process) ---
        if role_mapping and code_resp in role_mapping:
            code_resp = role_mapping[code_resp]

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
        # Shift strictement borné pour éviter tout effet inattendu
        try:
            shift_factor = int(round(float(params.shift)))
        except Exception:
            shift_factor = 1
        if shift_factor not in (1, 2, 3):
            shift_factor = 1

        if shift_factor >= 2:
            actual_multiplier = shift_factor
            if shift_factor == 3 and "AGENT OP" not in resp_upper:
                actual_multiplier = 2
                
            heures_tache *= actual_multiplier
            friendly_formula += f" * Shift({actual_multiplier})"

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
    centre_id: Optional[int],
    volumes: BandoengInputVolumes,
    params: BandoengParameters,
    poste_code: Optional[str] = None,
    role_mapping: Optional[Dict[str, str]] = None,
    tasks_override: Optional[List[Tache]] = None,
    excluded_task_ids: Optional[List[int]] = None,
    excluded_task_quadruplets: Optional[List[tuple]] = None
) -> BandoengSimulationResult:
    
    # 0. Appliquer la croissance sur les grid_values avant la simulation
    local_volumes = volumes
    has_flux_rates = any([
        params.amana_pct_annee, params.co_pct_annee, params.cr_pct_annee,
        params.lrh_pct_annee, params.ebarkia_pct_annee
    ])

    if has_flux_rates:
        # Priorité : taux par flux individuels
        flux_rates = {
            "amana":   params.amana_pct_annee   or 0,
            "co":      params.co_pct_annee       or 0,
            "cr":      params.cr_pct_annee       or 0,
            "lrh":     params.lrh_pct_annee      or 0,
            "ebarkia": params.ebarkia_pct_annee  or 0,
        }
        print(f"DEBUG: apply_growth_per_flux rates={flux_rates}")
        from copy import deepcopy
        local_volumes = deepcopy(volumes)
        local_volumes.grid_values = apply_growth_per_flux(volumes.grid_values, flux_rates)
    elif params.pct_annee is not None and params.pct_annee != 0:
        # Fallback : taux global unique
        print(f"DEBUG: apply_growth_to_grid global rate={params.pct_annee}%")
        updated_grid = apply_growth_to_grid(volumes.grid_values, params.pct_annee)
        from copy import deepcopy
        local_volumes = deepcopy(volumes)
        local_volumes.grid_values = updated_grid

    # 1. Source des tâches : BDD ou Override (Simulation Virtuelle)
    if tasks_override is not None:
        taches = tasks_override
        actual_moi = 0.0
    else:
        # 1. Récupérer les tâches associées aux postes MOD uniquement
        query = (
            db.query(Tache)
            .join(CentrePoste)
            .join(Poste, CentrePoste.code_resp == Poste.Code)
            .filter(CentrePoste.centre_id == centre_id)
            .filter(Poste.type_poste == 'MOD')
            .order_by(Tache.ordre, Tache.id)
        )
        
        # 0.5 Calculer l'actual_moi si on est en global
        actual_moi = 0.0
        if not poste_code and centre_id:
            moi_total = (
                db.query(func.sum(CentrePoste.effectif_actuel))
                .join(Poste, CentrePoste.code_resp == Poste.Code)
                .filter(CentrePoste.centre_id == centre_id)
                .filter(Poste.type_poste != 'MOD')
                .scalar()
            ) or 0.0
            actual_moi = float(moi_total)
        
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
    seen_families = set()
    filtered_count = 0
    
    # Normalisation stricte pour la comparaison typologie (sans espaces, minuscule)
    def clean_q(s):
        if not s: return ""
        return "".join(str(s).split()).lower()

    processed_tasks = []
    for t in taches:
        # Filtre "Guichet" : si has_guichet=0, on ignore les tâches de la famille GUICHET
        famille_uo = str(t.famille_uo or "").upper().strip()
        seen_families.add(famille_uo)
        
        if params.has_guichet == 0 and famille_uo.startswith("GUICHET"):
            filtered_count += 1
            # print(f"DEBUG: Filtering out Guichet task: {t.nom_tache}")
            continue
            
        if excluded_task_ids and t.id in excluded_task_ids:
            filtered_count += 1
            # print(f"DEBUG: Filtering out excluded task (Optimized mode): {t.id} - {t.nom_tache}")
            continue
        
        if excluded_task_quadruplets:
            t_q = (
                clean_q(t.nom_tache),
                clean_q(t.produit),
                clean_q(t.famille_uo),
                clean_q(t.unite_mesure)
            )
            if t_q in excluded_task_quadruplets:
                filtered_count += 1
                # print(f"DEBUG: Filtering out excluded task by quadruplet: {t.id} - {t.nom_tache}")
                continue
        
        processed_tasks.append(t)

    for t in processed_tasks:
        res = calculate_task_duration(t, local_volumes, params, poste_map, role_mapping)
        task_results.append(res)
        total_heures += res.heures_calculees
        
    # Calcul Capacité Nette (Net Capacity)
    # Heures Prod = 8h * Productivité
    # Capacité Nette = Heures Prod - Temps Mort
    # Capacité "heures nettes" basée sur une journée standard de 8h30
    heures_prod = 8.5 * (params.productivite / 100.0)
    capacite_nette = max(0.1, heures_prod - (params.idle_minutes/60.0))
    
    # Capacité Facteur = Capacité Nette - (Trajet A/R)
    # duree_trajet est en minutes pour un aller simple (x2 pour A/R)
    capacite_facteur = max(0.1, capacite_nette - ((params.duree_trajet * 2) / 60.0))

    # Calcul des ressources par poste (Intervenant)
    # Les clés sont normalisées (UPPERCASE + strip) pour garantir la cohérence
    # avec les labels envoyés au frontend (qui compare toujours en .toUpperCase())
    ressources_par_poste = {}
    for res in task_results:
        resp = (res.responsable or "N/A").strip().upper()
        if resp not in ressources_par_poste:
            ressources_par_poste[resp] = 0.0
        
        # Choisir la capacité appropriée : Facteur ou Standard
        capa_eff = capacite_facteur if is_factor_role(resp) else capacite_nette
        
        # ETP pour cette tâche = Heures / Capacité Effective
        ressources_par_poste[resp] += (res.heures_calculees / capa_eff)

    # ETP Calculé = Somme des ETPs par poste
    fte_calcule = sum(ressources_par_poste.values())
    
    print(f"DEBUG: centre={centre_id} total_heures={total_heures} capacite_nette={capacite_nette} capacite_facteur={capacite_facteur} fte_calcule={fte_calcule}")
    if total_heures > 0:
        print(f"DEBUG: Sample tasks responsible for load: {[ (t.task_name, t.heures_calculees) for t in task_results[:5] ]}")
    
    return BandoengSimulationResult(
        tasks=task_results,
        total_heures=total_heures,
        heures_net_jour=capacite_nette,
        fte_calcule=fte_calcule,
        fte_arrondi=int(round(fte_calcule + actual_moi)),
        total_ressources_humaines=fte_calcule + actual_moi,
        ressources_par_poste=ressources_par_poste,
        grid_values=local_volumes.grid_values,
        debug_info={
            "shift_received": params.shift,
            "has_guichet_received": params.has_guichet,
            "seen_families": list(seen_families),
            "filtered_guichet_count": filtered_count,
            "total_tasks_polled": len(taches)
        }
    )