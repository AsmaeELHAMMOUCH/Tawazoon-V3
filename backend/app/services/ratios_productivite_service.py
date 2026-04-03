import math
from typing import List

from sqlalchemy.orm import Session

from app.schemas.ratios_productivite import (
    AdequationIndex,
    CalculatedFields,
    ChartPoint,
    ChartSeries,
    RatiosSimulationResponse,
    RatioRow,
    SimulationParams,
    SummaryRow,
)
from app.services.simulation_globale_v3 import get_simulation_globale_v3


def math_round(val: float, decimals: int = 0) -> float:
    """Arrondi mathématique standard (0.5 -> 1), comme Math.round en JS."""
    multiplier = 10 ** decimals
    return math.floor(val * multiplier + 0.5) / multiplier


def _safe_divide(value: float, denominator: float, decimals: int = 2) -> float:
    if not denominator or denominator <= 0:
        return 0.0
    return math_round(value / denominator, decimals)


def _build_chart_points(prefix: str, rows: List[RatioRow], summary: SummaryRow) -> List[ChartPoint]:
    points = []
    for row in rows:
        points.append(
            ChartPoint(
                position=row.position,
                actuel=getattr(row, f"volume_moyen_{prefix}_actuel"),
                calcule=getattr(row, f"volume_moyen_{prefix}_calcule"),
                recommande=getattr(row, f"volume_moyen_{prefix}_recommande"),
            )
        )
    points.append(
        ChartPoint(
            position="TOTAL",
            actuel=getattr(summary, f"volume_moyen_{prefix}_actuel"),
            calcule=getattr(summary, f"volume_moyen_{prefix}_calcule"),
            recommande=getattr(summary, f"volume_moyen_{prefix}_recommande"),
            is_total=True,
        )
    )
    return points


def _build_adequation_index(summary: SummaryRow) -> AdequationIndex:
    def pct(numer: float, denom: float) -> float:
        if not denom or denom == 0:
            return 0.0
        return round((numer / denom) * 100.0, 2)

    return AdequationIndex(
        effectif_actuel=summary.effectif_actuel,
        effectif_calcule=summary.effectif_calcule,
        effectif_recommande=summary.effectif_recommande,
        indice_calc_vs_actuel=pct(summary.effectif_actuel, summary.effectif_calcule),
        indice_reco_vs_actuel=pct(summary.effectif_actuel, summary.effectif_recommande),
        indice_reco_vs_calc=pct(summary.effectif_calcule, summary.effectif_recommande),
    )


def simulate_ratios_productivite(db: Session, params: SimulationParams) -> RatiosSimulationResponse:
    # Volumes de référence bruts pour les divisions (précision maximale)
    doss_j_raw = params.dossiers_mois / 22.0
    h_net_raw = (8.0 * params.productivite) / 100.0
    if h_net_raw <= 0: h_net_raw = 0.0001
    vol_h_raw = doss_j_raw / h_net_raw

    simulation = get_simulation_globale_v3(db, params.sacs_jour, params.dossiers_mois, params.productivite)
    exposed_rows = []
    
    # L'utilisateur doit pouvoir vérifier les calculs à la calculatrice avec les entiers affichés.
    for row in simulation["rows"]:
        # Staffing arrondi (affichage)
        eff_act_r = math_round(float(row["actuel"] or 0))
        eff_calc_r = math_round(float(row["calcule"] or 0))
        eff_reco_r = math_round(float(row["recommande"] or 0))
        
        exposed_rows.append(
            RatioRow(
                position=row["position"],
                effectif_actuel=float(eff_act_r),
                effectif_calcule=float(eff_calc_r),
                effectif_recommande=float(eff_reco_r),
                volume_moyen_mois_actuel=_safe_divide(params.dossiers_mois, eff_act_r, 0),
                volume_moyen_mois_calcule=_safe_divide(params.dossiers_mois, eff_calc_r, 0),
                volume_moyen_mois_recommande=_safe_divide(params.dossiers_mois, eff_reco_r, 0),
                volume_moyen_jour_actuel=_safe_divide(doss_j_raw, eff_act_r, 2),
                volume_moyen_jour_calcule=_safe_divide(doss_j_raw, eff_calc_r, 2),
                volume_moyen_jour_recommande=_safe_divide(doss_j_raw, eff_reco_r, 2),
                volume_moyen_heure_actuel=_safe_divide(vol_h_raw, eff_act_r, 2),
                volume_moyen_heure_calcule=_safe_divide(vol_h_raw, eff_calc_r, 2),
                volume_moyen_heure_recommande=_safe_divide(vol_h_raw, eff_reco_r, 2),
            )
        )

    # Calcul du résumé : 
    # Les effectifs sont les sommes des arrondis (cohérence visuelle)
    # Les ratios sont basés sur la somme réelle des besoins (cohérence analytique)
    sum_act_rounded = sum(r.effectif_actuel for r in exposed_rows)
    sum_calc_rounded = sum(r.effectif_calcule for r in exposed_rows)
    sum_reco_rounded = sum(r.effectif_recommande for r in exposed_rows)

    raw_sum_act = sum(float(r["actuel"] or 0) for r in simulation["rows"])
    raw_sum_calc = sum(float(r["calcule"] or 0) for r in simulation["rows"])
    raw_sum_reco = sum(float(r["recommande"] or 0) for r in simulation["rows"])
    
    summary = SummaryRow(
        position="TOTAL",
        effectif_actuel=sum_act_rounded,
        effectif_calcule=sum_calc_rounded,
        effectif_recommande=sum_reco_rounded,
        volume_moyen_mois_actuel=_safe_divide(params.dossiers_mois, sum_act_rounded, 0),
        volume_moyen_mois_calcule=_safe_divide(params.dossiers_mois, sum_calc_rounded, 0),
        volume_moyen_mois_recommande=_safe_divide(params.dossiers_mois, sum_reco_rounded, 0),
        volume_moyen_jour_actuel=_safe_divide(doss_j_raw, sum_act_rounded, 2),
        volume_moyen_jour_calcule=_safe_divide(doss_j_raw, sum_calc_rounded, 2),
        volume_moyen_jour_recommande=_safe_divide(doss_j_raw, sum_reco_rounded, 2),
        volume_moyen_heure_actuel=_safe_divide(vol_h_raw, sum_act_rounded, 2),
        volume_moyen_heure_calcule=_safe_divide(vol_h_raw, sum_calc_rounded, 2),
        volume_moyen_heure_recommande=_safe_divide(vol_h_raw, sum_reco_rounded, 2),
    )

    calculated_fields = CalculatedFields(
        dossiers_par_jour=math_round(doss_j_raw, 2),
        heures_net_par_jour=math_round(h_net_raw, 2),
        volume_activites_par_heure_total=math_round(vol_h_raw, 2),
    )

    charts = [
        ChartSeries(
            type="mois",
            title="Volume moyen / Mois",
            points=_build_chart_points("mois", exposed_rows, summary),
        ),
        ChartSeries(
            type="jour",
            title="Volume moyen / Jour",
            points=_build_chart_points("jour", exposed_rows, summary),
        ),
        ChartSeries(
            type="heure",
            title="Volume moyen / Heure",
            points=_build_chart_points("heure", exposed_rows, summary),
        ),
    ]

    return RatiosSimulationResponse(
        params=params,
        calculated_fields=calculated_fields,
        rows=exposed_rows,
        summary=summary,
        adequation=_build_adequation_index(summary),
        charts=charts,
    )
