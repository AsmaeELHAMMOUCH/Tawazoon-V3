import React, { useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Package, Users, Calculator } from "lucide-react";

const JOURS = 264;

/* ─── Config des flux ─────────────────────────────────────────── */
const FLUX_CONFIG = {
    amana: {
        label: "Amana",
        color: "#005EA8", // Primary
        getDepart: (gv) =>
            (parseFloat(gv?.amana?.depot?.gc?.global) || 0) +
            (parseFloat(gv?.amana?.depot?.part?.global) || 0),
        getArrive: (gv) =>
            (parseFloat(gv?.amana?.recu?.gc?.global) || 0) +
            (parseFloat(gv?.amana?.recu?.part?.global) || 0),
    },
    cr: {
        label: "CR",
        color: "#00A0E0", // Secondary
        getDepart: (gv) => parseFloat(gv?.cr?.med?.global) || 0,
        getArrive: (gv) => parseFloat(gv?.cr?.arrive?.global) || 0,
    },
    co: {
        label: "CO",
        color: "#0284c7", // Sky 600
        getDepart: (gv) => parseFloat(gv?.co?.med?.global) || 0,
        getArrive: (gv) => parseFloat(gv?.co?.arrive?.global) || 0,
    },
    lrh: {
        label: "LRH",
        color: "#075985", // Sky 800
        getDepart: (gv) => parseFloat(gv?.lrh?.med) || 0,
        getArrive: (gv) => parseFloat(gv?.lrh?.arrive) || 0,
    },
    ebarkia: {
        label: "E-Barkia",
        color: "#0369a1", // Blue 700
        getDepart: (gv) => parseFloat(gv?.ebarkia?.med) || 0,
        getArrive: (gv) => parseFloat(gv?.ebarkia?.arrive) || 0,
    },
};

/* ─── Helpers ────────────────────────────────────────────────── */
function isMod(p) {
    const t = (p.type_poste || "").toUpperCase();
    return t !== "MOI" && t !== "INDIRECT" && t !== "STRUCTURE" && !p.is_moi;
}

const fmt = (num, decimals = 0) => {
    if (num === null || num === undefined || isNaN(num)) return "—";
    if (typeof num !== "number") return num;
    const fixed = decimals > 0 ? num.toFixed(decimals).replace(".", ",") : Math.round(num).toString();
    return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

/* ─── Cartes KPI Design (Départ, Arrivé, Global) ──────────────── */
function KpiDirectionCard({ icon, label, vol, effActuel, effCalcule, color, capNette }) {
    const calcJ = (v, e) => e > 0 && v > 0 ? (v / e / JOURS) : null;

    const bAct = calcJ(vol, effActuel);
    const bCal = calcJ(vol, effCalcule);

    // Besoin par heure
    const bActH = bAct !== null ? (bAct / capNette) : null;
    const bCalH = bCal !== null ? (bCal / capNette) : null;

    return (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all group hover:-translate-y-0.5" style={{ borderTop: `3px solid ${color}` }}>
            {/* Header */}
            <div className="px-3 py-2 flex items-center justify-between bg-slate-50/50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-sm shadow-sm border border-slate-100 font-bold" style={{ color }}>
                        {icon}
                    </div>
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">{label}</h3>
                </div>
            </div>

            {/* Content: Actuel vs Calculé */}
            <div className="p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest px-0.5">
                    <span>Vol:</span>
                    <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md">{fmt(vol)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {/* Besoin Actuel */}
                    <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 text-center">Actuel</p>
                        {bAct !== null ? (
                            <div className="flex flex-col items-center leading-tight">
                                <span className="text-lg font-black text-slate-600">{fmt(bAct)} <span className="text-[10px] font-medium opacity-60">/j</span></span>
                                <span className="text-[10px] font-black text-slate-500">{fmt(bActH, 1)} <span className="text-[8px] opacity-60">/h</span></span>
                            </div>
                        ) : (
                            <span className="text-slate-300">—</span>
                        )}
                    </div>

                    {/* Besoin Calculé */}
                    <div className="flex flex-col items-center justify-center p-2 rounded-xl border transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                        style={{ backgroundColor: color + "05", borderColor: color + "20" }}>
                        <p className="text-[8px] font-bold uppercase tracking-wider mb-0.5 text-center" style={{ color }}>Calculé</p>
                        {bCal !== null ? (
                            <div className="flex flex-col items-center leading-tight">
                                <span className="text-lg font-black" style={{ color }}>{fmt(bCal)} <span className="text-[10px] font-medium opacity-60">/j</span></span>
                                <span className="text-[10px] font-bold opacity-70" style={{ color }}>{fmt(bCalH, 1)} <span className="text-[8px] opacity-60">/h</span></span>
                            </div>
                        ) : (
                            <span className="text-slate-300">—</span>
                        )}
                    </div>
                </div>
            </div>
            {/* Background Icon Watermark */}
            <div className="absolute -right-1 -bottom-1 text-5xl font-black pointer-events-none opacity-[0.03]" style={{ color }}>
                {icon}
            </div>
        </div>
    );
}


/* ─── Composant principal ────────────────────────────────────── */
export default function CapaciteNominaleDialog({
    open, onOpenChange,
    data,               // wizardData (contient gridValues)
    simulationResults,  // pour effectif calculé
    postes,             // pour effectif actuel
    centreDetails,
    mode
}) {
    const [activeFlux, setActiveFlux] = useState("amana");
    const flux = FLUX_CONFIG[activeFlux];
    const gridValues = data?.gridValues || {};
    const capNette = data?.heuresNet || 8; // Récupéré de Step 2, défaut 8

    /* Effectifs totaux (MOD uniquement) */
    const effActuel = useMemo(() =>
        (postes || []).filter(p => isMod(p)).reduce((s, p) => s + (p.effectif_actuel || 0), 0),
        [postes]);

    const effCalcule = useMemo(() => {
        const rpp = simulationResults?.ressources_par_poste || {};
        return Math.round(
            (postes || []).filter(p => isMod(p)).reduce((s, p) => {
                const label = (p.label || p.nom || "").trim();
                return s + (rpp[label] || 0);
            }, 0)
        );
    }, [simulationResults, postes]);

    /* Volumes du flux actif */
    const volDepart = useMemo(() => flux.getDepart(gridValues), [flux, gridValues]);
    const volArrive = useMemo(() => flux.getArrive(gridValues), [flux, gridValues]);
    const volTotal = volDepart + volArrive;

    /* Détail par poste */
    const posteRows = useMemo(() => {
        const rpp = simulationResults?.ressources_par_poste || {};
        return (postes || [])
            .filter(p => isMod(p)) // Exclure MOI
            .map((p) => {
                const label = (p.label || p.nom || "").trim();
                const type = p.type_poste || "—";
                const actuel = p.effectif_actuel || 0;
                const calcule = Math.round(rpp[label] || 0);

                const calc = (v, e) => (e > 0 && v > 0) ? (v / e / JOURS) : null;

                const bDep_act = calc(volDepart, actuel);
                const bDep_cal = calc(volDepart, calcule);
                const bArr_act = calc(volArrive, actuel);
                const bArr_cal = calc(volArrive, calcule);

                const bGlob_act = calc(volTotal, actuel);
                const bGlob_cal = calc(volTotal, calcule);

                return {
                    label, type, moi: false, actuel, calcule,
                    bDep_act, bDep_cal,
                    bArr_act, bArr_cal,
                    bGlob_act, bGlob_cal,
                    // Conversions horaires
                    bDepHs_act: bDep_act ? bDep_act / capNette : null,
                    bDepHs_cal: bDep_cal ? bDep_cal / capNette : null,
                    bArrHs_act: bArr_act ? bArr_act / capNette : null,
                    bArrHs_cal: bArr_cal ? bArr_cal / capNette : null,
                    bGlobHs_act: bGlob_act ? bGlob_act / capNette : null,
                    bGlobHs_cal: bGlob_cal ? bGlob_cal / capNette : null,
                };
            })
            .filter(r => r.actuel > 0 || r.calcule > 0) // Uniquement ceux qui ont un effectif
            .sort((a, b) => b.actuel - a.actuel);
    }, [postes, simulationResults, volDepart, volArrive, capNette]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] lg:max-w-5xl h-fit max-h-[92vh] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                <Card className="overflow-hidden border-0 shadow-none bg-white h-full">

                    {/* ── Header ── */}
                    <CardHeader className="relative overflow-hidden bg-gradient-to-br from-[#005EA8] via-[#0066BB] to-[#00A0E0] py-3 px-5 border-b-0">
                        <div className="absolute inset-0 opacity-15">
                            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/20 blur-2xl" />
                            <div className="absolute left-1/4 -bottom-5 w-32 h-32 rounded-full bg-sky-300/20 blur-xl" />
                        </div>
                        <div className="relative flex items-center justify-between mr-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                                    <Calculator className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                        Capacité Nominale ({mode === "optimise" ? "Optimisée" : mode === "recommande" ? "Consolidée" : "Cible"})
                                        {centreDetails?.centre_name && (
                                            <span className="text-xs font-medium text-blue-100/80 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                                                {centreDetails.centre_name}
                                            </span>
                                        )}
                                    </h2>
                                    <p className="text-[10px] text-blue-100 font-medium opacity-80 uppercase tracking-wide">
                                        Analyse annuelle : {fmt(JOURS)} jours • Capacité nette : {fmt(capNette)}h
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-2 rounded-xl flex gap-4">
                                    <div className="text-center">
                                        <p className="text-[8px] text-blue-100/70 font-bold uppercase tracking-widest">Actuel</p>
                                        <p className="text-base font-black text-white leading-tight">{fmt(effActuel)}</p>
                                    </div>
                                    <div className="w-px bg-white/10" />
                                    <div className="text-center">
                                        <p className="text-[8px] text-blue-200 font-bold uppercase tracking-widest" style={{ color: "#7dd3fc" }}>{mode === "optimise" ? "Optimisé" : mode === "recommande" ? "Consolidé" : "Calculé"}</p>
                                        <p className="text-base font-black text-white leading-tight">{fmt(effCalcule)}</p>
                                    </div>
                                    <div className="w-px bg-white/10" />
                                    <div className="text-center">
                                        <p className="text-[8px] text-blue-100/70 font-bold uppercase tracking-widest">Total Vol</p>
                                        <p className="text-base font-black text-white leading-tight">
                                            {fmt(volTotal)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-4 overflow-y-auto max-h-[82vh] space-y-4">

                        {/* ── Onglets flux ── */}
                        <div className="flex gap-2 flex-wrap">
                            {Object.entries(FLUX_CONFIG).map(([key, cfg]) => {
                                const dep = cfg.getDepart(gridValues);
                                const arr = cfg.getArrive(gridValues);
                                const total = dep + arr;
                                const hasData = total > 0;
                                const isActive = activeFlux === key;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setActiveFlux(key)}
                                        className={`group relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[11px] font-bold tracking-wide transition-all ${isActive
                                            ? "text-white shadow-md scale-[1.02]"
                                            : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100"
                                            } ${!hasData && !isActive ? "opacity-30 grayscale cursor-not-allowed" : ""}`}
                                        style={isActive ? { backgroundColor: cfg.color } : {}}
                                        disabled={!hasData && !isActive}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white" : "bg-slate-300 group-hover:bg-slate-400"}`}
                                            style={!isActive && hasData ? { backgroundColor: cfg.color } : {}} />
                                        <span>{cfg.label}</span>
                                        {hasData && (
                                            <span className={`text-[8px] opacity-70 ${isActive ? "text-white" : "text-slate-400"}`}>
                                                ({fmt(total)})
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* ── KPIs Globaux : Départ, Arrivé, Global ── */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <KpiDirectionCard
                                icon="↗"
                                label="Flux Départ"
                                vol={volDepart}
                                effActuel={effActuel}
                                effCalcule={effCalcule}
                                capNette={capNette}
                                color="#005EA8"
                            />
                            <KpiDirectionCard
                                icon="↙"
                                label="Flux Arrivé"
                                vol={volArrive}
                                effActuel={effActuel}
                                effCalcule={effCalcule}
                                capNette={capNette}
                                color="#00A0E0"
                            />
                            <KpiDirectionCard
                                icon="⇅"
                                label="Flux Global"
                                vol={volTotal}
                                effActuel={effActuel}
                                effCalcule={effCalcule}
                                capNette={capNette}
                                color={flux.color}
                            />
                        </div>

                        {/* ── Tableau détail par poste ── */}
                        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                            <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5 text-slate-500" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Détail analytique par poste</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-[10px] border-collapse">
                                    <thead className="sticky top-0 z-20 shadow-sm">
                                        {/* Row 1: Main Groups */}
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="text-left px-3 py-1.5 text-[8px] font-black uppercase text-slate-400 bg-white sticky left-0 z-30" rowSpan={3}>Info Poste</th>
                                            <th className="text-center px-2 py-1 text-[8px] font-black uppercase text-slate-400 border-l border-slate-100" colSpan={2}>Effectifs</th>
                                            <th className="text-center px-2 py-1 text-[8px] font-black uppercase text-blue-500 border-l border-slate-100 bg-blue-50/30" colSpan={4}>↗ Besoin DEP ({fmt(volDepart)})</th>
                                            <th className="text-center px-2 py-1 text-[8px] font-black uppercase text-sky-500 border-l border-slate-100 bg-sky-50/30" colSpan={4}>↙ Besoin ARR ({fmt(volArrive)})</th>
                                            <th className="text-center px-2 py-1 text-[8px] font-black uppercase text-slate-700 border-l border-slate-100 bg-slate-100/30" colSpan={4}>⇅ Besoin GLOB ({fmt(volTotal)})</th>
                                        </tr>
                                        {/* Row 2: Sub-Groups (Actuel / Calculé) */}
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="text-center px-1 py-0.5 text-[7px] font-bold text-slate-500 border-l border-slate-100" rowSpan={2}>Act.</th>
                                            <th className="text-center px-1 py-0.5 text-[7px] font-bold text-[#005EA8]" rowSpan={2}>Calc.</th>

                                            <th className="text-center px-1 py-0.5 text-[7px] font-bold text-slate-400 border-l border-slate-100 bg-blue-50/20" colSpan={2}>Actuel</th>
                                            <th className="text-center px-1 py-0.5 text-[7px] font-bold text-blue-600 bg-blue-50/40" colSpan={2}>Calculé</th>

                                            <th className="text-center px-1 py-0.5 text-[7px] font-bold text-slate-400 border-l border-slate-100 bg-sky-50/20" colSpan={2}>Actuel</th>
                                            <th className="text-center px-1 py-0.5 text-[7px] font-bold text-sky-600 bg-sky-50/40" colSpan={2}>Calculé</th>

                                            <th className="text-center px-1 py-0.5 text-[7px] font-bold text-slate-400 border-l border-slate-100 bg-slate-100/20" colSpan={2}>Actuel</th>
                                            <th className="text-center px-1 py-0.5 text-[7px] font-bold text-slate-800 bg-slate-100/40" colSpan={2}>Calculé</th>
                                        </tr>
                                        {/* Row 3: Units (/j, /h) */}
                                        <tr className="bg-slate-50/30 border-b border-slate-100">
                                            <th className="text-center px-1 py-0.5 text-[6px] font-bold text-slate-400 border-l border-slate-100 bg-blue-50/10">/j</th>
                                            <th className="text-center px-1 py-0.5 text-[6px] font-bold text-slate-400 bg-blue-50/10">/h</th>
                                            <th className="text-center px-1 py-0.5 text-[6px] font-bold text-blue-500/60 bg-blue-50/20">/j</th>
                                            <th className="text-center px-1 py-0.5 text-[6px] font-bold text-blue-500/60 bg-blue-50/20">/h</th>

                                            <th className="text-center px-1 py-0.5 text-[6px] font-bold text-slate-400 border-l border-slate-100 bg-sky-50/10">/j</th>
                                            <th className="text-center px-1 py-0.5 text-[6px] font-bold text-slate-400 bg-sky-50/10">/h</th>
                                            <th className="text-center px-1 py-0.5 text-[6px] font-bold text-sky-500/60 bg-sky-50/20">/j</th>
                                            <th className="text-center px-1 py-0.5 text-[6px] font-bold text-sky-500/60 bg-sky-50/20">/h</th>

                                            <th className="text-center px-1 py-0.5 text-[6px] font-bold text-slate-400 border-l border-slate-100 bg-slate-50/10">/j</th>
                                            <th className="text-center px-1 py-0.5 text-[6px] font-bold text-slate-400 bg-slate-50/10">/h</th>
                                            <th className="text-center px-1 py-0.5 text-[6px] font-bold text-slate-700/60 bg-slate-50/20">/j</th>
                                            <th className="text-center px-1 py-0.5 text-[6px] font-bold text-slate-700/60 bg-slate-50/20">/h</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {posteRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={15} className="text-center py-12 text-slate-300 font-medium italic">Aucun poste configuré.</td>
                                            </tr>
                                        ) : posteRows.map((r, idx) => (
                                            <tr key={idx} className={`group border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${r.moi ? "bg-slate-50/30" : "bg-white"}`}>
                                                <td className="px-3 py-1 text-[10px] font-medium sticky left-0 z-10 bg-inherit shadow-[1px_0_0_0_rgba(0,0,0,0.05)] border-r border-slate-100">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700 truncate max-w-[140px]" title={r.label}>{r.label}</span>
                                                        <span className="text-[8px] text-slate-400 uppercase tracking-tighter truncate">{r.type}</span>
                                                    </div>
                                                </td>
                                                {/* Effectifs */}
                                                <td className="px-1 py-1 text-center border-l border-slate-100 font-bold text-slate-500">
                                                    {fmt(r.actuel)}
                                                </td>
                                                <td className="px-1 py-1 text-center font-black text-[#005EA8]">
                                                    {fmt(r.calcule)}
                                                </td>

                                                {/* Besoin Départ Actuel */}
                                                <td className="px-1 py-1 text-center border-l border-slate-100 bg-blue-50/5 text-slate-600 font-black">
                                                    {fmt(r.bDep_act)}
                                                </td>
                                                <td className="px-1 py-1 text-center bg-blue-50/5 text-slate-500 font-black">
                                                    {fmt(r.bDepHs_act, 1)}
                                                </td>
                                                {/* Besoin Départ Calculé */}
                                                <td className="px-1 py-1 text-center bg-blue-50/20 font-black text-blue-700">
                                                    {fmt(r.bDep_cal)}
                                                </td>
                                                <td className="px-1 py-1 text-center bg-blue-50/20 font-black text-blue-600/70">
                                                    {fmt(r.bDepHs_cal, 1)}
                                                </td>

                                                {/* Besoin Arrivé Actuel */}
                                                <td className="px-1 py-1 text-center border-l border-slate-100 bg-sky-50/5 text-slate-600 font-black">
                                                    {fmt(r.bArr_act)}
                                                </td>
                                                <td className="px-1 py-1 text-center bg-sky-50/5 text-slate-500 font-black">
                                                    {fmt(r.bArrHs_act, 1)}
                                                </td>
                                                {/* Besoin Arrivé Calculé */}
                                                <td className="px-1 py-1 text-center bg-sky-50/20 font-black text-sky-700">
                                                    {fmt(r.bArr_cal)}
                                                </td>
                                                <td className="px-1 py-1 text-center bg-sky-50/20 font-black text-sky-600/70">
                                                    {fmt(r.bArrHs_cal, 1)}
                                                </td>

                                                {/* Besoin Global Actuel */}
                                                <td className="px-1 py-1 text-center border-l border-slate-100 bg-slate-50/30 text-slate-600 font-black">
                                                    {fmt(r.bGlob_act)}
                                                </td>
                                                <td className="px-1 py-1 text-center bg-slate-50/30 text-slate-500 font-black">
                                                    {fmt(r.bGlobHs_act, 1)}
                                                </td>
                                                {/* Besoin Global Calculé */}
                                                <td className="px-1 py-1 text-center bg-slate-100/20 font-black text-slate-700">
                                                    {fmt(r.bGlob_cal)}
                                                </td>
                                                <td className="px-1 py-1 text-center bg-slate-100/20 font-black text-slate-600/70">
                                                    {fmt(r.bGlobHs_cal, 1)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </DialogContent>
        </Dialog>
    );
}

