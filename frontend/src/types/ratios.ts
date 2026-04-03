export type Timeframe = "mois" | "jour" | "heure";

export interface SimulationParams {
  sacs_jour: number;
  dossiers_mois: number;
  productivite: number;
}

export interface CalculatedFields {
  dossiers_par_jour: number;
  heures_net_par_jour: number;
  volume_activites_par_heure_total: number;
}

export interface RatioRow {
  position: string;
  effectif_actuel: number;
  effectif_calcule: number;
  effectif_recommande: number;
  volume_moyen_mois_actuel: number;
  volume_moyen_mois_calcule: number;
  volume_moyen_mois_recommande: number;
  volume_moyen_jour_actuel: number;
  volume_moyen_jour_calcule: number;
  volume_moyen_jour_recommande: number;
  volume_moyen_heure_actuel: number;
  volume_moyen_heure_calcule: number;
  volume_moyen_heure_recommande: number;
}

export interface SummaryRow extends RatioRow {
  is_total: boolean;
}

export interface AdequationIndex {
  effectif_actuel: number;
  effectif_calcule: number;
  effectif_recommande: number;
  indice_calc_vs_actuel: number;
  indice_reco_vs_actuel: number;
  indice_reco_vs_calc: number;
}

export interface ChartPoint {
  position: string;
  actuel: number;
  calcule: number;
  recommande: number;
  is_total?: boolean;
}

export interface ChartSeries {
  type: Timeframe;
  title: string;
  points: ChartPoint[];
}

export interface RatiosSimulationResponse {
  params: SimulationParams;
  calculated_fields: CalculatedFields;
  rows: RatioRow[];
  summary: SummaryRow;
  adequation: AdequationIndex;
  charts: ChartSeries[];
}

export interface ExportPayload extends SimulationParams {
  scope: "global" | "mois" | "jour" | "heure";
  format: "csv" | "excel";
}
