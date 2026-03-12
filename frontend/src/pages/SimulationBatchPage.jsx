import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import {
    MapPin, Globe, Download, Upload, Play, CheckCircle2,
    ChevronRight, AlertTriangle, Users, TrendingUp, Building2,
    Loader2, FileSpreadsheet, BarChart3, ChevronDown, ChevronUp, X
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) =>
    n == null ? "—" : Number(n).toLocaleString("fr-MA", { maximumFractionDigits: 1 });

// ─── Step indicator ──────────────────────────────────────────────────────────
function StepBar({ current }) {
    const steps = [
        { id: 1, label: "Sélection" },
        { id: 2, label: "Template" },
        { id: 3, label: "Import" },
        { id: 4, label: "Résultats" },
    ];
    return (
        <div className="flex items-center gap-0 mb-8">
            {steps.map((s, i) => (
                <React.Fragment key={s.id}>
                    <div className="flex flex-col items-center gap-1">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${s.id < current
                                    ? "bg-emerald-500 text-white"
                                    : s.id === current
                                        ? "bg-blue-600 text-white ring-4 ring-blue-100"
                                        : "bg-slate-100 text-slate-400"
                                }`}
                        >
                            {s.id < current ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                        </div>
                        <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${s.id === current ? "text-blue-600" : "text-slate-400"
                                }`}
                        >
                            {s.label}
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div
                            className={`flex-1 h-0.5 mx-1 mb-5 ${s.id < current ? "bg-emerald-500" : "bg-slate-200"
                                }`}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

// ─── Result Card ─────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color = "#0EA5E9" }) {
    return (
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${color}18`, color }}
                >
                    <Icon className="w-3.5 h-3.5" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
            </div>
            <div className="px-4 pb-3">
                <span className="text-2xl font-black text-slate-800">{value}</span>
                {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Centre row ───────────────────────────────────────────────────────────────
function CentreRow({ c, idx }) {
    const [open, setOpen] = useState(false);
    const postes = Object.entries(c.ressources_par_poste || {});

    return (
        <>
            <tr
                className={`border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    }`}
                onClick={() => setOpen((o) => !o)}
            >
                <td className="px-3 py-2.5 font-semibold text-slate-700 text-[11px]">{c.centre_label}</td>
                <td className="px-3 py-2.5 text-slate-500 text-[10px]">{c.region_label}</td>
                <td className="px-3 py-2.5 text-center">
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 rounded-md px-2 py-0.5 text-[11px] font-black">
                        {fmt(c.fte_calcule)}
                    </span>
                </td>
                <td className="px-3 py-2.5 text-center text-[11px] font-bold text-slate-600">{c.fte_arrondi}</td>
                <td className="px-3 py-2.5 text-center text-slate-400">
                    {open ? <ChevronUp className="w-3.5 h-3.5 mx-auto" /> : <ChevronDown className="w-3.5 h-3.5 mx-auto" />}
                </td>
            </tr>
            {open && postes.length > 0 && (
                <tr>
                    <td colSpan={5} className="bg-blue-50/40 border-b border-blue-100">
                        <div className="px-4 py-2 flex flex-wrap gap-2">
                            {postes.map(([poste, etp]) => (
                                <span
                                    key={poste}
                                    className="inline-flex items-center gap-1.5 bg-white border border-blue-100 rounded-lg px-2.5 py-1 text-[10px] font-semibold text-slate-600"
                                >
                                    <span className="text-blue-500 font-black">{fmt(etp)}</span>
                                    {poste}
                                </span>
                            ))}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function SimulationBatchPage({ mode = "regional" }) {
    const isNational = mode === "national";

    const [step, setStep] = useState(1);
    const [regions, setRegions] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [file, setFile] = useState(null);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const [expandedRegions, setExpandedRegions] = useState(new Set());

    // Load regions
    useEffect(() => {
        if (!isNational) {
            api.regions().then(setRegions).catch(console.error);
        } else {
            // National: skip selection step
            setStep(2);
        }
    }, [isNational]);

    const handleDownloadTemplate = useCallback(async () => {
        setDownloading(true);
        setError(null);
        try {
            await api.downloadBatchTemplate(mode, selectedRegion?.id);
            setStep(3);
        } catch (e) {
            setError(e.message);
        } finally {
            setDownloading(false);
        }
    }, [mode, selectedRegion]);

    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (f) setFile(f);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f && f.name.endsWith(".xlsx")) setFile(f);
    };

    const handleSimulate = useCallback(async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        try {
            const data = await api.simulateBatch(file);
            setResults(data);
            setStep(4);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [file]);

    const toggleRegion = (rid) => {
        setExpandedRegions((prev) => {
            const next = new Set(prev);
            if (next.has(rid)) next.delete(rid);
            else next.add(rid);
            return next;
        });
    };

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-1">
                        {isNational ? (
                            <Globe className="w-6 h-6 text-blue-500" />
                        ) : (
                            <MapPin className="w-6 h-6 text-blue-500" />
                        )}
                        <h1 className="text-xl font-black text-slate-800">
                            Simulation {isNational ? "Nationale" : "Régionale"}
                        </h1>
                    </div>
                    <p className="text-[11px] text-slate-400 ml-9">
                        {isNational
                            ? "Calculer les effectifs pour l'ensemble du réseau via import Excel"
                            : "Calculer les effectifs de tous les centres d'une région via import Excel"}
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <StepBar current={step} />

                    {/* ── STEP 1: Sélection région ─────────────────────────────────── */}
                    {step === 1 && !isNational && (
                        <div className="space-y-4">
                            <h2 className="text-sm font-bold text-slate-700">Choisissez une région</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {regions.map((r) => (
                                    <button
                                        key={r.id}
                                        onClick={() => setSelectedRegion(r)}
                                        className={`text-left px-3 py-2.5 rounded-xl border text-[11px] font-semibold transition-all ${selectedRegion?.id === r.id
                                                ? "bg-blue-600 border-blue-600 text-white shadow-md"
                                                : "border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50"
                                            }`}
                                    >
                                        <MapPin className="w-3 h-3 inline mr-1.5 opacity-60" />
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                            <button
                                disabled={!selectedRegion}
                                onClick={() => setStep(2)}
                                className="mt-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-[11px] font-bold px-5 py-2.5 rounded-xl transition-colors"
                            >
                                Continuer
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* ── STEP 2: Télécharger template ─────────────────────────────── */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h2 className="text-sm font-bold text-slate-700">Télécharger le modèle Excel</h2>
                            {!isNational && selectedRegion && (
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2 w-fit">
                                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                                    Région : <span className="font-bold text-slate-700">{selectedRegion.label}</span>
                                </div>
                            )}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[11px] text-amber-700 space-y-1">
                                <p className="font-bold">📋 Instructions :</p>
                                <p>• Le fichier contiendra une feuille par centre avec le canvas de volumes</p>
                                <p>• Remplissez les cellules <span className="bg-amber-200 px-1 rounded">jaunes</span> avec les volumes annuels</p>
                                <p>• Ajustez les paramètres dans la section PARAMÈTRES si nécessaire</p>
                                <p>• <strong>Ne renommez pas les onglets</strong> — ils identifient chaque centre</p>
                            </div>
                            <button
                                onClick={handleDownloadTemplate}
                                disabled={downloading}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-[11px] font-bold px-5 py-2.5 rounded-xl transition-colors"
                            >
                                {downloading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                {downloading ? "Téléchargement…" : "Télécharger le modèle .xlsx"}
                            </button>
                            {error && (
                                <p className="text-red-500 text-[10px] flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> {error}
                                </p>
                            )}
                            <button
                                onClick={() => setStep(3)}
                                className="text-blue-500 text-[11px] font-semibold underline"
                            >
                                Passer au téléversement →
                            </button>
                        </div>
                    )}

                    {/* ── STEP 3: Import fichier ───────────────────────────────────── */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <h2 className="text-sm font-bold text-slate-700">Importer le fichier rempli</h2>
                            <div
                                onDrop={handleDrop}
                                onDragOver={(e) => e.preventDefault()}
                                onClick={() => document.getElementById("batch-file-input").click()}
                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${file
                                        ? "border-emerald-400 bg-emerald-50"
                                        : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/30"
                                    }`}
                            >
                                <input
                                    id="batch-file-input"
                                    type="file"
                                    accept=".xlsx"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                {file ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <FileSpreadsheet className="w-10 h-10 text-emerald-500" />
                                        <p className="text-[12px] font-bold text-emerald-700">{file.name}</p>
                                        <p className="text-[10px] text-slate-400">
                                            {(file.size / 1024).toFixed(1)} Ko
                                        </p>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                            className="flex items-center gap-1 text-red-400 text-[10px] hover:text-red-600"
                                        >
                                            <X className="w-3 h-3" /> Supprimer
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload className="w-10 h-10 text-slate-300" />
                                        <p className="text-[12px] font-semibold text-slate-500">
                                            Glissez le fichier .xlsx ici
                                        </p>
                                        <p className="text-[10px] text-slate-400">ou cliquez pour sélectionner</p>
                                    </div>
                                )}
                            </div>
                            {error && (
                                <p className="text-red-500 text-[10px] flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> {error}
                                </p>
                            )}
                            <button
                                disabled={!file || loading}
                                onClick={handleSimulate}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-[11px] font-bold px-5 py-2.5 rounded-xl transition-colors"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4" />
                                )}
                                {loading ? "Simulation en cours…" : "Lancer la simulation"}
                            </button>
                        </div>
                    )}

                    {/* ── STEP 4: Résultats ─────────────────────────────────────────── */}
                    {step === 4 && results && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-slate-700">Résultats de simulation</h2>
                                <button
                                    onClick={() => { setStep(isNational ? 2 : 1); setResults(null); setFile(null); setError(null); }}
                                    className="text-[10px] text-blue-500 font-bold underline"
                                >
                                    Nouvelle simulation
                                </button>
                            </div>

                            {/* KPIs nationaux */}
                            <div className="grid grid-cols-3 gap-3">
                                <KpiCard
                                    icon={Users}
                                    label="ETP Calculé Total"
                                    value={fmt(results.national.total_fte_calcule)}
                                    sub="effectifs à temps plein"
                                    color="#0EA5E9"
                                />
                                <KpiCard
                                    icon={TrendingUp}
                                    label="ETP Arrondi Total"
                                    value={results.national.total_fte_arrondi}
                                    sub="effectifs requis"
                                    color="#8B5CF6"
                                />
                                <KpiCard
                                    icon={Building2}
                                    label="Centres simulés"
                                    value={results.national.nb_centres}
                                    sub={`sur ${results.par_centre.length + (results.errors?.length || 0)} importés`}
                                    color="#10B981"
                                />
                            </div>

                            {/* Erreurs */}
                            {results.errors?.length > 0 && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                                    <p className="text-[10px] font-bold text-amber-700 mb-2 flex items-center gap-1">
                                        <AlertTriangle className="w-3.5 h-3.5" /> {results.errors.length} centre(s) non traités
                                    </p>
                                    {results.errors.map((e, i) => (
                                        <p key={i} className="text-[10px] text-amber-600">
                                            • <strong>{e.sheet || e.centre}</strong> : {e.error}
                                        </p>
                                    ))}
                                </div>
                            )}

                            {/* Par région */}
                            <div>
                                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <BarChart3 className="w-3.5 h-3.5" /> Résultats par région
                                </h3>
                                <div className="space-y-2">
                                    {results.par_region.map((r) => {
                                        const regionCentres = results.par_centre.filter(
                                            (c) => c.region_id === r.region_id
                                        );
                                        const isOpen = expandedRegions.has(r.region_id);
                                        return (
                                            <div key={r.region_id} className="rounded-xl border border-slate-200 overflow-hidden">
                                                <button
                                                    onClick={() => toggleRegion(r.region_id)}
                                                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                                                        <span className="text-[11px] font-bold text-slate-700">{r.region_label}</span>
                                                        <span className="text-[9px] text-slate-400">{r.nb_centres} centre(s)</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[11px] font-black text-blue-600">{fmt(r.total_fte_calcule)} ETP</span>
                                                        <span className="text-[10px] font-bold text-slate-500">(→ {r.total_fte_arrondi})</span>
                                                        {isOpen ? (
                                                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                                                        ) : (
                                                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                                        )}
                                                    </div>
                                                </button>

                                                {isOpen && (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full">
                                                            <thead>
                                                                <tr className="bg-white border-b border-slate-100">
                                                                    <th className="text-left px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-400">Centre</th>
                                                                    <th className="text-left px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-400">Région</th>
                                                                    <th className="text-center px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-400">ETP Calculé</th>
                                                                    <th className="text-center px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-400">ETP Arrondi</th>
                                                                    <th className="w-8" />
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {regionCentres.map((c, i) => (
                                                                    <CentreRow key={c.centre_id} c={c} idx={i} />
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
