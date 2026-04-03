import React, { useMemo, useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import "@/styles/dialog-animations.css";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tag, CheckCircle2, XCircle, Layers, BarChart2, Globe, Users, HelpCircle } from "lucide-react";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function safeNum(val) {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(String(val).replace(',', '.')) || 0;
}

function getGlobalSum(obj) {
    if (!obj) return 0;
    if (typeof obj === "string" || typeof obj === "number") return parseFloat(String(obj).replace(",", ".")) || 0;
    if (obj.global !== undefined) return parseFloat(String(obj.global).replace(",", ".")) || 0;
    let sum = 0;
    Object.values(obj).forEach((v) => { sum += getGlobalSum(v); });
    return sum;
}

function getTierScore(value, tiers) {
    for (const t of tiers) {
        if (value >= t.min && (t.max === null || value <= t.max)) return t.score;
    }
    return 0;
}

function formatTierRange(t) {
    if (t.max === null) return `≥ ${t.min}`;
    return `${t.min} – ${t.max}`;
}

function getActiveTierIndex(value, tiers) {
    for (let i = tiers.length - 1; i >= 0; i--) {
        if (value >= tiers[i].min) return i;
    }
    return 0;
}

// ─────────────────────────────────────────────
// TIER DEFINITIONS
// ─────────────────────────────────────────────

const TIERS_AMANA = [
    { label: "Très faible", min: 0, max: 90, score: 0 },
    { label: "Faible", min: 90, max: 310, score: 25 },
    { label: "Moyen", min: 310, max: 910, score: 50 },
    { label: "Fort", min: 910, max: 2920, score: 75 },
    { label: "Très fort", min: 2920, max: null, score: 100 },
];
const TIERS_CR = [
    { label: "Très faible", min: 0, max: 23, score: 0 },
    { label: "Faible", min: 23, max: 43, score: 25 },
    { label: "Moyen", min: 43, max: 83, score: 50 },
    { label: "Fort", min: 83, max: 117, score: 75 },
    { label: "Très fort", min: 117, max: null, score: 100 },
];
const TIERS_CO = [
    { label: "Très faible", min: 0, max: 1742, score: 0 },
    { label: "Faible", min: 1742, max: 3258, score: 25 },
    { label: "Moyen", min: 3258, max: 5758, score: 50 },
    { label: "Fort", min: 5758, max: 11705, score: 75 },
    { label: "Très fort", min: 11705, max: null, score: 100 },
];
const TIERS_ELEC = [
    { label: "Très faible", min: 0, max: 8, score: 0 },
    { label: "Faible", min: 8, max: 44, score: 25 },
    { label: "Moyen", min: 44, max: 104, score: 50 },
    { label: "Fort", min: 104, max: 203, score: 75 },
    { label: "Très fort", min: 203, max: null, score: 100 },
];
const TIERS_EFFECTIF = [
    { label: "< 2", min: 0, max: 2, score: 0 },
    { label: "2 – 5", min: 2, max: 5, score: 25 },
    { label: "5 – 10", min: 5, max: 10, score: 50 },
    { label: "10 – 15", min: 10, max: 15, score: 75 },
    { label: "> 15", min: 15, max: null, score: 100 },
];
const TIERS_TOURNEES = [
    { label: "1 – 3", min: 0, max: 3, score: 0 },
    { label: "4 – 6", min: 4, max: 6, score: 25 },
    { label: "7 – 10", min: 7, max: 10, score: 50 },
    { label: "11 – 20", min: 11, max: 20, score: 75 },
    { label: "> 20", min: 21, max: null, score: 100 },
];

const CHEF_LIEU_OPTIONS = [
    { label: "Non chef-lieu", score: 0 },
    { label: "Chef-lieu de province", score: 50 },
    { label: "Chef-lieu de région", score: 100 },
];
const SITES_OPTIONS = [
    { label: "1 – 2", score: 0 },
    { label: "3 – 4", score: 25 },
    { label: "5 – 6", score: 50 },
    { label: "7 – 8", score: 75 },
    { label: "> 8", score: 100 },
];

// ─────────────────────────────────────────────
// CLASS resolver
// ─────────────────────────────────────────────
function resolveClass(score) {
    if (score > 75) return { key: "D", label: "Classe D", color: "emerald", description: "Grand Centre / HUB" };
    if (score >= 50) return { key: "C", label: "Classe C", color: "blue", description: "Centre Intermédiaire" };
    if (score >= 26) return { key: "B", label: "Classe B", color: "amber", description: "Centre Standard" };
    return { key: "A", label: "Classe A", color: "rose", description: "Petit Centre / Satellite" };
}

// ─────────────────────────────────────────────
// TRANCHE — badge tranche active + popover (toutes tranches / seuils / scores)
// ─────────────────────────────────────────────
function TierBar({ tiers, value }) {
    const activeIdx = getActiveTierIndex(Number(value) || 0, tiers);
    const current = tiers[activeIdx];
    const numVal = Number(value) || 0;
    const valueLabel = Number.isInteger(numVal) ? String(numVal) : numVal.toFixed(2);

    return (
        <div className="inline-flex max-w-full min-w-0 items-center gap-1">
            <span
                className="inline-flex min-w-0 max-w-[12rem] items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2 py-1 text-[10px] font-semibold text-slate-800 shadow-sm sm:max-w-[15rem]"
                title={`${current?.label} — ${current?.score ?? 0} pts`}
            >
                <span className="truncate">{current?.label ?? "—"}</span>
                <span className="shrink-0 font-mono text-[9px] font-bold tabular-nums text-[#1d6ab8]">
                    {current?.score ?? 0} pts
                </span>
            </span>
            <Popover>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-colors hover:border-[#1d6ab8]/40 hover:bg-[#e8f2fb] hover:text-[#1d6ab8] focus:outline-none focus:ring-2 focus:ring-[#1d6ab8]/25"
                        aria-label="Voir toutes les tranches et leurs scores"
                    >
                        <HelpCircle className="h-3 w-3" strokeWidth={2} aria-hidden />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    className="z-[200] w-[min(20rem,calc(100vw-2rem))] border-slate-200 p-0 shadow-lg"
                    align="end"
                    sideOffset={6}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <div className="border-b border-slate-100 bg-slate-50/90 px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Échelle des tranches</p>
                        <p className="mt-1 text-[9px] leading-snug text-slate-500">
                            Valeur calculée : <span className="font-mono font-semibold text-slate-700">{valueLabel}</span>
                            {" · "}
                            tranche « <span className="font-semibold text-[#0a2540]">{current?.label}</span> »
                        </p>
                    </div>
                    <ul className="max-h-52 overflow-y-auto overscroll-contain py-1" role="list">
                        {tiers.map((t, i) => {
                            const active = i === activeIdx;
                            return (
                                <li
                                    key={i}
                                    role="listitem"
                                    className={`flex items-center gap-2 px-3 py-1.5 text-[10px] ${active ? "bg-[#e8f2fb] font-semibold text-[#0a2540]" : "text-slate-600"}`}
                                >
                                    <span className="min-w-0 flex-1 leading-tight">{t.label}</span>
                                    <span className="shrink-0 font-mono text-[9px] tabular-nums text-slate-400">
                                        {formatTierRange(t)}
                                    </span>
                                    <span className="w-12 shrink-0 text-right font-mono text-[9px] font-bold tabular-nums text-[#1d6ab8]">
                                        {t.score} pts
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </PopoverContent>
            </Popover>
        </div>
    );
}

// ─────────────────────────────────────────────
// VOLUME BADGE
// ─────────────────────────────────────────────
function VolumePerDayBadge({ value }) {
    const n = Number(value) || 0;
    return (
        <span className="inline-flex shrink-0 items-center text-[10px] font-mono font-bold text-[#004a87] tabular-nums px-2 py-0.5 rounded-md bg-[#e8f2fb] border border-[#b8d5f0]">
            {n.toFixed(0)}<span className="opacity-60 ml-0.5 font-normal">/j</span>
        </span>
    );
}

// ─────────────────────────────────────────────
// QUESTION ROW
// ─────────────────────────────────────────────
function QuestionRow({ label, weight, children, score, metaLeft }) {
    const pts = ((score * weight) / 100);

    return (
        <div className="group relative flex flex-col sm:flex-row sm:items-center gap-2 py-3 px-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors duration-150">
            {/* Left label */}
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[11px] font-semibold text-slate-900 leading-tight">{label}</span>
                    {metaLeft}
                </div>
            </div>
            {/* Content (TierBar / chips) */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {children}
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-1">
                <div className="text-right min-w-[44px]">
                    <div className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider">Pts</div>
                    <div className="text-[11px] font-black text-slate-600 tabular-nums">{pts.toFixed(1)}</div>
                </div>
                <div className="text-right min-w-[40px]">
                    <div className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider">Coef</div>
                    <div className="text-[11px] font-black text-slate-600 tabular-nums">{weight}<span className="text-[8px] text-slate-400">%</span></div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// BLOCK CARD — top-accent colored border
// ─────────────────────────────────────────────
function BlockCard({ title, icon: Icon, color, children, blockScore }) {
    const themes = {
        purple: { accent: "#7c3aed", accentLight: "#ede9fe", iconBg: "bg-violet-100", iconText: "text-violet-600", bar: "bg-violet-500", label: "text-violet-700" },
        blue:   { accent: "#1d6ab8", accentLight: "#dbeafe", iconBg: "bg-blue-100",   iconText: "text-blue-600",   bar: "bg-blue-500",   label: "text-blue-700" },
        teal:   { accent: "#0d9488", accentLight: "#ccfbf1", iconBg: "bg-teal-100",   iconText: "text-teal-600",   bar: "bg-teal-500",   label: "text-teal-700" },
        amber:  { accent: "#d97706", accentLight: "#fef3c7", iconBg: "bg-amber-100",  iconText: "text-amber-600",  bar: "bg-amber-500",  label: "text-amber-700" },
    };
    const t = themes[color] || themes.blue;

    return (
        <div className="group/card relative bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.10)] overflow-hidden h-full flex flex-col transition-all duration-300 hover:shadow-[0_8px_30px_-8px_rgba(15,23,42,0.14)] hover:-translate-y-0.5">
            {/* Top accent bar */}
            <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${t.accent}dd, ${t.accent}66)` }} />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl ${t.iconBg} flex items-center justify-center ring-1 ring-white/60 shadow-sm transition-transform duration-300 group-hover/card:scale-110`}>
                        <Icon className={`w-4 h-4 ${t.iconText}`} />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-700">{title}</h3>
                </div>
                <div className="text-right shrink-0 min-w-[52px]">
                    <div className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider">Score</div>
                    <div className={`text-[13px] font-black tabular-nums ${t.label} leading-none mt-0.5`}>
                        {blockScore.toFixed(1)}
                        <span className="text-[9px] font-bold text-slate-400 ml-0.5">/ 100</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col divide-y divide-slate-100/80">
                {children}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function CategorisationDialog({ open, onOpenChange, wizardData, simulationResults, centreDetails, mode, effectifGlobalValue, sitesCountFromRecap }) {
    const [chefLieuIdx, setChefLieuIdx] = useState(0);
    const [sitesIdx, setSitesIdx] = useState(0);
    const [animKey, setAnimKey] = useState(0);
    useEffect(() => { if (open) setAnimKey((k) => k + 1); }, [open]);

    useEffect(() => {
        const count = Number(
            sitesCountFromRecap !== undefined && sitesCountFromRecap !== null
                ? sitesCountFromRecap
                : (centreDetails?.sites_count ?? 0)
        );
        if (!Number.isNaN(count)) {
            if (count <= 2) setSitesIdx(0);
            else if (count <= 4) setSitesIdx(1);
            else if (count <= 6) setSitesIdx(2);
            else if (count <= 8) setSitesIdx(3);
            else setSitesIdx(4);
        }
    }, [sitesCountFromRecap, centreDetails?.sites_count]);

    const scoring = useMemo(() => {
        if (!wizardData) return null;
        const grid = wizardData.gridValues || {};
        const tasks = simulationResults?.tasks || [];

        const hasDistrib = tasks.some(t => (t.responsable || "").toLowerCase().includes("facteur") && (t.heures_calculees || 0) > 0);
        const scoreDistrib = hasDistrib ? 100 : 0;
        const hasAcheminement = safeNum(wizardData.pctAxesArrivee) > 0 || safeNum(wizardData.amana_pctAxesArrivee) > 0 || safeNum(wizardData.co_pctAxesArrivee) > 0 || safeNum(wizardData.cr_pctAxesArrivee) > 0;
        const scoreAcheminement = hasAcheminement ? 100 : 0;
        const hasGuichet = safeNum(wizardData.hasGuichet) > 0;
        const scoreGuichet = hasGuichet ? 100 : 0;
        const hasBaridPro = tasks.some(t => (t.famille || "").toLowerCase().includes("barid pro") && (t.heures_calculees || 0) > 0);
        const scoreBaridPro = hasBaridPro ? 100 : 0;
        const bloc1 = (scoreDistrib * 12 + scoreAcheminement * 6 + scoreGuichet * 6 + scoreBaridPro * 2) / 100;

        const amanaGlobal = getGlobalSum(grid.amana) / 264;
        const scoreAmana = getTierScore(amanaGlobal, TIERS_AMANA);
        const crGlobal = getGlobalSum(grid.cr) / 264;
        const scoreCR = getTierScore(crGlobal, TIERS_CR);
        const coGlobal = getGlobalSum(grid.co) / 264;
        const scoreCO = getTierScore(coGlobal, TIERS_CO);
        const elecGlobal = (getGlobalSum(grid.lrh) + getGlobalSum(grid.ebarkia)) / 264;
        const scoreElec = getTierScore(elecGlobal, TIERS_ELEC);
        const bloc2 = (scoreAmana * 12 + scoreCR * 8 + scoreCO * 8 + scoreElec * 4) / 100;

        const chefLieuScore = CHEF_LIEU_OPTIONS[chefLieuIdx].score;
        const sitesScore = SITES_OPTIONS[sitesIdx].score;
        const resParPoste = simulationResults?.ressources_par_poste || {};
        const nbTournees = Math.round(Object.entries(resParPoste).reduce((sum, [label, fte]) => label.toLowerCase().includes("facteur") ? sum + (Number(fte) || 0) : sum, 0));
        const scoreTournees = getTierScore(nbTournees, TIERS_TOURNEES);
        const bloc3 = (chefLieuScore * 10 + sitesScore * 8 + scoreTournees * 8) / 100;

        const effectif = Number(effectifGlobalValue ?? 0);
        const scoreEffectif = getTierScore(effectif, TIERS_EFFECTIF);
        const shift = safeNum(wizardData.shift || 1);
        const scoreShift = shift >= 3 ? 100 : shift === 2 ? 50 : 0;
        const bloc4 = (scoreEffectif * 11 + scoreShift * 5) / 100;

        const totalScore = bloc1 + bloc2 + bloc3 + bloc4;
        const classInfo = resolveClass(totalScore);
        const currentClass = centreDetails?.classe_actuelle || "SANS";

        return {
            bloc1: { score: bloc1, distribScore: scoreDistrib, hasDistrib, achScore: scoreAcheminement, hasAcheminement, guichetScore: scoreGuichet, hasGuichet, baridScore: scoreBaridPro, hasBaridPro },
            bloc2: { score: bloc2, amanaGlobal, scoreAmana, crGlobal, scoreCR, coGlobal, scoreCO, elecGlobal, scoreElec },
            bloc3: { score: bloc3, chefLieuScore, sitesScore, nbTournees, scoreTournees },
            bloc4: { score: bloc4, effectif, scoreEffectif, shift, scoreShift },
            totalScore, classInfo, currentClass
        };
    }, [wizardData, simulationResults, chefLieuIdx, sitesIdx, centreDetails, effectifGlobalValue]);

    if (!scoring) return null;
    const { bloc1, bloc2, bloc3, bloc4, totalScore, classInfo, currentClass } = scoring;

    const classConfig = {
        emerald: { ring: "ring-emerald-400", bg: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "text-emerald-600" },
        blue:    { ring: "ring-blue-400",    bg: "bg-blue-500",    badge: "bg-blue-50 text-blue-700 border-blue-200",       text: "text-blue-600" },
        amber:   { ring: "ring-amber-400",   bg: "bg-amber-500",   badge: "bg-amber-50 text-amber-700 border-amber-200",    text: "text-amber-600" },
        rose:    { ring: "ring-rose-400",    bg: "bg-rose-500",    badge: "bg-rose-50 text-rose-700 border-rose-200",       text: "text-rose-600" },
    };
    const cc = classConfig[classInfo.color];

    // Breakdown bar widths for summary
    const blocs = [
        { label: "Complexité", score: bloc1.score, color: "#7c3aed", weight: 26 },
        { label: "Charge", score: bloc2.score, color: "#1d6ab8", weight: 32 },
        { label: "Territoire", score: bloc3.score, color: "#0d9488", weight: 26 },
        { label: "Ressources", score: bloc4.score, color: "#d97706", weight: 16 },
    ];

    const YesNoChip = ({ value }) => value ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full shadow-sm">
            <CheckCircle2 className="w-3 h-3 shrink-0" /> OUI
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-full">
            <XCircle className="w-3 h-3 shrink-0 opacity-60" /> NON
        </span>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                key={animKey}
                className="dlg-enter flex flex-col max-w-none sm:max-w-5xl max-h-[92vh] p-0 border-0 bg-[#f8fafc] shadow-[0_32px_80px_-20px_rgba(15,23,42,0.40)] rounded-2xl overflow-hidden gap-0"
            >
                {/* ── HEADER ── */}
                <DialogHeader className="relative p-0 shrink-0 z-10">
                    {/* Deep blue gradient header */}
                    <div className="relative bg-[#0a2540] px-6 py-5 overflow-hidden">
                        {/* Subtle grid texture */}
                        <div className="absolute inset-0 opacity-[0.04]" style={{
                            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,1) 39px, rgba(255,255,255,1) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,1) 39px, rgba(255,255,255,1) 40px)"
                        }} />
                        {/* Glow orbs */}
                        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-[#1d6ab8]/20 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-4 left-20 w-32 h-32 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />

                        <DialogTitle className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            {/* Left: title */}
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
                                    <Tag className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <div className="text-[15px] font-black text-white tracking-tight leading-none">Analyse de Catégorisation</div>
                                    <div className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.2em] mt-1">
                                        Processus {mode === "optimise" ? "Optimisé" : mode === "recommande" ? "Consolidé" : "Actuel"}
                                    </div>
                                </div>
                            </div>

                            {/* Right: metrics cluster */}
                            <div className="flex items-center gap-3">
                                {/* Current class */}
                                <div className="text-center px-4 py-2 rounded-xl bg-white/8 ring-1 ring-white/15">
                                    <div className="text-[8px] font-bold text-white/50 uppercase tracking-widest mb-1">Classe actuelle</div>
                                    <div className="text-[15px] font-black text-white/80 leading-none tabular-nums">
                                        {String(currentClass).replace("Classe ", "")}
                                    </div>
                                </div>

                                {/* Separator */}
                                <div className="h-10 w-px bg-white/15" />

                                {/* Score */}
                                <div className="text-center px-4 py-2 rounded-xl bg-white/8 ring-1 ring-white/15">
                                    <div className="text-[8px] font-bold text-white/50 uppercase tracking-widest mb-1">Score calculé</div>
                                    <div className="text-[22px] font-black text-white leading-none tabular-nums">
                                        {totalScore.toFixed(1)}
                                        <span className="text-[11px] font-bold text-white/40 ml-0.5">/100</span>
                                    </div>
                                </div>

                                {/* Separator */}
                                <div className="h-10 w-px bg-white/15" />

                                {/* Class badge */}
                                <div className="flex flex-col items-center gap-1">
                                    <div className="text-[8px] font-bold text-white/50 uppercase tracking-widest">Classe finale</div>
                                    <div className={`w-12 h-12 rounded-2xl ${cc.bg} flex flex-col items-center justify-center shadow-lg ring-2 ring-white/20 transition-transform duration-300 hover:scale-105`}>
                                        <span className="text-[22px] font-black text-white leading-none drop-shadow-sm">{classInfo.key}</span>
                                    </div>
                                </div>
                            </div>
                        </DialogTitle>
                    </div>

                    {/* Bloc score strip — thin colored bars under header */}
                    <div className="flex h-1">
                        {blocs.map((b, i) => (
                            <div key={i} className="h-full transition-all duration-700" style={{ flex: b.weight, background: b.color, opacity: 0.7 + (b.score / 100) * 0.3 }} />
                        ))}
                    </div>
                </DialogHeader>

                {/* Corps défilant (header + footer restent visibles) */}
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain scroll-smooth">
                {/* ── BODY ── */}
                <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">

                    {/* BLOC 1 */}
                    <BlockCard title="Complexité Opérationnelle" icon={Layers} color="purple" blockScore={bloc1.score}>
                        <QuestionRow label="Distribution Finale" weight={12} score={bloc1.distribScore}>
                            <YesNoChip value={bloc1.hasDistrib} />
                        </QuestionRow>
                        <QuestionRow label="Acheminement" weight={6} score={bloc1.achScore}>
                            <YesNoChip value={bloc1.hasAcheminement} />
                        </QuestionRow>
                        <QuestionRow label="Guichet Actif" weight={6} score={bloc1.guichetScore}>
                            <YesNoChip value={bloc1.hasGuichet} />
                        </QuestionRow>
                        <QuestionRow label="Barid Pro" weight={2} score={bloc1.baridScore}>
                            <YesNoChip value={bloc1.hasBaridPro} />
                        </QuestionRow>
                    </BlockCard>

                    {/* BLOC 2 */}
                    <BlockCard title="Charge Opérationnelle" icon={BarChart2} color="blue" blockScore={bloc2.score}>
                        <QuestionRow label="Volume Amana" metaLeft={<VolumePerDayBadge value={bloc2.amanaGlobal} />} weight={12} score={bloc2.scoreAmana}>
                            <TierBar tiers={TIERS_AMANA} value={bloc2.amanaGlobal} />
                        </QuestionRow>
                        <QuestionRow label="Volume CR" metaLeft={<VolumePerDayBadge value={bloc2.crGlobal} />} weight={8} score={bloc2.scoreCR}>
                            <TierBar tiers={TIERS_CR} value={bloc2.crGlobal} />
                        </QuestionRow>
                        <QuestionRow label="Volume CO" metaLeft={<VolumePerDayBadge value={bloc2.coGlobal} />} weight={8} score={bloc2.scoreCO}>
                            <TierBar tiers={TIERS_CO} value={bloc2.coGlobal} />
                        </QuestionRow>
                        <QuestionRow label="Courrier Électronique" metaLeft={<VolumePerDayBadge value={bloc2.elecGlobal} />} weight={4} score={bloc2.scoreElec}>
                            <TierBar tiers={TIERS_ELEC} value={bloc2.elecGlobal} />
                        </QuestionRow>
                    </BlockCard>

                    {/* BLOC 3 */}
                    <BlockCard title="Rôle Territorial & Réseau" icon={Globe} color="teal" blockScore={bloc3.score}>
                        <QuestionRow label="Chef-lieu" weight={10} score={bloc3.chefLieuScore}>
                            <select
                                value={chefLieuIdx}
                                onChange={e => setChefLieuIdx(Number(e.target.value))}
                                className="text-[11px] font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 shadow-sm transition-all duration-150 hover:border-teal-400/60 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400/60 cursor-pointer"
                            >
                                {CHEF_LIEU_OPTIONS.map((o, i) => (
                                    <option key={i} value={i}>{o.label}</option>
                                ))}
                            </select>
                        </QuestionRow>
                        <QuestionRow label="Nombre de sites rattachés" weight={8} score={bloc3.sitesScore}>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-teal-800 tabular-nums px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200/70">
                                    <Globe className="w-3 h-3 text-teal-500" />
                                    {Number(sitesCountFromRecap !== undefined && sitesCountFromRecap !== null ? sitesCountFromRecap : (centreDetails?.sites_count ?? 0))}
                                    <span className="text-[9px] font-bold text-teal-600/70">site(s)</span>
                                </span>
                                <span className="text-[9px] font-mono font-semibold text-slate-400 px-1.5 py-0.5 rounded bg-slate-100/80 border border-slate-200/60">
                                    {SITES_OPTIONS[sitesIdx]?.label || "1 – 2"}
                                </span>
                            </div>
                        </QuestionRow>
                        <QuestionRow label="Nombre de tournées" weight={8} score={bloc3.scoreTournees}>
                            <span className="text-[11px] font-black text-teal-800 tabular-nums px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200/70">{bloc3.nbTournees}</span>
                            <TierBar tiers={TIERS_TOURNEES} value={bloc3.nbTournees} />
                        </QuestionRow>
                    </BlockCard>

                    {/* BLOC 4 */}
                    <BlockCard title="Ressources" icon={Users} color="amber" blockScore={bloc4.score}>
                        <QuestionRow label={`Effectif Global (${mode === "optimise" ? "optimisé" : mode === "recommande" ? "consolidé" : "calculé"})`} weight={11} score={bloc4.scoreEffectif}>
                            <span className="text-[9px] font-black text-amber-800 tabular-nums px-1.5 py-0.5 rounded-lg bg-amber-50 border border-amber-200/80">{bloc4.effectif} ETP</span>
                            <TierBar tiers={TIERS_EFFECTIF} value={bloc4.effectif} />
                        </QuestionRow>
                        <QuestionRow label="Amplitude horaire (Shift)" weight={5} score={bloc4.scoreShift}>
                            <span className="text-[10px] font-black text-slate-700 tabular-nums px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">{bloc4.shift} shift</span>
                        </QuestionRow>
                    </BlockCard>

                    {/* ── SCORE SUMMARY ── */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)] overflow-hidden">
                        {/* Top label */}
                        <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center gap-2">
                            <div className="w-1 h-4 rounded-full bg-[#0a2540]" />
                            <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Synthèse des scores</h4>
                        </div>

                        <div className="px-6 py-5 flex flex-col sm:flex-row items-center gap-6">
                            {/* Bloc breakdown */}
                            <div className="flex-1 w-full space-y-3">
                                {blocs.map((b, i) => {
                                    const pct = Math.min(b.score, 100);
                                    return (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="text-[10px] font-semibold text-slate-500 w-20 shrink-0 text-right">{b.label}</div>
                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                                    style={{ width: `${pct}%`, background: b.color }}
                                                />
                                            </div>
                                            <div className="text-[10px] font-black tabular-nums w-10 text-right" style={{ color: b.color }}>
                                                {b.score.toFixed(1)}
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Threshold chips */}
                                <div className="flex gap-1.5 pt-1 flex-wrap">
                                    {[
                                        { label: "A — 0 à 25", color: "bg-rose-50 text-rose-500 border-rose-200" },
                                        { label: "B — 26 à 50", color: "bg-amber-50 text-amber-600 border-amber-200" },
                                        { label: "C — 51 à 75", color: "bg-blue-50 text-blue-600 border-blue-200" },
                                        { label: "D — 75+", color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
                                    ].map((s, i) => (
                                        <span key={i} className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="hidden sm:block w-px h-24 bg-slate-100" />

                            {/* Final class display */}
                            <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl border-2 ${cc.badge} transition-all duration-300 hover:scale-[1.02] group shrink-0`}>
                                <div className="text-right">
                                    <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Classe Finale</div>
                                    <div className="text-[13px] font-black leading-tight">{classInfo.description}</div>
                                    <div className="text-[22px] font-black tabular-nums leading-none mt-1 opacity-80">{totalScore.toFixed(1)}<span className="text-[11px] font-bold opacity-50 ml-0.5">/100</span></div>
                                </div>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black ${cc.bg} text-white shadow-md ring-4 ring-white/60 transition-transform duration-300 group-hover:scale-105`}>
                                    {classInfo.key}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </div>

                {/* ── FOOTER ── */}
                <div className="px-5 py-3.5 bg-white border-t border-slate-200/80 flex justify-end rounded-b-2xl shrink-0 z-10">
                    <Button
                        onClick={() => onOpenChange(false)}
                        className="bg-[#0a2540] hover:bg-[#0d3060] text-white shadow-md hover:shadow-lg px-7 font-bold text-[11px] rounded-xl transition-all duration-200 border-0 h-9"
                    >
                        Fermer l'analyse
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}