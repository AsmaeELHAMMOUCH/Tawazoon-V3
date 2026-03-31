import React, { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import "@/styles/dialog-animations.css";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Users, Calculator, ArrowUpRight, ArrowDownLeft, ArrowUpDown } from "lucide-react";
import { DialogTitle } from "@radix-ui/react-dialog";
import CapaciteNominaleDirectionCard from "./CapaciteNominaleDirectionCard";

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
function getActuelModValue(p) {
    return Number(p?.effectif_actuel_mod) || 0;
}

const fmt = (num, decimals = 0) => {
    if (num === null || num === undefined || isNaN(num)) return "—";
    if (typeof num !== "number") return num;
    const fixed = decimals > 0 ? num.toFixed(decimals).replace(".", ",") : Math.round(num).toString();
    return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

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
    const [activeDir, setActiveDir] = useState("Glob");
    const flux = FLUX_CONFIG[activeFlux];
    const gridValues = data?.gridValues || {};
    // Récupéré de Step 2; si absent, fallback sur 8h30 (cohérent avec la nouvelle règle)
    const capNette = data?.heuresNet || 8.5;

    /* Effectifs totaux (MOD uniquement) */
    const effActuel = useMemo(() =>
        (postes || []).filter(p => isMod(p)).reduce((s, p) => s + getActuelModValue(p), 0),
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

    /* Volumes globaux du flux actif (grid) */
    const volDepart = useMemo(() => flux.getDepart(gridValues), [flux, gridValues]);
    const volArrive = useMemo(() => flux.getArrive(gridValues), [flux, gridValues]);
    const volTotal = volDepart + volArrive;
    const scenarioLabel = mode === "optimise" ? "Optimisé" : mode === "recommande" ? "Consolidé" : "Calculé";
    const scenarioColor = mode === "optimise" ? "#059669" : mode === "recommande" ? "#eab308" : "#0284c7";
    const singleScenario = [{ key: "calcule", label: scenarioLabel, shortLabel: "Calc.", color: scenarioColor }];

    /* Détail par poste */
    const posteRows = useMemo(() => {
        const rpp = simulationResults?.ressources_par_poste || {};
        const usedByCode = simulationResults?.volumes_utilises_par_poste || {};
        return (postes || [])
            .filter(p => isMod(p)) // Exclure MOI
            .map((p) => {
                const label = (p.label || p.nom || "").trim();
                const type = p.type_poste || "—";
                const actuel = getActuelModValue(p);
                const calcule = Math.round(rpp[label] || 0);
                const posteCode = String(p?.code ?? p?.Code ?? "").trim();
                const usedFlux = usedByCode?.[posteCode]?.[activeFlux] || {};
                const volDepUsed = Number(usedFlux.dep) || 0;
                const volArrUsed = Number(usedFlux.arr) || 0;
                const volGlobUsed = Number(usedFlux.glob) || 0;

                const calc = (v, e) => (e > 0 && v > 0) ? (v / e / JOURS) : null;

                const bDep_act = calc(volDepUsed, actuel);
                const bDep_cal = calc(volDepUsed, calcule);
                const bArr_act = calc(volArrUsed, actuel);
                const bArr_cal = calc(volArrUsed, calcule);

                const bGlob_act = calc(volGlobUsed, actuel);
                const bGlob_cal = calc(volGlobUsed, calcule);

                return {
                    label, type, moi: false, actuel, calcule,
                    vDep: volDepUsed, vArr: volArrUsed, vGlob: volGlobUsed,
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
    }, [postes, simulationResults, activeFlux, capNette]);

    // Totaux volumes utilisés (source backend), utilisés pour header + cartes.
    const usedTotals = useMemo(() => {
        const totals = (posteRows || []).reduce((acc, r) => {
            acc.dep += Number(r.vDep) || 0;
            acc.arr += Number(r.vArr) || 0;
            acc.glob += Number(r.vGlob) || 0;
            return acc;
        }, { dep: 0, arr: 0, glob: 0 });
        return {
            dep: totals.dep,
            arr: totals.arr,
            glob: totals.glob,
        };
    }, [posteRows]);

    const [animKey, setAnimKey] = useState(0);
    useEffect(() => { if (open) setAnimKey((k) => k + 1); }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
              key={animKey}
              className="dlg-enter max-w-[95vw] lg:max-w-5xl h-fit max-h-[92vh] p-0 overflow-hidden border-none shadow-2xl rounded-2xl"
            >
                <DialogHeader className="sr-only">
                    <DialogTitle>Capacité nominale</DialogTitle>
                </DialogHeader>
                <Card className="overflow-hidden border-0 shadow-none bg-white h-full">

                    {/* ── Header ── */}
                    <CardHeader className="dlg-header-enter relative overflow-hidden bg-gradient-to-br from-[#005EA8] via-[#0066BB] to-[#00A0E0] py-3 px-5 border-b-0">
                        <div className="absolute inset-0 opacity-15">
                            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/20 blur-2xl dlg-blob-a" />
                            <div className="absolute left-1/4 -bottom-5 w-32 h-32 rounded-full bg-sky-300/20 blur-xl dlg-blob-b" />
                        </div>
                        <div className="relative flex items-center justify-between mr-8">
                            <div className="flex items-center gap-3">
                                <div className="dlg-icon-hover dlg-icon-enter w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner"
                                  style={{ animationDelay: "0.1s" }}>
                                    <Calculator className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                        Capacité Nominale ({mode === "optimise" ? "Optimisée" : mode === "recommande" ? "Consolidée" : "Calculée"})
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
                                    </button>
                                );
                            })}
                        </div>

                        {/* ── KPIs Globaux : Départ, Arrivé, Global ── */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="dlg-card-enter" style={{ animationDelay: "0.18s" }}>
                                <CapaciteNominaleDirectionCard
                                    icon={ArrowUpRight}
                                    label="Flux Départ"
                                    vol={volDepart}
                                    effActuel={effActuel}
                                    effs={{ calcule: effCalcule }}
                                    capNette={capNette}
                                    scenarios={singleScenario}
                                    color="#005EA8"
                                />
                            </div>
                            <div className="dlg-card-enter" style={{ animationDelay: "0.26s" }}>
                                <CapaciteNominaleDirectionCard
                                    icon={ArrowDownLeft}
                                    label="Flux Arrivé"
                                    vol={volArrive}
                                    effActuel={effActuel}
                                    effs={{ calcule: effCalcule }}
                                    capNette={capNette}
                                    scenarios={singleScenario}
                                    color="#00A0E0"
                                />
                            </div>
                            <div className="dlg-card-enter" style={{ animationDelay: "0.34s" }}>
                                <CapaciteNominaleDirectionCard
                                    icon={ArrowUpDown}
                                    label="Flux Global"
                                    vol={volTotal}
                                    effActuel={effActuel}
                                    effs={{ calcule: effCalcule }}
                                    capNette={capNette}
                                    scenarios={singleScenario}
                                    color={flux.color}
                                />
                            </div>
                        </div>

                        {/* ── Tableau détail par poste ── */}
                        {(() => {
                            const DIR_TABS = [
                                { key: "Dep", label: "↗ Départ", vol: usedTotals.dep },
                                { key: "Arr", label: "↙ Arrivé", vol: usedTotals.arr },
                                { key: "Glob", label: "⇅ Global", vol: usedTotals.glob },
                            ];
                            const curDir = DIR_TABS.find((d) => d.key === activeDir) || DIR_TABS[2];
                            const totals = posteRows.reduce((acc, r) => {
                                acc.act += Number(r.actuel) || 0;
                                acc.calc += Number(r.calcule) || 0;
                                acc.bAct += Number(r[`b${curDir.key}_act`]) || 0;
                                acc.bCalc += Number(r[`b${curDir.key}_cal`]) || 0;
                                return acc;
                            }, { act: 0, calc: 0, vol: 0, bAct: 0, bCalc: 0 });
                            // Total volume en mode "union": on somme uniquement les valeurs distinctes.
                            // Si un volume identique apparait sur plusieurs postes, il n'est compté qu'une fois.
                            const uniqueVolKeys = new Set();
                            let uniqueVolTotal = 0;
                            posteRows.forEach((r) => {
                                const v = Number(r[`v${curDir.key}`]) || 0;
                                if (v <= 0) return;
                                const key = v.toFixed(6);
                                if (uniqueVolKeys.has(key)) return;
                                uniqueVolKeys.add(key);
                                uniqueVolTotal += v;
                            });
                            totals.vol = uniqueVolTotal;

                            return (
                                <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-3 flex-wrap"
                                        style={{ background: "linear-gradient(to right, #f8fafc, #ffffff)" }}>
                                        <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Détail par poste</p>
                                        <div className="flex items-center gap-1 ml-2 bg-slate-100 rounded-xl p-1">
                                            {DIR_TABS.map((d) => (
                                                <button
                                                    key={d.key}
                                                    onClick={() => setActiveDir(d.key)}
                                                    className="px-3 py-1 rounded-lg text-[9px] font-black transition-all"
                                                    style={activeDir === d.key
                                                        ? { background: "#0284c7", color: "#fff", boxShadow: "0 2px 8px #0284c740" }
                                                        : { color: "#64748b" }}
                                                >
                                                    {d.label}
                                                </button>
                                            ))}
                                        </div>
                                        <span className="ml-auto text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                            {posteRows.length} postes
                                        </span>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-[10px] border-collapse" style={{ minWidth: 640 }}>
                                            <thead>
                                                <tr className="border-b border-slate-200" style={{ background: "#f8fafc" }}>
                                                    <th className="text-left px-3 py-2 text-[8px] font-black uppercase text-slate-400 sticky left-0 z-20 border-r border-slate-200 min-w-[150px]"
                                                        style={{ background: "#f8fafc", borderTop: "3px solid #cbd5e1" }}>Poste</th>
                                                    <th className="text-center px-2 py-2 text-[8px] font-black uppercase text-slate-400 border-l border-slate-200 bg-slate-50"
                                                        style={{ borderTop: "3px solid #94a3b8" }}>Act.</th>
                                                    <th className="text-center px-2 py-2 text-[8px] font-black border-l border-slate-100 bg-slate-50"
                                                        style={{ color: "#0284c7", borderTop: "3px solid #0284c7" }}>Calc.</th>
                                                    <th className="w-3 border-l-2 border-slate-200" style={{ background: "#f1f5f9" }} />
                                                    <th className="text-center px-2 py-2 border-l border-slate-200 bg-slate-50"
                                                        style={{ borderTop: "3px solid #0f172a" }}>
                                                        <p className="text-[8px] font-black uppercase text-slate-600">Volume utilisé</p>
                                                    </th>
                                                    <th className="text-center px-2 py-2 border-l border-slate-200 bg-slate-50"
                                                        style={{ borderTop: "3px solid #64748b" }}>
                                                        <p className="text-[8px] font-black uppercase text-slate-500">Besoin Act.</p>
                                                        <p className="text-[7px] font-bold text-slate-400 mt-0.5">/jour · /heure</p>
                                                    </th>
                                                    <th className="text-center px-2 py-2 border-l border-slate-100 bg-slate-50"
                                                        style={{ borderTop: "3px solid #0284c7" }}>
                                                        <p className="text-[8px] font-black" style={{ color: "#0284c7" }}>Calc.</p>
                                                        <p className="text-[7px] font-bold text-slate-400 mt-0.5">/jour · /heure</p>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {posteRows.length === 0 ? (
                                                    <tr><td colSpan={7} className="text-center py-12 text-slate-300 italic">Aucun poste configuré.</td></tr>
                                                ) : posteRows.map((r, idx) => (
                                                    <tr key={idx}
                                                      className="dlg-table-row dlg-row-enter"
                                                      style={{ animationDelay: `${0.42 + idx * 0.04}s` }}>
                                                        <td className="px-3 py-1 sticky left-0 bg-inherit z-10 border-r border-slate-100 shadow-[1px_0_0_rgba(0,0,0,0.04)]">
                                                            <p className="font-bold text-slate-700 text-[10px] truncate max-w-[140px]" title={r.label}>{r.label}</p>
                                                            <p className="text-[7px] text-slate-400 uppercase tracking-tighter mt-0.5">{r.type}</p>
                                                        </td>
                                                        <td className="px-2 py-1 text-center font-bold text-slate-500 border-l border-slate-100">{fmt(r.actuel)}</td>
                                                        <td className="px-2 py-2 text-center font-black border-l border-slate-100" style={{ color: "#0284c7" }}>{fmt(r.calcule)}</td>
                                                        <td className="border-l-2 border-slate-200" style={{ background: "#f1f5f9" }} />
                                                        <td className="px-2 py-1 text-center border-l border-slate-100">
                                                            <p className="font-black text-slate-700 text-[11px] leading-none">{fmt(r[`v${curDir.key}`])}</p>
                                                        </td>
                                                        <td className="px-2 py-1 text-center border-l border-slate-100">
                                                            <p className="font-black text-slate-700 text-[11px] leading-none">{fmt(r[`b${curDir.key}_act`])} <span className="text-[8px] font-bold text-slate-400">/jrs</span></p>
                                                            <p className="font-bold text-slate-400 text-[9px] mt-0.5">{fmt(r[`b${curDir.key}Hs_act`], 1)}/h</p>
                                                        </td>
                                                        <td className="px-2 py-1 text-center border-l border-slate-100">
                                                            <p className="font-black text-[11px] leading-none" style={{ color: "#0284c7" }}>{fmt(r[`b${curDir.key}_cal`])} <span className="text-[8px] font-bold" style={{ color: "#0284c788" }}>/jrs</span></p>
                                                            <p className="font-bold text-[9px] mt-0.5 text-slate-400">{fmt(r[`b${curDir.key}Hs_cal`], 1)}/h</p>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>
            </DialogContent>
        </Dialog>
    );
}

