import React, { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { api } from "../lib/api";
import { useDirectionData } from "../hooks/useDirectionData";
import {
    Loader2, Upload, Play,
    BarChart3, Settings2, Download, AlertCircle, CheckCircle2,
    TrendingUp, Users, ArrowRight, LayoutDashboard, BrainCircuit,
    ArrowUpRight, ArrowDownRight, Printer, Building2
} from "lucide-react";

// --- HELPERS ---
const toNumber = (v, def = 0) => {
    if (v === undefined || v === null || v === "") return def;
    const n = Number(String(v).replace(",", "."));
    return isNaN(n) ? def : n;
};

const normalizeStr = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const round = (val) => (val || 0).toFixed(2);
const formatNumber = (num) => new Intl.NumberFormat('fr-FR').format(Math.round(num));

// --- COMPONENTS COMPACT ---

const SectionTitle = ({ icon: Icon, title, subtitle }) => (
    <div className="mb-3">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-indigo-600" />}
            {title}
        </h3>
        {subtitle && <p className="text-xs text-slate-500 ml-6">{subtitle}</p>}
    </div>
);

const KPICard = ({ title, value, icon: Icon, trend, trendValue, colorClass, delay }) => (
    <div
        className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 relative overflow-hidden group flex flex-col items-center justify-center text-center"
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className={`absolute -top-2 -right-2 p-2 opacity-5 group-hover:opacity-10 transition-opacity ${colorClass}`}>
            <Icon className="w-16 h-16" />
        </div>
        <div className="relative z-10 flex flex-col items-center w-full">
            <div className="flex items-center gap-2 mb-1.5 justify-center">
                <div className={`p-1.5 rounded-md ${colorClass.replace('text-', 'bg-').replace('600', '50').replace('500', '50')} ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-tight">{title}</p>
            </div>

            <div className="flex items-baseline gap-2 justify-center">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h2>
                {trend && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${trend === 'up' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {trendValue}
                    </span>
                )}
            </div>
        </div>
    </div>
);

// --- MAIN PAGE ---
export default function SimulationDirectionV2() {
    const {
        directions, selectedDirection, centres, consolidation,
        loading, actions
    } = useDirectionData(api);

    const fileInputRef = useRef(null);
    const [params, setParams] = useState({ prod: 100, idle: 0 });
    const [volumesInput, setVolumesInput] = useState([]);
    const [importStats, setImportStats] = useState(null);
    const [showConfig, setShowConfig] = useState(true);

    // Handles
    const handleDirectionChange = (e) => {
        const id = e.target.value;
        actions.selectDirection(id ? Number(id) : null);
        setVolumesInput([]);
        setImportStats(null);
    };

    const handleDownloadTemplate = () => {
        const headers = ["Nom du Centre", "Sacs", "Colis", "Courrier Ordinaire", "Courrier Recommande", "E-Barkia", "LRH", "Amana", "Colis Amana Par Sac", "Courriers Par Sac", "Colis Par Collecte"];
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Template_Direction_Simple_V2.xlsx");
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                const parsed = rawData.map(row => {
                    const v = { centre_id: null, centre_label: null };
                    Object.entries(row).forEach(([rawKey, val]) => {
                        const key = rawKey.toLowerCase().trim();
                        if (key.includes("label") || key.includes("nom") || key.includes("centre")) v.centre_label = String(val).trim();
                        if (key.includes("sac") && !key.includes("amana")) v.sacs = toNumber(val, 0);
                        else if (key.includes("colis") && !key.includes("amana") && !key.includes("sac")) v.colis = toNumber(val, 0);
                        else if (key.includes("ordinaire")) v.courrier_ordinaire = toNumber(val, 0);
                        else if (key.includes("recommande")) v.courrier_recommande = toNumber(val, 0);
                        else if (key.includes("ebarkia") || key.includes("barkia")) v.ebarkia = toNumber(val, 0);
                        else if (key.includes("lrh")) v.lrh = toNumber(val, 0);
                        else if (key.includes("amana") && !key.includes("sac")) v.amana = toNumber(val, 0);
                        // Ratios
                        else if (key.includes("colis") && key.includes("amana") && key.includes("sac")) v.colis_amana_par_sac = toNumber(val, 5);
                        else if (key.includes("courrier") && key.includes("sac")) v.courriers_par_sac = toNumber(val, 4500);
                        else if (key.includes("colis") && key.includes("collecte")) v.colis_par_collecte = toNumber(val, 1);
                    });
                    if (v.centre_label && centres.length > 0) {
                        const normImport = normalizeStr(v.centre_label);
                        const match = centres.find(c => normalizeStr(c.label) === normImport);
                        if (match) { v.centre_id = match.id; v.centre_label = match.label; }
                        else {
                            const matchAprx = centres.find(c => {
                                const dbLabel = normalizeStr(c.label);
                                return (dbLabel.length > 3 && normImport.includes(dbLabel)) || (normImport.length > 3 && dbLabel.includes(normImport));
                            });
                            if (matchAprx) { v.centre_id = matchAprx.id; v.centre_label = matchAprx.label; }
                        }
                    }
                    return v;
                });
                const valid = parsed.filter(v => v.centre_label);
                setVolumesInput(valid);
                setImportStats({ total: parsed.length, valid: valid.length, msg: `${valid.length} centres importés avec succès.` });
            } catch (err) { alert("Erreur fichier"); }
        };
        reader.readAsBinaryString(file);
    };

    const handleSimulate = async () => {
        if (!selectedDirection) return;
        const payload = {
            direction_id: Number(selectedDirection),
            mode: volumesInput.length > 0 ? "import" : "database",
            global_params: { productivite: toNumber(params.prod, 100), heures_par_jour: 8.0, idle_minutes: toNumber(params.idle, 0) },
            volumes: volumesInput
        };
        try { await actions.runSimulation(payload); setShowConfig(false); } catch (e) { alert("Erreur simulation"); }
    };

    const handleExport = () => {
        if (!centres.length) return;
        const rows = centres.map(c => ({
            "Centre": c.label, "Catégorie": c.categorie, "ETP Actuel": c.etp_actuel, "ETP Cible": c.etp_calcule, "Ecart": c.ecart
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Resultats");
        XLSX.writeFile(wb, "Resultats_Simulation.xlsx");
    };

    const resultsSorted = useMemo(() => centres ? [...centres].sort((a, b) => (b.ecart || 0) - (a.ecart || 0)) : [], [centres]);
    const kpis = consolidation?.totals || { etp_total: 0, etp_requis: 0, ecart: 0, nb_centres: 0 };

    // Insights Compacts
    // Insights Compacts & Intelligents
    const insights = useMemo(() => {
        if (!centres.length) return [];
        const res = [];
        const under = centres.filter(c => c.ecart > 0.5);
        const over = centres.filter(c => c.ecart < -0.5);

        // 1. Situation Actuelle
        if (under.length > 0) res.push({ type: 'danger', title: 'Sous-effectif Critique', text: `${under.length} centres nécessitent un renfort immédiat.` });
        if (over.length > 0) res.push({ type: 'success', title: 'Gains de Productivité', text: `${over.length} centres présentent des marges de manœuvre.` });

        // 2. Optimisation Interne (Smart)
        const totalOver = Math.abs(over.reduce((acc, c) => acc + (c.ecart || 0), 0));
        const totalUnder = under.reduce((acc, c) => acc + (c.ecart || 0), 0);
        const transferable = Math.min(totalOver, totalUnder);

        if (transferable > 1) {
            res.push({
                type: 'info',
                title: 'Opportunité de Redéploiement',
                text: `Possibilité de combler ${Math.round((transferable / totalUnder) * 100)}% du déficit par mobilité interne (${round(transferable)} ETP).`
            });
        }

        // 3. Projection (IA Simulation)
        const deficitTotal = kpis.etp_requis - kpis.etp_total;
        if (deficitTotal > 0) {
            res.push({
                type: 'warning',
                title: 'Projection Financière',
                text: `Impact estimé : +${formatNumber(deficitTotal * 15000 * 12)} DH/an de masse salariale pour conformité.`
            });
        } else {
            res.push({
                type: 'success',
                title: 'Projection Économies',
                text: `Potentiel d'économie : ${formatNumber(Math.abs(deficitTotal) * 15000 * 12)} DH/an par non-remplacement.`
            });
        }

        // 4. Projection Future (N+1)
        const growthRate = Number(params.growth || 0) / 100;
        if (growthRate !== 0) {
            const futureBesoin = kpis.etp_requis * (1 + growthRate);
            const deltaFuture = futureBesoin - kpis.etp_total;
            res.push({
                type: growthRate > 0 ? 'danger' : 'success',
                title: `Projection N+1 (${params.growth > 0 ? '+' : ''}${params.growth}%)`,
                text: `Besoin futur estimé à ${round(futureBesoin)} ETP. Écart projeté : ${(deltaFuture > 0 ? "+" : "") + round(deltaFuture)} ETP.`
            });
        }

        return res;
    }, [centres, kpis, params]);

    // RENDER
    return (
        <div className="min-h-screen bg-slate-50/50 font-sans text-slate-800 pb-16">
            {/* COMPACT TOP BAR */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm/50">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-[#005EA8]" />
                            <h1 className="text-base font-bold text-slate-800">TAWAZOON <span className="text-slate-400 font-normal">| Direction</span></h1>
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-2"></div>
                        <select
                            className="bg-slate-50 text-sm font-medium text-slate-700 border border-slate-200 rounded px-2 py-1 cursor-pointer min-w-[180px] hover:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                            value={selectedDirection || ""}
                            onChange={handleDirectionChange}
                        >
                            <option value="">Sélectionner une Direction...</option>
                            {directions.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => setShowConfig(!showConfig)} className={`px-3 py-1.5 text-xs font-medium rounded border flex items-center gap-1.5 transition-colors ${showConfig ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            <Settings2 className="w-3.5 h-3.5" /> Paramètres
                        </button>
                        <button onClick={handleSimulate} disabled={loading.sim || !selectedDirection} className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50">
                            {loading.sim ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                            Lancer
                        </button>
                    </div>
                </div>
            </div>

            {/* ERROR PLACEHOLDER */}
            {!selectedDirection && (
                <div className="max-w-7xl mx-auto px-4 mt-8">
                    <div className="bg-white border border-slate-200 rounded-lg p-8 flex flex-col items-center justify-center text-center">
                        <div className="bg-slate-50 p-3 rounded-full mb-3"><LayoutDashboard className="w-8 h-8 text-slate-400" /></div>
                        <h2 className="text-lg font-semibold text-slate-700">Aucune Direction sélectionnée</h2>
                        <p className="text-sm text-slate-500 max-w-md mt-1">Sélectionnez une direction régionale dans la barre ci-dessus pour accéder au tableau de bord.</p>
                    </div>
                </div>
            )}

            {/* CONFIG PANEL */}
            {selectedDirection && showConfig && (
                <div className="bg-white border-b border-slate-200 shadow-inner bg-slate-50/30">
                    <div className="max-w-7xl mx-auto px-4 py-4 grid md:grid-cols-3 gap-6">
                        <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Paramètres</h4>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Productivité (%)</label>
                                    <input type="number" value={params.prod} onChange={e => setParams({ ...params, prod: e.target.value })} className="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Idle (min/j)</label>
                                    <input type="number" value={params.idle} onChange={e => setParams({ ...params, idle: e.target.value })} className="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Croissance (%)</label>
                                    <input type="number" value={params.growth || 0} onChange={e => setParams({ ...params, growth: e.target.value })} className="w-full text-xs p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none" placeholder="Ex: 5" />
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Import Données (Optionnel)</h4>
                                <button onClick={handleDownloadTemplate} className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Download className="w-3 h-3" /> Télécharger modèle</button>
                            </div>
                            <div onClick={() => fileInputRef.current?.click()} className={`border border-dashed rounded px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${importStats ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-indigo-400 bg-white'}`}>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx" onChange={handleFileUpload} />
                                <div className="flex items-center gap-2">
                                    <Upload className={`w-3.5 h-3.5 ${importStats ? 'text-emerald-600' : 'text-slate-400'}`} />
                                    <span className={`text-xs ${importStats ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>{importStats ? importStats.msg : "Glisser un fichier Excel ou cliquer ici"}</span>
                                </div>
                                {importStats && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DASHBOARD CONTENT */}
            {selectedDirection && consolidation?.totals?.nb_centres > 0 && (
                <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

                    {/* KPI CARDS COMPACT */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KPICard title="Centres" value={kpis.nb_centres} icon={LayoutDashboard} colorClass="text-slate-600" delay={0} />
                        <KPICard title="Effectif Actuel" value={round(kpis.etp_total)} icon={Users} colorClass="text-slate-600" delay={50} />
                        <KPICard title="Cible" value={round(kpis.etp_requis)} icon={TrendingUp} colorClass="text-indigo-600" delay={100} />
                        <KPICard title="Écart" value={(kpis.ecart > 0 ? "+" : "") + round(kpis.ecart)} icon={AlertCircle} colorClass={kpis.ecart > 0 ? "text-red-500" : "text-emerald-500"} trend={kpis.ecart > 0 ? 'up' : 'down'} trendValue={Math.abs(Math.round((kpis.ecart / kpis.etp_total) * 100)) + '%'} delay={150} />
                    </div>

                    {/* MAIN SPLIT VIEW */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

                        {/* TABLE */}
                        <div className="xl:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                                <SectionTitle icon={BarChart3} title="Détail par Centre" />
                                <button onClick={handleExport} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors" title="Exporter Excel"><Printer className="w-4 h-4" /></button>
                            </div>

                            <div className="overflow-x-auto max-h-[800px]">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-2 border-b border-slate-200">Centre</th>
                                            <th className="px-4 py-2 border-b border-slate-200 text-center">Actuel</th>
                                            <th className="px-4 py-2 border-b border-slate-200 text-center">Cible</th>
                                            <th className="px-4 py-2 border-b border-slate-200 w-1/4">Couverture</th>
                                            <th className="px-4 py-2 border-b border-slate-200 text-right">Écart</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {resultsSorted.map((c) => {
                                            const coverage = c.etp_actuel && c.etp_calcule ? Math.min((c.etp_actuel / c.etp_calcule) * 100, 100) : 0;
                                            const isOver = (c.ecart || 0) < 0;
                                            let barColor = "bg-indigo-500";
                                            if (coverage < 80) barColor = "bg-red-500"; else if (coverage > 95 && coverage < 105) barColor = "bg-emerald-500"; else if (coverage >= 105) barColor = "bg-amber-500";

                                            return (
                                                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                                                    <td className="px-4 py-2.5">
                                                        <div className="font-bold text-slate-700">{c.label}</div>
                                                        <div className="text-[10px] text-slate-400">{c.categorie || '-'}</div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center text-slate-600 font-medium">{round(c.etp_actuel)}</td>
                                                    <td className="px-4 py-2.5 text-center text-slate-800 font-bold">{round(c.etp_calcule)}</td>
                                                    <td className="px-4 py-2.5 align-middle">
                                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex items-center">
                                                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${coverage}%` }}></div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold min-w-[30px] text-center ${isOver ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                                                            {c.ecart > 0 ? "+" : ""}{round(c.ecart)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* INSIGHTS COMPACT */}
                        <div className="space-y-4">
                            <div className="bg-slate-800 p-4 rounded-lg shadow text-white relative overflow-hidden group hover:shadow-xl transition-shadow duration-500">
                                <div className="absolute -top-4 -right-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500"><BrainCircuit className="w-24 h-24" /></div>
                                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 relative z-10">
                                    <div className="p-1 bg-indigo-500/30 rounded-lg backdrop-blur-sm border border-indigo-400/30">
                                        <BrainCircuit className="w-4 h-4 text-indigo-300" />
                                    </div>
                                    <span className="tracking-wide">Intelligence IA</span>
                                </h3>
                                <div className="space-y-3 relative z-10">
                                    {insights.length > 0 ? insights.map((insight, i) => (
                                        <div key={i} className="bg-white/5 hover:bg-white/10 p-3 rounded-lg border border-white/5 transition-colors duration-200">
                                            <div className="flex items-start gap-2">
                                                <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${insight.type === 'danger' ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]' : insight.type === 'success' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : insight.type === 'info' ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'}`} />
                                                <div>
                                                    <h4 className={`text-xs font-bold mb-1 leading-none ${insight.type === 'danger' ? 'text-red-300' : insight.type === 'success' ? 'text-emerald-300' : insight.type === 'info' ? 'text-blue-300' : 'text-amber-300'}`}>{insight.title}</h4>
                                                    <p className="text-[11px] text-slate-300 leading-snug font-medium">{insight.text}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )) : <div className="text-xs text-slate-400 italic text-center py-4">Analyse en cours...</div>}
                                </div>
                                <div className="mt-4 pt-3 border-t border-white/10 text-[10px] text-slate-500 flex justify-between items-center">
                                    <span>Basé sur les données temps réel</span>
                                    <span className="bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-300 font-mono">v2.1</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
