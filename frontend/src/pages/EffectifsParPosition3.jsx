import React, { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { fetchMetiers, fetchTaches, fetchAllTaches, simuler } from "../api/simulateur";
import EsignLayout from "../components/EsignLayout";
import {
  Play,
  BarChart2,
  List,
  Settings,
  Activity,
  Clock,
  Calculator,
  Briefcase,
  Layers,
  FileText,
  Users,
  Hash,
  Check,
  ChevronLeft
} from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const defaultInputs = {
  sacs_jour: 50,
  dossiers_mois: 6500,
  productivite: 100,
};

// Utilitaires de formatage
const fmtVol = (n) => {
  if (n === "" || n === null || n === undefined) return "—";
  return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }); // Volumes entiers généralement (sacs, dossiers)
};

const fmtNb = (n) => {
  if (n === "" || n === null || n === undefined) return "—";
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function EffectifsParPosition3() {
  const [metiers, setMetiers] = useState([]);
  const [selectedMetier, setSelectedMetier] = useState("");
  const [taches, setTaches] = useState([]);
  const [inputs, setInputs] = useState(defaultInputs);
  const [outputs, setOutputs] = useState({ dossiers_jour: "", heures_net: "" });
  const [results, setResults] = useState([]);
  const [totaux, setTotaux] = useState(null);
  const [showIndex, setShowIndex] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showGraph, setShowGraph] = useState(false);
  const [showReferentiel, setShowReferentiel] = useState(false);

  const currentMetierNom = useMemo(() => {
    const found = metiers.find((m) => m.id_metier === Number(selectedMetier));
    return found?.nom_metier || "";
  }, [metiers, selectedMetier]);

  const [allMetiersRaw, setAllMetiersRaw] = useState([]); // Liste complète sans filtre
  const [referentielSelectedMetier, setReferentielSelectedMetier] = useState("all");

  // Charger les métiers au montage
  useEffect(() => {
    const loadMetiers = async () => {
      try {
        const data = await fetchMetiers();
        setAllMetiersRaw(data); // On garde tout pour le référentiel "Sans filtre"

        // Filtrer pour retirer certains métiers indésirables (insensible à la casse) pour la SIMULATION
        const excludedMetiers = ['client', 'agence', 'compta', 'automatisation', 'chef service', 'chargé réception dossier'];
        const filteredData = data.filter(m => m.nom_metier && !excludedMetiers.includes(m.nom_metier.toLowerCase()));
        setMetiers(filteredData);

        if (filteredData.length) {
          setSelectedMetier(filteredData[0].id_metier);
        }
      } catch (e) {
        console.error("fetchMetiers error", e);
        alert("Aucun métier retourné par l'API. Vérifie la connexion backend.");
      }
    };
    loadMetiers();
  }, []);

  // Charger les tâches quand le métier change
  useEffect(() => {
    const loadTaches = async () => {
      if (!selectedMetier) return;
      try {
        if (selectedMetier === "all") {
          const allTasks = [];
          for (const m of metiers) {
            const data = await fetchTaches(m.id_metier);
            const tasksWithMetier = data.map(t => ({ ...t, metierNom: m.nom_metier }));
            allTasks.push(...tasksWithMetier);
          }
          setTaches(allTasks);
        } else {
          const data = await fetchTaches(selectedMetier);
          setTaches(data);
        }
        setResults([]); // Reset preivous results
        setTotaux(null);
      } catch (e) {
        console.error("fetchTaches error", e);
        setTaches([]);
        setError(e.response?.data?.detail || "Erreur de chargement des tâches");
      }
    };
    loadTaches();
  }, [selectedMetier, metiers]);

  const [referentielTaches, setReferentielTaches] = useState([]);

  // Charger les tâches du RÉFÉRENTIEL (Indépendant de la simulation)
  useEffect(() => {
    const loadReferentiel = async () => {
      if (!allMetiersRaw.length) return;
      try {
        if (referentielSelectedMetier === "all") {
          // "Sans filtre" : on utilise l'endpoint dédié pour tout ramener d'un coup
          const data = await fetchAllTaches();
          setReferentielTaches(data);
        } else {
          const data = await fetchTaches(referentielSelectedMetier);
          setReferentielTaches(data);
        }
      } catch (e) {
        console.error("loadReferentiel error", e);
      }
    };
    loadReferentiel();
  }, [referentielSelectedMetier, allMetiersRaw]);

  const handleInputChange = (e) => {
    setInputs((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Calcul automatique des indicateurs (Dossiers/Jour et Heures/Jour) dès que les inputs changent
  useEffect(() => {
    const dossiers_jour = Number(inputs.dossiers_mois || 0) / 22;
    const prod = Number(inputs.productivite || 0) / 100;
    const heures_net = 8 * prod;

    setOutputs({
      dossiers_jour: dossiers_jour,
      heures_net: heures_net
    });
  }, [inputs]);

  const lancerSimulation = async () => {
    setError("");
    setLoading(true);
    try {
      const payload = {
        metier_id: Number(selectedMetier),
        metier_nom: currentMetierNom,
        sacs_jour: Number(inputs.sacs_jour || 0),
        dossiers_mois: Number(inputs.dossiers_mois || 0),
        productivite_pct: Number(inputs.productivite || 0),
      };
      const data = await simuler(payload);
      setOutputs({
        dossiers_jour: data.dossiers_jour,
        heures_net: data.heures_net_jour,
      });
      setResults(data.result_rows || []);
      setTotaux(data.totaux || null);
    } catch (e) {
      console.error("simuler error", e);
      setError(e.response?.data?.detail || e.message);
      setResults([]);
      setTotaux(null);
    } finally {
      setLoading(false);
    }
  };

  const resetSimulation = () => {
    setTotaux(null);
    setResults([]);
  };

  const handleGraph = () => {
    if (!taches.length) {
      alert("Aucune donnée à afficher.");
      return;
    }
    setShowGraph(true);
  };

  const toggleIndex = () => setShowIndex((v) => !v);

  return (
    <EsignLayout activeKey="Simulation par Position">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-500">

        {/* Premium Header */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200/60 p-4">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -mr-20 -mt-20 opacity-70" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center flex-col md:flex-row gap-3 text-center md:text-left">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  Simulation par Position
                </h1>
                <p className="text-slate-500 mt-0.5 text-xs max-w-xl">
                  Analysez et optimisez les besoins en effectifs en temps réel selon vos volumes d'activité.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="relative py-2">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 rounded-full z-0" />
          {/* Active Line Progress */}
          <div
            className="absolute top-1/2 left-0 h-0.5 bg-green-500 -translate-y-1/2 rounded-full z-0 transition-all duration-700 ease-out"
            style={{ width: totaux ? '100%' : '0%' }}
          />

          <div className="relative z-10 flex justify-between max-w-xs mx-auto w-full">
            {/* Step 1 */}
            <div className={`flex flex-col items-center gap-1.5 transition-transform duration-300 ${!totaux ? 'scale-105 cursor-pointer' : 'scale-95 opacity-80 cursor-pointer hover:opacity-100 group'}`} onClick={totaux ? resetSimulation : undefined}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-lg transition-colors duration-500 ${!totaux ? 'bg-blue-600 text-white shadow-blue-500/25 ring-2 ring-blue-100' : 'bg-blue-500 text-white shadow-blue-500/25 ring-2 ring-blue-50 group-hover:bg-blue-600'}`}>
                {!totaux ? <Settings size={14} /> : (
                  <div className="relative">
                    <Check size={14} className="stroke-[3] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 group-hover:opacity-0" />
                    <Settings size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </div>
                )}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">
                1. Paramètres
              </span>
            </div>

            {/* Step 2 */}
            <div className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${totaux ? 'scale-110 opacity-100' : 'scale-95 opacity-40 grayscale'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-lg transition-colors duration-500 ${totaux ? 'bg-green-600 text-white shadow-green-500/25 ring-2 ring-green-100' : 'bg-slate-100 text-slate-400'}`}>
                <Activity size={14} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">
                2. Résultats
              </span>
            </div>
          </div>
        </div>

        {/* Configuration Card - Single Row Layout (Maintenant Conditionnel) */}
        {!totaux && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden ring-1 ring-slate-900/5 transition-all duration-500 mb-6 animate-in slide-in-from-top-4 fade-in fill-mode-backwards">
            <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-blue-50 text-blue-600 rounded-md">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Paramètres de Simulation</h2>
              </div>
            </div>

            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Input: Sacs/Jour */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1 whitespace-nowrap text-center block">Sacs / Jour</label>
                <input
                  type="number"
                  name="sacs_jour"
                  value={inputs.sacs_jour}
                  onChange={handleInputChange}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300 shadow-inner h-[30px] text-center"
                />
              </div>

              {/* Input: Dossiers/Mois */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1 whitespace-nowrap text-center block">Dossiers / Mois</label>
                <input
                  type="number"
                  name="dossiers_mois"
                  value={inputs.dossiers_mois}
                  onChange={handleInputChange}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300 shadow-inner h-[30px] text-center"
                />
              </div>

              {/* Input: Productivité (%) */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1 whitespace-nowrap text-center block">Productivité (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    name="productivite"
                    value={inputs.productivite}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300 shadow-inner h-[30px] text-center pr-6"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[9px] font-bold">%</span>
                </div>
              </div>

              {/* Readonly: Calculated inputs */}
              <div className="space-y-1 opacity-75">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center justify-center gap-1 whitespace-nowrap">
                  <FileText size={9} /> Dossiers / Jour
                </label>
                <div className="w-full px-2 py-1.5 bg-slate-100 border border-transparent rounded-lg text-[11px] font-bold text-slate-600 shadow-none h-[30px] flex items-center justify-center truncate">
                  {fmtVol(outputs.dossiers_jour)}
                </div>
              </div>

              <div className="space-y-1 opacity-75">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center justify-center gap-1 whitespace-nowrap">
                  <Clock size={9} /> Heures / Jour
                </label>
                <div className="w-full px-2 py-1.5 bg-slate-100 border border-transparent rounded-lg text-[11px] font-bold text-slate-600 shadow-none h-[30px] flex items-center justify-center truncate">
                  {fmtNb(outputs.heures_net)}
                </div>
              </div>
            </div>

            {/* Actions Footer - Compact */}
            <div className="bg-slate-50/80 px-4 py-2 flex items-center justify-end border-t border-slate-100 gap-3 backdrop-blur-sm">
              {error && (
                <div className="flex items-center gap-1.5 text-red-600 bg-red-50 pl-2 pr-3 py-1.5 rounded-md border border-red-100 animate-in fade-in slide-in-from-right-4">
                  <div className="w-1 h-1 rounded-full bg-red-500" />
                  <span className="text-[10px] font-semibold">{error}</span>
                </div>
              )}

              <button
                onClick={lancerSimulation}
                disabled={loading}
                className="group relative inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-bold rounded-lg shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:pointer-events-none transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                {loading ? (
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-3 h-3 fill-white" />
                )}
                <span className="relative">{loading ? 'Calcul...' : 'Lancer'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Results Grid (Conditionnal) */}
        {totaux && (
          <div className="space-y-6">
            {/* View Switching / Back Section */}
            <div className="flex flex-col sm:flex-row sm:justify-start items-start sm:items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={resetSimulation}
                  className="group flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm hover:shadow-md hover:-translate-x-0.5"
                >
                  <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                  Retour
                </button>

                {/* Position Select inside Results */}
                <div className="relative group min-w-[200px]">
                  <select
                    value={selectedMetier}
                    onChange={(e) => setSelectedMetier(e.target.value)}
                    className="w-full pl-8 pr-6 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer shadow-sm group-hover:border-indigo-300 h-[32px] uppercase tracking-tight"
                  >
                    {metiers.map(m => (
                      <option key={m.id_metier} value={m.id_metier}>
                        {m.nom_metier}
                      </option>
                    ))}
                  </select>
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500">
                    <Briefcase size={12} />
                  </div>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400 group-hover:text-indigo-600 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-bottom-6 fade-in duration-500">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 justify-between relative overflow-hidden group hover:border-blue-300 transition-colors">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-full -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110" />
                <div className="relative z-10">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <Clock size={11} className="text-blue-500" />
                    Total Heures <span className="text-[8px] lowercase opacity-70 font-medium">(Act./Jour)</span>
                  </p>
                  <p className="text-xl font-black text-slate-800 tracking-tight flex items-baseline gap-1">
                    {fmtNb(totaux.total_heures)} <span className="text-xs font-semibold text-slate-400">h</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner relative z-10">
                  <Activity size={20} strokeWidth={2} />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 justify-between relative overflow-hidden group hover:border-indigo-300 transition-colors">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-bl-full -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110" />
                <div className="relative z-10">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <Calculator size={11} className="text-indigo-500" />
                    Effectif nécessaire <span className="text-[8px] lowercase opacity-70 font-medium">(base {fmtNb(totaux.base_hr)}h)</span>
                  </p>
                  <p className="text-xl font-black text-slate-800 tracking-tight flex items-baseline gap-1">
                    {fmtNb(totaux.effectif)} <span className="text-xs font-semibold text-slate-400">ETP</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner relative z-10">
                  <Calculator size={20} strokeWidth={2} />
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-4 rounded-xl border border-blue-500 shadow-lg shadow-blue-500/30 flex items-center gap-3 justify-between relative overflow-hidden group hover:shadow-blue-500/40 transition-shadow">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full -mr-12 -mt-12 transition-transform duration-700 group-hover:scale-125" />
                <div className="relative z-10">
                  <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">
                    <Users size={12} className="text-white" />
                    Effectif Arrondi nécessaire
                  </p>
                  <p className="text-2xl font-black text-white tracking-tight leading-none mt-1.5 flex items-baseline gap-1.5">
                    {fmtVol(totaux.effectif_arrondi)} <span className="text-[10px] font-bold text-blue-200 opacity-90 uppercase tracking-widest">ETP</span>
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-md relative z-10 border border-white/20 shadow-inner">
                  <Check size={22} strokeWidth={3} />
                </div>
              </div>
            </div>

            {/* Quick Tools Section */}
            <div className="flex justify-end items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
              <button
                onClick={() => {
                  setReferentielSelectedMetier(selectedMetier);
                  setShowReferentiel(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-[11px] font-extrabold hover:bg-slate-50 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
              >
                <Layers className="w-4 h-4 text-indigo-500" />
                RÉFÉRENTIEL DES TEMPS
              </button>

              <button
                onClick={handleGraph}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[11px] font-extrabold hover:bg-slate-800 transition-all shadow-lg shadow-blue-500/10 border border-slate-700 hover:-translate-y-0.5 active:translate-y-0"
              >
                <BarChart2 className="w-4 h-4 text-blue-400" />
                ANALYSE GRAPHIQUE
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 animate-in slide-in-from-bottom-8 fade-in duration-700 ease-out fill-mode-backwards">
              {/* Card: Résultats (Largeur totale désormais) */}
              <div className="bg-white rounded-xl shadow-md border border-slate-200 flex flex-col overflow-hidden ring-1 ring-blue-500/10 relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 z-30" />
                <div className="px-4 py-3 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-20 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                      <Activity size={14} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Détail des temps calculés</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wide rounded border border-slate-100 flex items-center gap-1.5">
                      <List size={11} />
                      {results.length} Activités
                    </span>
                    <span className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wide rounded border border-green-100 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Simulation Active
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-auto bg-white scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/90 backdrop-blur-sm sticky top-0 z-10 text-[9px] font-black text-slate-500 uppercase tracking-widest shadow-sm">
                      <tr>
                        <th
                          className={`px-4 py-2 text-center w-14 cursor-pointer transition-colors hover:bg-slate-100/50 ${showIndex ? 'text-blue-600' : 'text-slate-300'}`}
                          onClick={toggleIndex}
                          title={showIndex ? "Masquer l'index" : "Afficher l'index"}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <Hash size={10} className={showIndex ? "text-blue-500" : "text-slate-300"} />
                            <span>#</span>
                          </div>
                        </th>
                        <th className="px-4 py-2 border-b border-slate-100">Désignation de l'activité</th>
                        <th className="px-4 py-2 text-right border-b border-slate-100 w-28">Volume Unitaire</th>
                        <th className="px-4 py-2 text-right border-b border-slate-100 w-28">Temps Total (h)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[10px]">
                      {results.map((r, idx) => (
                        <tr key={idx} className="group hover:bg-blue-50/30 transition-all duration-200">
                          <td className="px-4 py-1.5 text-center font-mono text-slate-400 group-hover:text-blue-500 text-[9px] font-bold">
                            {showIndex ? idx + 1 : "—"}
                          </td>
                          <td className="px-4 py-1.5 font-semibold text-slate-700 group-hover:text-slate-900">{r.nom}</td>
                          <td className="px-4 py-1.5 text-right font-mono text-slate-600 font-medium">{fmtVol(r.unites)}</td>
                          <td className="px-4 py-1.5 text-right">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-black border border-blue-100/50">
                              {fmtNb(r.heures)}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {results.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-20 text-center">
                            <div className="flex flex-col items-center gap-3 grayscale opacity-30">
                              <Layers size={48} />
                              <p className="text-sm font-bold uppercase tracking-widest">Aucun résultat à afficher</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modal Graph */}
      {showGraph && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[85vh] ring-1 ring-white/20 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white">
              <div>
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2.5">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <BarChart2 size={18} />
                  </div>
                  Analyse des Temps Unitaires
                </h2>
              </div>
              <button
                onClick={() => setShowGraph(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
              >
                Fermer
              </button>
            </div>

            <div className="flex-1 p-6 bg-slate-50/50 min-h-[400px] overflow-y-auto">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm w-full" style={{ height: `${Math.max(500, taches.length * 40)}px` }}>
                <Bar
                  data={{
                    labels: [...taches]
                      .sort((a, b) => (b.minutes * 60 + b.secondes) - (a.minutes * 60 + a.secondes))
                      .map((t) =>
                        t.nom_tache.length > 40 ? t.nom_tache.substring(0, 40) + "..." : t.nom_tache
                      ),
                    datasets: [
                      {
                        label: "Durée (min)",
                        data: [...taches]
                          .sort((a, b) => (b.minutes * 60 + b.secondes) - (a.minutes * 60 + a.secondes))
                          .map((t) => (t.minutes * 60 + t.secondes) / 60),
                        backgroundColor: "#3b82f6",
                        hoverBackgroundColor: "#2563eb",
                        borderRadius: 4,
                        barThickness: 16,
                      },
                    ],
                  }}
                  options={{
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: { padding: { left: 10, right: 20, top: 20, bottom: 20 } },
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: "#1e293b",
                        padding: 12,
                        titleFont: { size: 12, family: "'Inter', sans-serif" },
                        bodyFont: { size: 12, family: "'Inter', sans-serif" },
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                          label: (ctx) => {
                            const val = ctx.raw * 60;
                            return `${Math.floor(val / 60)}m ${Math.round(val % 60)}s`;
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        grid: { color: "#f1f5f9" },
                        ticks: { font: { size: 10 }, color: "#64748b" },
                        title: { display: true, text: "Durée en minutes", font: { size: 11, weight: 'bold' }, color: "#94a3b8" }
                      },
                      y: {
                        grid: { display: false },
                        ticks: { font: { size: 11 }, color: "#475569", autoSkip: false }
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Référentiel */}
      {showReferentiel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-500">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Layers size={20} />
                </div>
                <div>
                  <h2 className="font-black text-lg text-slate-800 tracking-tight">Référentiel des Temps Unitaires</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{referentielSelectedMetier === "all" ? "" : (allMetiersRaw.find(m => String(m.id_metier) === String(referentielSelectedMetier))?.nom_metier || "")}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <select
                  value={referentielSelectedMetier}
                  onChange={(e) => setReferentielSelectedMetier(e.target.value)}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                >
                  <option value="all">Tous</option>
                  {allMetiersRaw.map(m => <option key={m.id_metier} value={m.id_metier}>{m.nom_metier}</option>)}
                </select>
                <button
                  onClick={() => setShowReferentiel(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                >
                  <ChevronLeft className="w-5 h-5 rotate-90" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-white p-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                    <tr>
                      <th
                        className={`px-4 py-2 text-center w-14 cursor-pointer transition-colors hover:bg-slate-100/50 ${showIndex ? 'text-indigo-600' : 'text-slate-300'}`}
                        onClick={toggleIndex}
                        title={showIndex ? "Masquer l'index" : "Afficher l'index"}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Hash size={10} className={showIndex ? "text-indigo-500" : "text-slate-300"} />
                          <span>#</span>
                        </div>
                      </th>
                      <th className="px-4 py-2">Position</th>
                      <th className="px-4 py-2">Libellé de l'Activité</th>
                      <th className="px-4 py-2 text-center w-24">Secondes</th>
                      <th className="px-4 py-2 text-center w-28">Unité de mesure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[10px]">
                    {referentielTaches.map((t, idx) => {
                      const totalSec = (t.minutes || 0) * 60 + (t.secondes || 0);
                      return (
                        <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-1.5 text-center font-mono text-slate-400 font-bold text-[9px]">
                            {showIndex ? idx + 1 : "—"}
                          </td>
                          <td className="px-4 py-1.5 font-bold text-indigo-600 uppercase text-[9px]">{t.metierNom || (allMetiersRaw.find(m => String(m.id_metier) === String(referentielSelectedMetier))?.nom_metier || "")}</td>
                          <td className="px-4 py-1.5 font-semibold text-slate-700 group-hover:text-slate-900">{t.nom_tache}</td>
                          <td className="px-4 py-1.5 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-mono font-black border border-blue-100/50 min-w-[32px] justify-center text-[10px]">
                              {totalSec}
                            </span>
                          </td>
                          <td className="px-4 py-1.5 text-center">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                              {t.unite}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Total Activités : <span className="text-indigo-600">{referentielTaches.length}</span>
              </p>
              <button
                onClick={() => setShowReferentiel(false)}
                className="px-6 py-2 bg-slate-800 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-slate-700 transition-all shadow-md shadow-slate-900/10"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )
      }
    </EsignLayout >
  );
}
