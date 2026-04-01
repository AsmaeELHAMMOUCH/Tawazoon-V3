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
  RotateCcw,
} from "lucide-react";

import AdequationComparatifDialog from "@/components/wizard/AdequationComparatifDialog";
import CapaciteNominaleComparatifDialog from "@/components/wizard/CapaciteNominaleComparatifDialog";
import ChiffrageComparatifDialog from "@/components/wizard/ChiffrageComparatifDialog";
// Modular Components
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
      <div className="text-center mb-1.5 rounded-2xl border border-slate-200/50 bg-gradient-to-br from-white via-slate-50/40 to-blue-50/20 px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_32px_-12px_rgba(15,23,42,0.07)]">
        <h2 className="text-xl md:text-2xl font-black text-[#0b3f6f] mb-0.5 tracking-tight">
          Comparatif des scénarios
        </h2>
        <p className="text-xs text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Sans détail par tâche : uniquement l&apos;ETP final par scénario + sections additionnelles.
        </p>
      </div>

      {!comparatif && (
        <Card className="wizard-card border-slate-200/50 bg-gradient-to-br from-white via-blue-50/15 to-slate-50/30 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.08)]">
          <CardContent className="p-8 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border border-blue-100/80 bg-gradient-to-br from-blue-50/90 to-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <Play className="w-8 h-8 text-[#005EA8]/80" />
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
                className="bg-gradient-to-r from-[#005EA8] via-[#0A6BBC] to-[#005EA8] hover:brightness-[0.97] text-white px-8 py-2.5 text-sm font-bold shadow-[0_8px_24px_-6px_rgba(0,94,168,0.45)] hover:shadow-[0_12px_28px_-6px_rgba(0,94,168,0.4)] transition-all duration-300 rounded-xl"
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
            <Card className="wizard-card compact-card border-slate-200/50 bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <CardContent className="p-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Filtrer par intervenant
                  </Label>
                  <Select value={selectedIntervenant} onValueChange={setSelectedIntervenant}>
                    <SelectTrigger className="h-7 text-xs bg-slate-50/50 border-slate-200/70 max-w-xs rounded-lg">
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={selectedIntervenant === "all"}
                    onClick={() => setSelectedIntervenant("all")}
                    className="h-7 text-[10px] font-bold gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#005EA8] disabled:opacity-40"
                  >
                    <RotateCcw className="w-3 h-3 shrink-0" />
                    Réinitialiser le filtre
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── 4-COLUMN SCENARIO COMPARISON (DB ref + 3 scenarios) ──────── */}
          {(() => {
            const dbPct = maxEtp > 0 ? Math.min(100, ((dbEtp ?? 0) / maxEtp) * 100) : 0;

            /* Scénarios : dégradés d’en-tête très doux ; halos légers ; barres lisibles mais pas agressives */
            const scenarios = [
              {
                key: "actuel",
                label: "",
                badge: "CALCULÉ",
                badgeColor: "bg-blue-50/95 text-blue-900/90 border border-blue-100/80",
                headerGrad: "from-white via-blue-50/45 to-slate-50/25",
                glowColor: deltaActuel === 0 ? "from-blue-400/5" : "from-blue-500/10",
                accentText: "text-blue-700",
                accentBg: "bg-blue-100",
                accentBorder: "border-blue-200",
                kpi: kpiActuel,
                etp: actuelEtp,
                delta: deltaActuel,
                themeColor: "text-blue-950",
                barTrack: "bg-blue-100/80",
                barFill: "bg-gradient-to-r from-blue-400 to-blue-500",
              },
              {
                key: "consolide",
                label: "Effectif Consolidé",
                badge: "CONSOLIDÉ",
                badgeColor: "bg-[#005EA8]/10 text-[#005EA8] border border-[#005EA8]/15",
                headerGrad: "from-white via-blue-50/55 to-sky-50/20",
                glowColor: "from-[#005EA8]/10",
                accentText: "text-[#005EA8]",
                accentBg: "bg-blue-100",
                accentBorder: "border-blue-300",
                kpi: kpiConsolide,
                etp: consolideEtp,
                delta: deltaConsolide,
                themeColor: "text-blue-950",
                barTrack: "bg-[#005EA8]/15",
                barFill: "bg-gradient-to-r from-[#0A6BBC] to-[#005EA8]",
              },
              {
                key: "optimise",
                label: "Effectif Optimisé",
                badge: "OPTIMISÉ",
                badgeColor: "bg-slate-800/90 text-white border border-slate-700/25 shadow-sm",
                headerGrad: "from-slate-50/60 via-blue-50/35 to-white",
                glowColor: "from-blue-900/8",
                accentText: "text-[#0A2A4A]",
                accentBg: "bg-blue-200/50",
                accentBorder: "border-blue-400",
                kpi: kpiOptimise,
                etp: optimiseEtp,
                delta: deltaOptimise,
                themeColor: "text-[#061a2e]",
                barTrack: "bg-slate-200/70",
                barFill: "bg-gradient-to-r from-slate-600 to-blue-950",
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
                    className="group relative overflow-hidden rounded-2xl border border-slate-200/50 bg-gradient-to-br from-white via-blue-50/20 to-slate-50/40 p-6 text-left transition-all duration-300 hover:shadow-[0_16px_48px_-12px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:border-blue-200/50"
                  >
                    <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-[#005EA8]/10 to-transparent blur-2xl opacity-70 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#005EA8] to-[#0A6BBC] shadow-[0_8px_20px_-6px_rgba(0,94,168,0.35)] group-hover:scale-[1.04] transition-transform duration-300">
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
                    className="group relative overflow-hidden rounded-2xl border border-slate-200/50 bg-gradient-to-br from-white via-sky-50/25 to-blue-50/15 p-6 text-left transition-all duration-300 hover:shadow-[0_16px_48px_-12px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:border-sky-200/45"
                  >
                    <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-sky-400/10 to-transparent blur-2xl opacity-70 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A6BBC] to-blue-900 shadow-[0_8px_20px_-6px_rgba(10,107,188,0.3)] group-hover:scale-[1.04] transition-transform duration-300">
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
                    className="group relative overflow-hidden rounded-2xl border border-slate-200/50 bg-gradient-to-br from-white via-slate-50/80 to-blue-50/20 p-6 text-left transition-all duration-300 hover:shadow-[0_16px_48px_-12px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:border-slate-300/60"
                  >
                    <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-slate-600/10 to-transparent blur-2xl opacity-70 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-[#003d7a] shadow-[0_8px_20px_-6px_rgba(15,23,42,0.25)] group-hover:scale-[1.04] transition-transform duration-300">
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

