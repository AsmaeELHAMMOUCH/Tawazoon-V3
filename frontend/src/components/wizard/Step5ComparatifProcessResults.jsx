import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ChevronDown,
  ChevronRight,
  DollarSign,
  Play,
  User,
  Zap,
  TrendingUp,
  Calculator,
} from "lucide-react";

import AdequationComparatifDialog from "@/components/wizard/AdequationComparatifDialog";
import CapaciteNominaleComparatifDialog from "@/components/wizard/CapaciteNominaleComparatifDialog";
import ChiffrageComparatifDialog from "@/components/wizard/ChiffrageComparatifDialog";
// Modular Components
import DeltaBadge from "@/components/wizard/DeltaBadge";
import KPICardGlass from "@/components/wizard/KPICardGlass";
import EffectifFooter from "@/components/wizard/EffectifFooter";
import ComparisonTable from "@/components/wizard/comparison/ComparisonTable";
import ScenarioSummaryCards from "@/components/wizard/comparison/ScenarioSummaryCards";

// Business Logic Utils
import {
  isMoiPoste,
  safeNumber,
  formatSigned,
  computeGlobalKpi,
  computeScenarioKpiSelection,
  computeDbEffectifSelection,
} from "@/lib/comparison-utils";

export default function Step5ComparatifProcessResults({
  wizardData,
  centreDetails,
  postes,
  loading,
  setLoading,
  registerLaunchHandler,
  onStep5ValidChange,
}) {
  const [comparatif, setComparatif] = useState(null);
  const [selectedIntervenant, setSelectedIntervenant] = useState("all");
  const [showAdditionalSections, setShowAdditionalSections] = useState(false);
  const [showAdequationDialog, setShowAdequationDialog] = useState(false);
  const [showCapaciteNominaleDialog, setShowCapaciteNominaleDialog] = useState(false);
  const [showChiffrageDialog, setShowChiffrageDialog] = useState(false);



  const payloadBase = useMemo(() => {
    // This payload must match StepWizardSimulation's handleLaunchSimulation
    return {
      centre_id: wizardData.centre,
      grid_values: wizardData.gridValues,
      parameters: {
        productivite: wizardData.productivite,
        idle_minutes: wizardData.idleMinutes,
        shift: wizardData.shift,
        coeff_geo: wizardData.natureGeo,
        coeff_circ: wizardData.tauxComplexite,
        duree_trajet: wizardData.dureeTrajet,
        pct_axes: wizardData.pctAxesArrivee,
        pct_local: wizardData.pctAxesDepart,
        pct_national: wizardData.pctNational,
        pct_international: wizardData.pctInternational,
        pct_collecte: wizardData.pctCollecte,
        pct_guichet: wizardData.pctGuichet,
        pct_retour: wizardData.pctRetour,
        pct_marche_ordinaire: wizardData.pctMarcheOrdinaire,
        pct_vague_master: wizardData.pctVagueMaster,
        pct_boite_postale: wizardData.pctBoitePostale,
        pct_crbt: wizardData.pctCrbt,
        pct_hors_crbt: wizardData.pctHorsCrbt,
        colis_amana_par_canva_sac: wizardData.colisAmanaParCanvaSac,
        nbr_co_sac: wizardData.nbrCoSac,
        nbr_cr_sac: wizardData.nbrCrSac,
        cr_par_caisson: wizardData.crParCaisson,
        ed_percent: wizardData.edPercent,
        has_guichet: wizardData.hasGuichet,

        // AMANA
        amana_pct_collecte: wizardData.amana_pctCollecte,
        amana_pct_guichet: wizardData.amana_pctGuichet,
        amana_pct_retour: wizardData.amana_pctRetour,
        amana_pct_axes_arrivee: wizardData.amana_pctAxesArrivee,
        amana_pct_axes_depart: wizardData.amana_pctAxesDepart,
        amana_pct_national: wizardData.amana_pctNational,
        amana_pct_international: wizardData.amana_pctInternational,
        amana_pct_marche_ordinaire: wizardData.amana_pctMarcheOrdinaire,
        amana_pct_crbt: wizardData.amana_pctCrbt,
        amana_pct_hors_crbt: wizardData.amana_pctHorsCrbt,

        // CO
        co_pct_collecte: wizardData.co_pctCollecte,
        co_pct_guichet: wizardData.co_pctGuichet,
        co_pct_retour: wizardData.co_pctRetour,
        co_pct_axes_arrivee: wizardData.co_pctAxesArrivee,
        co_pct_axes_depart: wizardData.co_pctAxesDepart,
        co_pct_national: wizardData.co_pctNational,
        co_pct_international: wizardData.co_pctInternational,
        co_pct_marche_ordinaire: wizardData.co_pctMarcheOrdinaire,
        co_pct_vague_master: wizardData.co_pctVagueMaster,
        co_pct_boite_postale: wizardData.co_pctBoitePostale,

        // CR
        cr_pct_collecte: wizardData.cr_pctCollecte,
        cr_pct_guichet: wizardData.cr_pctGuichet,
        cr_pct_retour: wizardData.cr_pctRetour,
        cr_pct_axes_arrivee: wizardData.cr_pctAxesArrivee,
        cr_pct_axes_depart: wizardData.cr_pctAxesDepart,
        cr_pct_national: wizardData.cr_pctNational,
        cr_pct_international: wizardData.cr_pctInternational,
        cr_pct_marche_ordinaire: wizardData.cr_pctMarcheOrdinaire,
        cr_pct_vague_master: wizardData.cr_pctVagueMaster,
        cr_pct_boite_postale: wizardData.cr_pctBoitePostale,
        cr_pct_crbt: wizardData.cr_pctCrbt,
        cr_pct_hors_crbt: wizardData.cr_pctHorsCrbt,
      },
    };
  }, [wizardData]);

  const launchComparatif = useCallback(async () => {
    if (!wizardData.centre) {
      toast.error("Centre manquant. Revenir à l'étape 1.");
      return;
    }
    if (!centreDetails) {
      toast.error("Détails du centre indisponibles. Attendez le chargement.");
      return;
    }
    if (!wizardData.gridValues) {
      toast.error("Volumes indisponibles. Revenir à l'étape 2.");
      return;
    }

    setShowAdditionalSections(false);
    setLoading(true);
    try {
      const scenarios = [
        { key: "actuel", label: "Actuel", mode: "actuel" },
        { key: "consolide", label: "Consolidé", mode: "recommande" },
        { key: "optimise", label: "Optimisé", mode: "optimise" },
      ];

      const settled = await Promise.allSettled(
        scenarios.map((s) => api.bandoengSimulate({ ...payloadBase, mode: s.mode }))
      );

      const next = {};
      const errors = {};

      settled.forEach((res, idx) => {
        const s = scenarios[idx];
        if (res.status === "fulfilled") {
          const kpi = computeGlobalKpi({ simulationResults: res.value, centreDetails });
          next[s.key] = { response: res.value, kpi };
        } else {
          errors[s.key] = res.reason?.message || String(res.reason || "Erreur");
        }
      });

      setComparatif({ scenarios, kpis: next, errors });

      const hasActuel = !!next.actuel?.kpi;
      onStep5ValidChange(hasActuel);

      if (!hasActuel) {
        toast.error("Le scénario Actuel a échoué, impossible de calculer les écarts.");
      } else if (next.consolide?.kpi || next.optimise?.kpi) {
        toast.success("Comparatif calculé avec succès !");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du calcul du comparatif.");
      onStep5ValidChange(false);
    } finally {
      setLoading(false);
    }
  }, [wizardData, centreDetails, payloadBase, setLoading, onStep5ValidChange]);

  useEffect(() => {
    if (!registerLaunchHandler) return;
    registerLaunchHandler(() => launchComparatif());
  }, [registerLaunchHandler, launchComparatif]);

  const responseActuel = comparatif?.kpis?.actuel?.response || null;
  const responseConsolide = comparatif?.kpis?.consolide?.response || null;
  const responseOptimise = comparatif?.kpis?.optimise?.response || null;

  const simulationResultsForDialogs = responseActuel;

  // Same dropdown logic as normal simulation: active responsables + mapped roles fallback.
  const filteredPostes = useMemo(() => {
    const tasks = [
      ...(responseActuel?.tasks || []),
      ...(responseConsolide?.tasks || []),
      ...(responseOptimise?.tasks || []),
    ];

    const activeResponsibles = new Set(
      tasks.map((t) => (t.responsable || "").toUpperCase().trim())
    );

    const existingActive = (postes || []).filter((p) => {
      const label = (p.label || p.nom || "").toUpperCase().trim();
      return activeResponsibles.has(label);
    });

    const processedLabels = new Set(
      existingActive.map((p) => (p.label || p.nom || "").toUpperCase().trim())
    );

    const newRoles = Array.from(activeResponsibles)
      .filter((label) => label && !processedLabels.has(label))
      .map((label) => ({
        id: `mapped-${label}`,
        label,
        nom: label,
        isNew: true,
      }));

    const result = [...existingActive, ...newRoles];

    if (result.length === 0) {
      return postes || [];
    }

    return result.sort((a, b) =>
      (a.label || a.nom || "").localeCompare(b.label || b.nom || "")
    );
  }, [postes, responseActuel, responseConsolide, responseOptimise]);

  const selectedPosteObj = useMemo(() => {
    if (selectedIntervenant === "all") return null;
    return filteredPostes.find((p) => String(p.id) === String(selectedIntervenant)) || null;
  }, [filteredPostes, selectedIntervenant]);

  const kpiDb = useMemo(() => {
    return computeDbEffectifSelection({
      centreDetails,
      simulationResultsActuel: responseActuel,
      selectedPosteObj,
    });
  }, [centreDetails, responseActuel, selectedPosteObj]);

  const kpiActuel = useMemo(() => {
    return computeScenarioKpiSelection({
      simulationResults: responseActuel,
      actualBaselineResults: responseActuel,
      centreDetails,
      selectedPosteObj,
    });
  }, [responseActuel, centreDetails, selectedPosteObj]);

  const kpiConsolide = useMemo(() => {
    return computeScenarioKpiSelection({
      simulationResults: responseConsolide,
      actualBaselineResults: responseActuel,
      centreDetails,
      selectedPosteObj,
    });
  }, [responseConsolide, responseActuel, centreDetails, selectedPosteObj]);

  const kpiOptimise = useMemo(() => {
    return computeScenarioKpiSelection({
      simulationResults: responseOptimise,
      actualBaselineResults: responseActuel,
      centreDetails,
      selectedPosteObj,
    });
  }, [responseOptimise, responseActuel, centreDetails, selectedPosteObj]);

  const isGlobalView = selectedIntervenant === "all";

  const toEtpNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const dbEtp = toEtpNumber(kpiDb?.total);
  const actuelEtp = toEtpNumber(kpiActuel?.totalCalculated);
  const consolideEtp = toEtpNumber(kpiConsolide?.totalCalculated);
  const optimiseEtp = toEtpNumber(kpiOptimise?.totalCalculated);

  const maxEtp = Math.max(dbEtp || 0, actuelEtp || 0, consolideEtp || 0, optimiseEtp || 0);

  const deltaToDb = (value) => {
    if (value === null || value === undefined) return null;
    if (dbEtp === null || dbEtp === undefined) return null;
    return Math.round(value - dbEtp);
  };

  const heuresNet = useMemo(() => {
    const prod = Number(wizardData.productivite || 100) / 100;
    const idleH = Number(wizardData.idleMinutes || 0) / 60;
    return Math.max(0, 8.5 * prod - idleH).toFixed(2);
  }, [wizardData.productivite, wizardData.idleMinutes]);


  const deltaActuel = deltaToDb(actuelEtp) ?? 0;
  const deltaConsolide = deltaToDb(consolideEtp) ?? 0;
  const deltaOptimise = deltaToDb(optimiseEtp) ?? 0;

  const maxDeltaAbs = Math.max(
    Math.abs(deltaActuel || 0),
    Math.abs(deltaConsolide || 0),
    Math.abs(deltaOptimise || 0)
  );

  const etpChartMax = maxEtp === 0 ? 1 : Math.ceil(maxEtp * 1.15);
  const deltaChartBound = maxDeltaAbs === 0 ? 1 : Math.ceil(maxDeltaAbs * 1.25);

  const memoizedPerPosteData = useMemo(() => {
    if (!comparatif) return [];

    return filteredPostes.map((p) => {
      const dbKpi = computeDbEffectifSelection({
        centreDetails,
        simulationResultsActuel: responseActuel,
        selectedPosteObj: p,
      });
      const actuelKpi = computeScenarioKpiSelection({
        simulationResults: responseActuel,
        actualBaselineResults: responseActuel,
        centreDetails,
        selectedPosteObj: p,
      });
      const consolideKpi = computeScenarioKpiSelection({
        simulationResults: responseConsolide,
        actualBaselineResults: responseActuel,
        centreDetails,
        selectedPosteObj: p,
      });
      const optimiseKpi = computeScenarioKpiSelection({
        simulationResults: responseOptimise,
        actualBaselineResults: responseActuel,
        centreDetails,
        selectedPosteObj: p,
      });

      const db = toEtpNumber(dbKpi?.total);
      const calc = toEtpNumber(actuelKpi?.totalCalculated);
      const cons = toEtpNumber(consolideKpi?.totalCalculated);
      const opt = toEtpNumber(optimiseKpi?.totalCalculated);

      // Deltas requested:
      // vs Actuel (DB) for all 3 scenarios
      const dCalcVsDb = calc !== null && db !== null ? calc - db : 0;
      const dConsVsDb = cons !== null && db !== null ? cons - db : 0;
      const dOptVsDb = opt !== null && db !== null ? opt - db : 0;

      // vs Calculé for Consolidé and Optimisé
      const dConsVsCalc = cons !== null && calc !== null ? cons - calc : 0;
      const dOptVsCalc = opt !== null && calc !== null ? opt - calc : 0;

      return {
        id: p.id,
        label: p.label || p.nom,
        db,
        calc,
        cons,
        opt,
        dCalcVsDb,
        dConsVsDb,
        dOptVsDb,
        dConsVsCalc,
        dOptVsCalc,
      };
    });
  }, [
    comparatif,
    filteredPostes,
    centreDetails,
    responseActuel,
    responseConsolide,
    responseOptimise,
  ]);

  const filteredTableData = useMemo(() => {
    if (selectedIntervenant === "all") return memoizedPerPosteData;
    return memoizedPerPosteData.filter((row) => String(row.id) === String(selectedIntervenant));
  }, [memoizedPerPosteData, selectedIntervenant]);





  return (
    <div className="wizard-step-content space-y-4 p-4 text-xs bg-slate-50">
      <div className="text-center mb-1.5 bg-white rounded-xl border border-blue-100 px-3 py-2 shadow-sm">
        <h2 className="text-xl md:text-2xl font-black text-[#0b3f6f] mb-0.5 tracking-tight">
          Comparatif des processus
        </h2>
        <p className="text-xs text-slate-600 max-w-2xl mx-auto">
          Sans détail par tâche : uniquement l&apos;ETP final par scénario + sections additionnelles.
        </p>
      </div>

      {!comparatif && (
        <Card className="wizard-card border-blue-200 bg-gradient-to-br from-blue-50/40 to-white">
          <CardContent className="p-8 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center shadow-sm">
                <Play className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-2">
                  Lancer le comparatif
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ce module exécute 3 simulations (calculé, consolidé, optimisé) et affiche l&apos;ETP final.
                </p>
              </div>
              <Button
                onClick={() => launchComparatif()}
                disabled={loading || !wizardData.centre}
                className="bg-gradient-to-r from-[#005EA8] to-[#0A6BBC] hover:from-[#004e8a] hover:to-[#085a9c] text-white px-8 py-2.5 text-sm font-bold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Calculator className="w-4 h-4 mr-2 animate-spin" />
                    Calcul en cours...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Lancer le comparatif
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {comparatif && (
        <div className="max-w-6xl mx-auto space-y-3">
          {postes && postes.length > 0 && (
            <Card className="wizard-card compact-card">
              <CardContent className="p-2.5">
                <div className="flex items-center gap-3">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Filtrer par intervenant
                  </Label>
                  <Select value={selectedIntervenant} onValueChange={setSelectedIntervenant}>
                    <SelectTrigger className="h-7 text-xs bg-white border-slate-200 max-w-xs">
                      <SelectValue placeholder="-- Tous --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">-- Tous les intervenants --</SelectItem>
                      {filteredPostes.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.label || p.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── 4-COLUMN SCENARIO COMPARISON (DB ref + 3 scenarios) ──────── */}
          {(() => {
            const dbPct = maxEtp > 0 ? Math.min(100, ((dbEtp ?? 0) / maxEtp) * 100) : 0;

            const scenarios = [
              {
                key: "actuel",
                label: "",
                badge: "CALCULÉ",
                badgeColor: "bg-sky-300 text-sky-800",
                headerGrad: "from-sky-100 to-sky-200",
                glowColor: deltaActuel === 0 ? "from-sky-400/10" : "from-sky-400/20",
                accentText: "text-blue-600",
                accentBg: "bg-blue-100",
                accentBorder: "border-blue-200",
                kpi: kpiActuel,
                etp: actuelEtp,
                delta: deltaActuel,
                themeColor: "text-blue-900",
                barTrack: "bg-sky-200/40",
                barFill: "bg-blue-500",
              },
              {
                key: "consolide",
                label: "Effectif Consolidé",
                badge: "CONSOLIDÉ",
                badgeColor: "bg-amber-200 text-amber-800",
                headerGrad: "from-amber-50 to-amber-100",
                glowColor: "from-amber-400/15",
                accentText: "text-amber-700",
                accentBg: "bg-amber-50",
                accentBorder: "border-amber-100",
                kpi: kpiConsolide,
                etp: consolideEtp,
                delta: deltaConsolide,
                themeColor: "text-amber-900",
                barTrack: "bg-amber-200/30",
                barFill: "bg-amber-500",
              },
              {
                key: "optimise",
                label: "Effectif Optimisé",
                badge: "OPTIMISÉ",
                badgeColor: "bg-emerald-200 text-emerald-800",
                headerGrad: "from-emerald-50 to-emerald-100",
                glowColor: "from-emerald-400/15",
                accentText: "text-emerald-700",
                accentBg: "bg-emerald-50",
                accentBorder: "border-emerald-100",
                kpi: kpiOptimise,
                etp: optimiseEtp,
                delta: deltaOptimise,
                themeColor: "text-emerald-900",
                barTrack: "bg-emerald-200/30",
                barFill: "bg-emerald-500",
              },
            ];

            return (
              <div className="space-y-8">
                <ScenarioSummaryCards
                  kpiDb={kpiDb}
                  dbPct={dbPct}
                  maxEtp={maxEtp}
                  scenarios={scenarios}
                  isGlobalView={isGlobalView}
                />

                <ComparisonTable data={filteredTableData} />
              </div>
            );
          })()}



          <div className="mt-8">
            <div className="flex items-center mb-6">
              <button
                type="button"
                onClick={() => setShowAdditionalSections(!showAdditionalSections)}
                className="flex items-center gap-3 group focus:outline-none"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300 ${showAdditionalSections
                    ? "bg-blue-100 text-[#005EA8] rotate-0"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                >
                  {showAdditionalSections ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-slate-800 text-lg group-hover:text-[#005EA8] transition-colors">
                    Sections Additionnelles
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cliquez pour {showAdditionalSections ? "masquer" : "afficher"} les modules
                  </p>
                </div>
              </button>
            </div>

            {showAdditionalSections && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Capacité nominale */}
                  <button
                    type="button"
                    onClick={() => setShowCapaciteNominaleDialog(true)}
                    className="group relative overflow-hidden rounded-xl border border-cyan-200/60 bg-gradient-to-br from-white via-cyan-50/30 to-cyan-100/20 p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-cyan-300"
                  >
                    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-cyan-400/20 to-transparent blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />
                    <div className="relative flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg group-hover:scale-110 transition-transform">
                        <Zap className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-base">Capacité nominale</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Capacité de production</p>
                      </div>
                    </div>
                  </button>

                  {/* Index d'adéquation */}
                  <button
                    type="button"
                    onClick={() => setShowAdequationDialog(true)}
                    className="group relative overflow-hidden rounded-xl border border-emerald-200/60 bg-gradient-to-br from-white via-emerald-50/30 to-emerald-100/20 p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-300"
                  >
                    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400/20 to-transparent blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />
                    <div className="relative flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-base">Index d&apos;adéquation</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Mesure de performance</p>
                      </div>
                    </div>
                  </button>

                  {/* Chiffrage */}
                  <button
                    type="button"
                    onClick={() => setShowChiffrageDialog(true)}
                    className="group relative overflow-hidden rounded-xl border border-amber-200/60 bg-gradient-to-br from-white via-amber-50/30 to-amber-100/20 p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-amber-300"
                  >
                    <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-amber-400/20 to-transparent blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />
                    <div className="relative flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg group-hover:scale-110 transition-transform">
                        <DollarSign className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-base">Chiffrage</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Estimation des coûts</p>
                      </div>
                    </div>
                  </button>

                </div>
              </div>
            )}
          </div>

          {(comparatif.errors?.consolide || comparatif.errors?.optimise) && (
            <div className="text-[11px] text-slate-600">
              {comparatif.errors?.consolide && (
                <div className="mt-1">
                  Consolidé en erreur : <span className="font-semibold">{comparatif.errors.consolide}</span>
                </div>
              )}
              {comparatif.errors?.optimise && (
                <div className="mt-1">
                  Optimisé en erreur : <span className="font-semibold">{comparatif.errors.optimise}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <AdequationComparatifDialog
        open={showAdequationDialog}
        onOpenChange={setShowAdequationDialog}
        postes={postes}
        centreDetails={centreDetails}
        responseActuel={responseActuel}
        responseConsolide={responseConsolide}
        responseOptimise={responseOptimise}
        selectedPosteObj={selectedPosteObj}
      />

      <CapaciteNominaleComparatifDialog
        open={showCapaciteNominaleDialog}
        onOpenChange={setShowCapaciteNominaleDialog}
        data={{ ...wizardData, heuresNet }}
        responseActuel={responseActuel}
        responseConsolide={responseConsolide}
        responseOptimise={responseOptimise}
        postes={postes}
        centreDetails={centreDetails}
      />

      <ChiffrageComparatifDialog
        open={showChiffrageDialog}
        onOpenChange={setShowChiffrageDialog}
        responseActuel={responseActuel}
        responseConsolide={responseConsolide}
        responseOptimise={responseOptimise}
        postes={postes}
      />

    </div>
  );
}

