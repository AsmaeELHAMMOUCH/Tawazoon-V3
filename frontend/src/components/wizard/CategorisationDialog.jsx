import React, { useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tag, CheckCircle2, XCircle, Layers, BarChart2, Globe, Users } from "lucide-react";

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
    // Sum nested objects
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

const TIER_COLORS = [
    "bg-slate-100 text-slate-500 border-slate-200",
    "bg-yellow-50 text-yellow-700 border-yellow-200",
    "bg-orange-50 text-orange-700 border-orange-200",
    "bg-red-50 text-red-700 border-red-200",
    "bg-rose-100 text-rose-800 border-rose-300",
];
const TIER_COLORS_ACTIVE = [
    "bg-slate-400 text-white border-slate-500",
    "bg-yellow-400 text-white border-yellow-500",
    "bg-orange-500 text-white border-orange-600",
    "bg-red-500 text-white border-red-600",
    "bg-rose-700 text-white border-rose-800",
];

// ─────────────────────────────────────────────
// CLASS resolver : D is highest (best)
// ─────────────────────────────────────────────
function resolveClass(score) {
    if (score > 75) return { key: "D", label: "Classe D", color: "emerald", description: "Grand Centre / HUB" };
    if (score >= 50) return { key: "C", label: "Classe C", color: "blue", description: "Centre Intermédiaire" };
    if (score >= 26) return { key: "B", label: "Classe B", color: "amber", description: "Centre Standard" };
    return { key: "A", label: "Classe A", color: "rose", description: "Petit Centre / Satellite" };
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function TierBar({ tiers, value }) {
    const n = tiers.length;
    let activeIdx = 0;
    for (let i = n - 1; i >= 0; i--) {
        if (value >= tiers[i].min) { activeIdx = i; break; }
    }
    return (
        <div className="flex flex-wrap items-center gap-1">
            {tiers.map((t, i) => {
                const active = i === activeIdx;
                return (
                    <span
                        key={i}
                        title={`${t.label} → Score: ${t.score}`}
                        className={`text-[8px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap transition-all duration-200 ${active ? TIER_COLORS_ACTIVE[i] : TIER_COLORS[i]}`}
                    >
                        {t.label}
                    </span>
                );
            })}
        </div>
    );
}

function QuestionRow({ label, weight, children, score, maxScore = 100 }) {
    return (
        <div className="group flex flex-col sm:flex-row sm:items-center gap-3 py-3 px-4 hover:bg-slate-50/80 transition-all duration-300 border-b border-slate-50 last:border-0">
            <div className="flex-1 min-w-0 pr-2">
                <span className="text-[11px] font-bold text-slate-700 block leading-tight">{label}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <div className="flex items-center gap-2">
                    {children}
                </div>
                <div className="hidden sm:block w-[1px] h-8 bg-slate-100 mx-1" />
                <div className="text-right flex flex-col items-end min-w-[60px]">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                        Coef: {weight}%
                    </div>
                    <div className={`text-[12px] font-black tabular-nums leading-none ${score > 0 ? "text-indigo-600" : "text-slate-400"}`}>
                        {((score * weight) / 100).toFixed(1)} <span className="text-[8px] uppercase tracking-tighter opacity-70">pts</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BlockCard({ title, icon: Icon, color, children, blockScore }) {
    const colorThemes = {
        purple: {
            border: "border-purple-200",
            iconBg: "bg-purple-100",
            iconText: "text-purple-600",
            scoreBg: "bg-purple-500",
            headerBg: "bg-gradient-to-r from-purple-50 to-white"
        },
        blue: {
            border: "border-blue-200",
            iconBg: "bg-blue-100",
            iconText: "text-blue-600",
            scoreBg: "bg-blue-500",
            headerBg: "bg-gradient-to-r from-blue-50 to-white"
        },
        teal: {
            border: "border-teal-200",
            iconBg: "bg-teal-100",
            iconText: "text-teal-600",
            scoreBg: "bg-teal-500",
            headerBg: "bg-gradient-to-r from-teal-50 to-white"
        },
        amber: {
            border: "border-amber-200",
            iconBg: "bg-amber-100",
            iconText: "text-amber-600",
            scoreBg: "bg-amber-500",
            headerBg: "bg-gradient-to-r from-amber-50 to-white"
        },
    };

    const theme = colorThemes[color] || colorThemes.blue;

    return (
        <div className={`bg-white rounded-2xl border ${theme.border} shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-300 h-full flex flex-col`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 ${theme.headerBg} border-b border-slate-100 shrink-0`}>
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${theme.iconBg} flex items-center justify-center shadow-inner`}>
                        <Icon className={`w-5 h-5 ${theme.iconText}`} />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-800 leading-tight flex-1">{title}</h3>
                </div>
                <div className="flex flex-col items-end shrink-0 ml-2">
                    <div className={`text-[13px] font-black ${theme.iconText} leading-none`}>
                        {blockScore.toFixed(1)}
                        <span className="text-[9px] font-bold text-slate-400 ml-1">/ 100</span>
                    </div>
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                        <div
                            className={`h-full ${theme.scoreBg} transition-all duration-500`}
                            style={{ width: `${Math.min(blockScore, 100)}%` }}
                        />
                    </div>
                </div>
            </div>
            {/* Content */}
            <div className="flex-1 divide-y divide-slate-50 flex flex-col">
                <div className="flex-1">
                    {children}
                </div>
                {/* Reference list to prevent Tailwind purging dynamic classes */}
                <div className="hidden text-blue-500 text-teal-500 text-amber-500 text-purple-500 text-blue-600 text-teal-600 text-amber-600 text-purple-600 border-blue-200 border-teal-200 border-amber-200 border-purple-200 bg-blue-50 bg-teal-50 bg-amber-50 bg-purple-50" />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function CategorisationDialog({ open, onOpenChange, wizardData, simulationResults, centreDetails, mode }) {
    const [chefLieuIdx, setChefLieuIdx] = useState(0);
    const [sitesIdx, setSitesIdx] = useState(0);

    const scoring = useMemo(() => {
        if (!wizardData) return null;

        const grid = wizardData.gridValues || {};
        const tasks = simulationResults?.tasks || [];

        // ── BLOC 1: Complexité opérationnelle ──
        // Distribution finale : taches dont le poste (responsable) contient "facteur"
        const hasDistrib = tasks.some(t =>
            (t.responsable || "").toLowerCase().includes("facteur") &&
            (t.heures_calculees || 0) > 0
        );
        const scoreDistrib = hasDistrib ? 100 : 0;

        // Acheminement : %Axes > 0 (Global ou par Flux)
        const hasAcheminement =
            safeNum(wizardData.pctAxesArrivee) > 0 ||
            safeNum(wizardData.amana_pctAxesArrivee) > 0 ||
            safeNum(wizardData.co_pctAxesArrivee) > 0 ||
            safeNum(wizardData.cr_pctAxesArrivee) > 0;
        const scoreAcheminement = hasAcheminement ? 100 : 0;

        // Guichet actif
        const hasGuichet = safeNum(wizardData.hasGuichet) > 0;
        const scoreGuichet = hasGuichet ? 100 : 0;

        // Barid Pro : famille = "Barid Pro" avec heures > 0
        const hasBaridPro = tasks.some(t =>
            (t.famille || "").toLowerCase().includes("barid pro") &&
            (t.heures_calculees || 0) > 0
        );
        const scoreBaridPro = hasBaridPro ? 100 : 0;

        const bloc1 = (scoreDistrib * 12 + scoreAcheminement * 6 + scoreGuichet * 6 + scoreBaridPro * 2) / 100;

        // ── BLOC 2: Charge opérationnelle ──
        // Volume Amana : global départ + global arrivée / 264
        const amanaGlobal = getGlobalSum(grid.amana) / 264;
        const scoreAmana = getTierScore(amanaGlobal, TIERS_AMANA);

        // Volume CR
        const crGlobal = getGlobalSum(grid.cr) / 264;
        const scoreCR = getTierScore(crGlobal, TIERS_CR);

        // Volume CO
        const coGlobal = getGlobalSum(grid.co) / 264;
        const scoreCO = getTierScore(coGlobal, TIERS_CO);

        // Courrier électronique : LRH + eBarkia / 264
        const lrhGlobal = getGlobalSum(grid.lrh);
        const ebarkiaGlobal = getGlobalSum(grid.ebarkia);
        const elecGlobal = (lrhGlobal + ebarkiaGlobal) / 264;
        const scoreElec = getTierScore(elecGlobal, TIERS_ELEC);

        const bloc2 = (scoreAmana * 12 + scoreCR * 8 + scoreCO * 8 + scoreElec * 4) / 100;

        // ── BLOC 3: Rôle territorial ──
        const chefLieuScore = CHEF_LIEU_OPTIONS[chefLieuIdx].score;
        const sitesScore = SITES_OPTIONS[sitesIdx].score;

        // Tournées = somme des postes qui contiennent "facteur"
        const resParPoste = simulationResults?.ressources_par_poste || {};
        const sumTournees = Object.entries(resParPoste).reduce((sum, [label, fte]) => {
            if (label.toLowerCase().includes("facteur")) {
                return sum + (Number(fte) || 0);
            }
            return sum;
        }, 0);
        const nbTournees = Math.round(sumTournees);
        const scoreTournees = getTierScore(nbTournees, TIERS_TOURNEES);

        const bloc3 = (chefLieuScore * 10 + sitesScore * 8 + scoreTournees * 8) / 100;

        // ── BLOC 4: Ressources ──
        const effectif = simulationResults?.fte_arrondi ?? simulationResults?.fte_final ?? 0;
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
            totalScore,
            classInfo,
            currentClass
        };
    }, [wizardData, simulationResults, chefLieuIdx, sitesIdx, centreDetails]);

    if (!scoring) return null;

    const { bloc1, bloc2, bloc3, bloc4, totalScore, classInfo, currentClass } = scoring;

    const classColorMap = {
        emerald: "bg-emerald-500", blue: "bg-blue-500", amber: "bg-amber-500", rose: "bg-rose-500"
    };
    const classBadgeMap = {
        emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
        blue: "bg-blue-50 text-blue-700 border-blue-200",
        amber: "bg-amber-50 text-amber-700 border-amber-200",
        rose: "bg-rose-50 text-rose-700 border-rose-200",
    };

    const YesNoChip = ({ value }) => value ? (
        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> OUI
        </span>
    ) : (
        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-full">
            <XCircle className="w-3 h-3" /> NON
        </span>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-none sm:max-w-5xl max-h-[92vh] overflow-y-auto p-0 border border-slate-200 bg-slate-50 shadow-2xl rounded-2xl">
                {/* HEADER */}
                <DialogHeader className="px-6 py-4 bg-white border-b border-slate-200 rounded-t-2xl sticky top-0 z-10">
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-xl">
                                <Tag className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <span className="text-sm font-extrabold text-slate-800">Analyse de Catégorisation</span>
                                <p className="text-[10px] font-normal text-slate-400 uppercase tracking-widest mt-0.5">
                                    Scoring basé sur le processus {mode === "optimise" ? "Optimisé" : mode === "recommande" ? "Consolidé" : "Actuel"}
                                </p>
                            </div>
                        </div>
                        {/* Result badge in header */}
                        <div className="flex items-center gap-3">
                            <div className="text-right flex flex-col items-end">
                                <div className="text-[9px] text-slate-400 uppercase tracking-wider">Catégorisation Actuelle</div>
                                <div className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    {String(currentClass).replace("Classe ", "")}
                                </div>
                            </div>
                            <div className="h-8 w-px bg-slate-200 mx-1" />
                            <div className="text-right">
                                <div className="text-[9px] text-slate-400 uppercase tracking-wider">Score {mode === "optimise" ? "Optimisé" : mode === "recommande" ? "Consolidé" : "Simulé"}</div>
                                <div className="text-lg font-black text-slate-800 leading-none">{totalScore.toFixed(1)}<span className="text-[10px] font-medium text-slate-400 ml-0.5">/100</span></div>
                            </div>
                            <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl ${classColorMap[classInfo.color]} text-white shadow-md`}>
                                <span className="text-xl font-black leading-none">{classInfo.key}</span>
                                <span className="text-[8px] uppercase font-bold opacity-80">Calculée</span>
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                {/* BODY */}
                <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {/* BLOC 1 */}
                    <BlockCard title="Complexité Opérationnelle" icon={Layers} color="purple" blockScore={bloc1.score}>
                        <QuestionRow label="Distribution Finale" weight={12} score={bloc1.distribScore}>
                            <YesNoChip value={bloc1.hasDistrib} />
                        </QuestionRow>
                        <QuestionRow label="Acheminement (% Axes > 0)" weight={6} score={bloc1.achScore}>
                            <span className="text-xs text-slate-500">{wizardData.pctAxesArrivee || 0}%</span>
                            <YesNoChip value={bloc1.hasAcheminement} />
                        </QuestionRow>
                        <QuestionRow label="Guichet Actif" weight={6} score={bloc1.guichetScore}>
                            <YesNoChip value={bloc1.hasGuichet} />
                        </QuestionRow>
                        <QuestionRow label="Barid Pro (tâches > 0)" weight={2} score={bloc1.baridScore}>
                            <YesNoChip value={bloc1.hasBaridPro} />
                        </QuestionRow>
                    </BlockCard>

                    {/* BLOC 2 */}
                    <BlockCard title="Charge Opérationnelle" icon={BarChart2} color="blue" blockScore={bloc2.score}>
                        <QuestionRow label="Volume Amana" weight={12} score={bloc2.scoreAmana}>
                            <span className="text-[10px] text-slate-500 font-mono">{bloc2.amanaGlobal.toFixed(0)}/jour</span>
                            <TierBar tiers={TIERS_AMANA} value={bloc2.amanaGlobal} />
                        </QuestionRow>
                        <QuestionRow label="Volume CR" weight={8} score={bloc2.scoreCR}>
                            <span className="text-[10px] text-slate-500 font-mono">{bloc2.crGlobal.toFixed(0)}/jour</span>
                            <TierBar tiers={TIERS_CR} value={bloc2.crGlobal} />
                        </QuestionRow>
                        <QuestionRow label="Volume CO" weight={8} score={bloc2.scoreCO}>
                            <span className="text-[10px] text-slate-500 font-mono">{bloc2.coGlobal.toFixed(0)}/jour</span>
                            <TierBar tiers={TIERS_CO} value={bloc2.coGlobal} />
                        </QuestionRow>
                        <QuestionRow label="Courrier Électronique (LRH + eBarkia)" weight={4} score={bloc2.scoreElec}>
                            <span className="text-[10px] text-slate-500 font-mono">{bloc2.elecGlobal.toFixed(0)}/jour</span>
                            <TierBar tiers={TIERS_ELEC} value={bloc2.elecGlobal} />
                        </QuestionRow>
                    </BlockCard>

                    {/* BLOC 3 */}
                    <BlockCard title="Rôle Territorial & Réseau" icon={Globe} color="teal" blockScore={bloc3.score}>
                        <QuestionRow label="Chef-lieu" weight={10} score={bloc3.chefLieuScore}>
                            <select
                                value={chefLieuIdx}
                                onChange={e => setChefLieuIdx(Number(e.target.value))}
                                className="text-[11px] border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-indigo-400 shadow-sm"
                            >
                                {CHEF_LIEU_OPTIONS.map((o, i) => (
                                    <option key={i} value={i}>{o.label}</option>
                                ))}
                            </select>
                        </QuestionRow>
                        <QuestionRow label="Nombre de sites rattachés" weight={8} score={bloc3.sitesScore}>
                            <select
                                value={sitesIdx}
                                onChange={e => setSitesIdx(Number(e.target.value))}
                                className="text-[11px] border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-indigo-400 shadow-sm"
                            >
                                {SITES_OPTIONS.map((o, i) => (
                                    <option key={i} value={i}>{o.label}</option>
                                ))}
                            </select>
                        </QuestionRow>
                        <QuestionRow label="Nombre de tournées (facteurs calculés)" weight={8} score={bloc3.scoreTournees}>
                            <span className="text-xs font-bold text-slate-600 px-2 py-0.5 bg-slate-100 rounded">{bloc3.nbTournees} facteurs</span>
                            <TierBar tiers={TIERS_TOURNEES} value={bloc3.nbTournees} />
                        </QuestionRow>
                    </BlockCard>

                    {/* BLOC 4 */}
                    <BlockCard title="Ressources" icon={Users} color="amber" blockScore={bloc4.score}>
                        <QuestionRow label={`Effectif Global (ETP ${mode === "optimise" ? "optimisé" : mode === "recommande" ? "consolidé" : "calculé"})`} weight={11} score={bloc4.scoreEffectif}>
                            <span className="text-xs font-bold text-slate-600 px-2 py-0.5 bg-slate-100 rounded">{bloc4.effectif} ETP</span>
                            <TierBar tiers={TIERS_EFFECTIF} value={bloc4.effectif} />
                        </QuestionRow>
                        <QuestionRow label="Amplitude horaire (Shift)" weight={5} score={bloc4.scoreShift}>
                            <span className="text-xs font-bold text-slate-600 px-2 py-0.5 bg-slate-100 rounded">{bloc4.shift} shift</span>
                        </QuestionRow>
                    </BlockCard>

                    {/* SCORE SUMMARY - Spans 2 columns */}
                    <div className="lg:col-span-2 bg-gradient-to-br from-white to-slate-50/50 p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8 relative z-10">
                            {[
                                { label: "Complexité", score: bloc1.score, color: "purple" },
                                { label: "Charge", score: bloc2.score, color: "blue" },
                                { label: "Territorial", score: bloc3.score, color: "teal" },
                                { label: "Ressources", score: bloc4.score, color: "amber" },
                            ].map((b, i) => (
                                <div key={i} className="flex flex-col items-center p-3 rounded-2xl bg-white/50 border border-slate-100/50 shadow-sm">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{b.label}</span>
                                    <div className="relative flex items-center justify-center w-14 h-14">
                                        <svg className="w-14 h-14 transform -rotate-90">
                                            <circle className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="transparent" r="24" cx="28" cy="28" />
                                            <circle className={`text-${b.color}-500`} strokeWidth="4" strokeDasharray={150.8} strokeDashoffset={150.8 - (150.8 * Math.min(b.score, 100)) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="24" cx="28" cy="28" />
                                        </svg>
                                        <span className="absolute text-xs font-black text-slate-700">{b.score.toFixed(0)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-between pt-6 border-t border-slate-100 relative z-10">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Score Cumulé</div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-slate-800 tracking-tight">{totalScore.toFixed(1)}</span>
                                        <span className="text-sm font-bold text-slate-400">/ 100</span>
                                    </div>
                                </div>
                                <div className="hidden md:block">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Seuils de Classe</div>
                                    <div className="flex gap-1.5">
                                        {['A (0-25)', 'B (26-50)', 'C (51-75)', 'D (75+)'].map((s, i) => (
                                            <span key={i} className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full border border-slate-200/50">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className={`flex items-center gap-4 pl-8 pr-6 py-4 rounded-3xl border-2 ${classBadgeMap[classInfo.color]} shadow-xl transition-all duration-500 hover:scale-105 group`}>
                                <div className="text-right">
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Classe Finale</div>
                                    <div className="text-xs font-bold whitespace-nowrap">{classInfo.description}</div>
                                </div>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg bg-white ring-4 ring-white/50`}>
                                    {classInfo.key}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="px-5 py-4 bg-white border-t border-slate-200 flex justify-end rounded-b-2xl">
                    <Button onClick={() => onOpenChange(false)} variant="outline" className="border-slate-300 text-slate-600 hover:bg-slate-100 px-8 font-bold text-xs">
                        Fermer l'Analyse
                    </Button>
                </div>
            </DialogContent >
        </Dialog >
    );
}
