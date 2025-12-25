import React, { useState, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import {
    Users,
    Target,
    TrendingDown,
    TrendingUp,
    AlertTriangle,
    Download,
    Share2,
    FileText,
    Map as MapIcon,
    BarChart3,
    PieChart,
    Layout,
    RefreshCcw,
    Calendar,
    Layers,
    ArrowRight,
    Calculator,
    Gauge,
    Archive,
    Package,
    Mail,
    Info,
    CheckCircle2,
    Loader2,
    FileSpreadsheet,
    Presentation,
    ChevronDown
} from "lucide-react";

// On utilise les composants Leaflet pour la carte
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

/* ---------------------------------------------------------------------------
   STYLES / CONSTANTES
   --------------------------------------------------------------------------- */
const PRIMARY_COLOR = "#005EA8"; // Bleu Barid
const SECONDARY_COLOR = "#00A0E0"; // Bleu clair
const SUCCESS_COLOR = "#10B981"; // Vert
const WARNING_COLOR = "#F59E0B"; // Orange
const DANGER_COLOR = "#EF4444"; // Rouge
const BG_COLOR = "#F8FAFC"; // Fond très clair

const cardStyle = "bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] border border-slate-100 p-4 transition-all duration-300 hover:shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] hover:-translate-y-1";
const kpiValueStyle = "text-2xl font-extrabold text-slate-900 tracking-tight mt-1 mb-0.5";
const kpiLabelStyle = "text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mb-0.5";

/* ---------------------------------------------------------------------------
   ANIMATION VARIANTS (Faster)
   --------------------------------------------------------------------------- */
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 10
        }
    }
};

/* ---------------------------------------------------------------------------
   HELPER CHARTS (Compact Options)
   --------------------------------------------------------------------------- */
function getBarOption(regionsData) {
    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#E2E8F0',
            textStyle: { color: '#1E293B' }
        },
        legend: {
            data: ['Actuel', 'Recommandé'],
            bottom: 0,
            icon: 'circle',
            itemGap: 20
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '10%',
            top: '5%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: regionsData.map(r => r.nom.replace('DR ', '')), // Shorten names
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: '#64748B', interval: 0, rotate: 0, fontSize: 11, width: 80, overflow: 'break' }
        },
        yAxis: {
            type: 'value',
            splitLine: { lineStyle: { type: 'dashed', color: '#E2E8F0' } },
            axisLine: { show: false },
            axisLabel: { color: '#64748B' }
        },
        series: [
            {
                name: 'Actuel',
                type: 'bar',
                barWidth: 12,
                itemStyle: { color: PRIMARY_COLOR, borderRadius: [4, 4, 0, 0] },
                data: regionsData.map(r => r.etpActuel)
            },
            {
                name: 'Recommandé',
                type: 'bar',
                barWidth: 12,
                itemStyle: { color: SUCCESS_COLOR, borderRadius: [4, 4, 0, 0] },
                data: regionsData.map(r => r.etpRecommande)
            }
        ]
    };
}

function getPieOption(regionsData) {
    return {
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#E2E8F0',
            textStyle: { color: '#1E293B' },
            formatter: '{b}: {c} ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            type: 'scroll',
            padding: [10, 0],
            textStyle: { color: '#64748B', fontSize: 12 },
            icon: 'circle'
        },
        series: [
            {
                name: 'Effectifs',
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['60%', '50%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 5,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: { show: false, position: 'center' },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 'bold'
                    }
                },
                labelLine: { show: false },
                data: regionsData.map((r, index) => ({
                    value: r.etpActuel,
                    name: r.nom.replace('DR ', ''),
                    itemStyle: { color: [PRIMARY_COLOR, SECONDARY_COLOR, SUCCESS_COLOR, WARNING_COLOR, DANGER_COLOR, '#8B5CF6'][index % 6] }
                }))
            }
        ]
    };
}

/* ---------------------------------------------------------------------------
   COMPONENTS
   --------------------------------------------------------------------------- */

// 1. KPI CARD (ULTRA COMPACT - HORIZONTAL)
const KpiCard = ({ title, value, icon: Icon, trend, trendValue, color = "blue", tooltip }) => {
    const colorMap = {
        blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-b-blue-500", iconRing: "ring-blue-100" },
        green: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-b-emerald-500", iconRing: "ring-emerald-100" },
        red: { bg: "bg-rose-50", text: "text-rose-600", border: "border-b-rose-500", iconRing: "ring-rose-100" },
        orange: { bg: "bg-amber-50", text: "text-amber-600", border: "border-b-amber-500", iconRing: "ring-amber-100" },
    };
    const theme = colorMap[color] || colorMap.blue;

    return (
        <div className={`relative bg-white rounded-xl shadow-sm border border-slate-100 p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group overflow-hidden h-full min-h-[140px]`}>
            {/* Colored Accent Line at Bottom */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${theme.bg.replace('bg-', 'bg-')} ${theme.border} opacity-80`}></div>

            {/* Info Tooltip Icon (Absolute Position) */}
            {tooltip && (
                <div className="group/info absolute top-2 right-2 cursor-help z-20">
                    <Info size={14} className="text-slate-300 hover:text-slate-500 transition-colors" />
                    <div className="absolute right-0 top-6 w-56 p-3 bg-slate-800 text-slate-50 text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-50 pointer-events-none font-medium leading-relaxed border border-slate-700">
                        {tooltip}
                        <div className="absolute right-1 bottom-full border-4 border-transparent border-b-slate-800"></div>
                    </div>
                </div>
            )}

            <div className="relative z-10 flex flex-col h-full items-center justify-center text-center gap-2">

                {/* Icon with Ring Effect */}
                <div className={`p-2.5 rounded-xl ${theme.bg} ${theme.text} ring-4 ${theme.iconRing} inline-flex items-center justify-center shadow-sm`}>
                    <Icon size={24} strokeWidth={2} />
                </div>

                <div className="flex flex-col items-center gap-0.5">
                    <div className={kpiValueStyle}>{value}</div>
                    <div className={kpiLabelStyle}>{title}</div>

                    {trend && (
                        <div className={`mt-1.5 flex items-center justify-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                            {trend === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {trendValue}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// 2. INSIGHT TILE (Compact)
const InsightTile = ({ type, text }) => {
    let icon = <AlertTriangle size={16} className="text-amber-500" />;
    let border = "border-l-4 border-amber-500";

    if (type === 'good') { icon = <TrendingUp size={16} className="text-emerald-500" />; border = "border-l-4 border-emerald-500"; }
    else if (type === 'bad') { icon = <TrendingDown size={16} className="text-rose-500" />; border = "border-l-4 border-rose-500"; }

    return (
        <div className={`flex items-start gap-3 p-3 bg-slate-50 rounded-r-lg ${border} mb-2 text-sm text-slate-700 shadow-sm`}>
            <div className="mt-0.5 shrink-0">{icon}</div>
            <p className="leading-snug">{text}</p>
        </div>
    );
};

// 3. MAIN COMPONENT
export default function VueNationale({ kpisNationaux: initialKpis, regionsData: initialRegions, getColor }) {
    // State for tabs
    const [activeTab, setActiveTab] = useState("directions"); // 'directions' | 'activite'

    // Scénario Switcher State
    const [scenario, setScenario] = useState("Standard"); // 'Standard' | 'Optimisé'
    const [exportStatus, setExportStatus] = useState("idle"); // 'idle' | 'loading' | 'success'
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    // Compute derived data based on scenario
    // "What-if": In Optimized scenario, we assume a 5% gain in recommended FTEs
    const { regionsData, kpisNationaux } = useMemo(() => {
        let factor = 1;
        if (scenario === "Optimisé") factor = 0.95;

        const newRegions = initialRegions.map(r => {
            const newRec = Math.round(r.etpRecommande * factor);
            return {
                ...r,
                etpRecommande: newRec,
                tauxOccupation: newRec > 0 ? Math.round((r.etpActuel / newRec) * 100) : 0
            }
        });

        const newKpis = {
            ...initialKpis,
            etpRecommandeTotal: newRegions.reduce((sum, r) => sum + r.etpRecommande, 0),
            surplusDeficit: newRegions.reduce((sum, r) => sum + (r.etpRecommande - r.etpActuel), 0),
            // Recalculate global rate
            tauxProductiviteMoyen: Math.round(newRegions.reduce((sum, r) => sum + r.etpActuel, 0) / newRegions.reduce((sum, r) => sum + r.etpRecommande, 0) * 100) || 0
        };

        return { regionsData: newRegions, kpisNationaux: newKpis };

    }, [initialKpis, initialRegions, scenario]);


    // Fake Export Handler
    const handleExport = (format) => {
        setExportStatus("loading");
        setIsExportMenuOpen(false); // Close menu
        console.log(`Exporting as ${format}...`);
        setTimeout(() => {
            setExportStatus("success");
            setTimeout(() => setExportStatus("idle"), 2500);
        }, 1500);
    };

    // UseMemo to compute aggregated insights
    const insights = useMemo(() => {
        const totalGap = kpisNationaux.surplusDeficit;
        const topGap = [...regionsData].sort((a, b) => (b.etpRecommande - b.etpActuel) - (a.etpRecommande - a.etpActuel))[0];

        return [
            { type: totalGap >= 0 ? 'good' : 'bad', text: `Écart global national de ${totalGap > 0 ? '+' : ''}${totalGap} ETP par rapport à la cible (${scenario}).` },
            { type: 'warning', text: `La région ${topGap?.nom} concentre le plus fort écart (${topGap?.etpRecommande - topGap?.etpActuel} ETP).` },
            { type: 'info', text: "L'activité Courrier Ordinaire représente 45% de la charge de travail nationale." }
        ];
    }, [regionsData, kpisNationaux, scenario]);

    // Data for Activity Tab
    const activityData = useMemo(() => {
        const v = kpisNationaux.volumes || { sacs: 0, colis: 0, courrier: 0 };
        // Estimate workload weights (in arbitrary units or minutes)
        const w = { sacs: 10, colis: 5, courrier: 0.5 };

        const totalLoad = (v.sacs * w.sacs) + (v.colis * w.colis) + (v.courrier * w.courrier);
        const safeTotal = totalLoad || 1; // avoid div/0

        const calc = (vol, weight) => {
            const load = vol * weight;
            const share = (load / safeTotal) * 100;
            // Distribute total FTEs based on load share
            const etp = Math.round((load / safeTotal) * kpisNationaux.etpRecommandeTotal);
            return { load, share: share.toFixed(1), etp };
        };

        const dSacs = calc(v.sacs, w.sacs);
        const dColis = calc(v.colis, w.colis);
        const dCourrier = calc(v.courrier, w.courrier);

        return [
            { name: "Sacs / Logistique", icon: Archive, volume: v.sacs, weight: w.sacs, etp: dSacs.etp, share: dSacs.share, bg: "bg-orange-50", color: "text-orange-600" },
            { name: "Colis / Amana", icon: Package, volume: v.colis, weight: w.colis, etp: dColis.etp, share: dColis.share, bg: "bg-blue-50", color: "text-blue-600" },
            { name: "Courrier Total", icon: Mail, volume: v.courrier, weight: w.courrier, etp: dCourrier.etp, share: dCourrier.share, bg: "bg-emerald-50", color: "text-emerald-600" },
        ];
    }, [kpisNationaux]);

    return (
        <motion.div
            className="w-full min-h-screen bg-[#F8FAFC] p-4 md:p-6 font-sans text-slate-800"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* --- HEADER --- */}
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">

                {/* Filters Area */}
                <div className="flex items-center gap-3 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 px-3 py-1.5 border-r border-slate-100">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700">Année 2024</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded cursor-pointer transition-colors relative group">
                        <Layers size={14} className="text-slate-400" />
                        <select
                            value={scenario}
                            onChange={(e) => setScenario(e.target.value)}
                            className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer appearance-none pr-4"
                        >
                            <option value="Standard">Scénario Standard</option>
                            <option value="Optimisé">Scénario Optimisé (-5%)</option>
                        </select>
                    </div>
                    <button className="p-2 bg-blue-50 text-[#005EA8] rounded hover:bg-blue-100 transition-colors">
                        <RefreshCcw size={16} />
                    </button>
                </div>
            </header>

            {/* --- KPI ROW --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
                <motion.div variants={itemVariants} className="h-full">
                    <KpiCard
                        title="Effectif Actuel"
                        value={kpisNationaux.etpActuelTotal}
                        icon={Users}
                        trend="up"
                        trendValue="+12"
                        color="blue"
                        tooltip="Total des effectifs (ETP) actuellement en poste dans toutes les directions régionales."
                    />
                </motion.div>
                <motion.div variants={itemVariants} className="h-full">
                    <KpiCard
                        title="Effectif Calculé"
                        value={kpisNationaux.fte_calcule ?? 0}
                        icon={Calculator}
                        color="blue"
                        tooltip="Besoin théorique en ETP calculé par le moteur de simulation (hors majorations)."
                    />
                </motion.div>
                <motion.div variants={itemVariants} className="h-full">
                    <KpiCard
                        title="Cible Recommandée"
                        value={kpisNationaux.etpRecommandeTotal}
                        icon={Target}
                        trend={kpisNationaux.etpRecommandeTotal < kpisNationaux.etpActuelTotal ? "down" : "up"}
                        trendValue={Math.abs(kpisNationaux.surplusDeficit)}
                        color="green"
                        tooltip="Objectif cible défini après application des seuils et règles de gestion (ex: productivité 100%)."
                    />
                </motion.div>
                <motion.div variants={itemVariants} className="h-full">
                    <KpiCard
                        title="Écart Global"
                        value={kpisNationaux.surplusDeficit > 0 ? `+${kpisNationaux.surplusDeficit}` : kpisNationaux.surplusDeficit}
                        icon={AlertTriangle}
                        color={kpisNationaux.surplusDeficit < 0 ? "red" : "orange"}
                        tooltip="Différence entre l'effectif actuel et la cible recommandée. Un chiffre négatif indique un déficit."
                    />
                </motion.div>
                <motion.div variants={itemVariants} className="h-full">
                    <KpiCard
                        title="Taux d'Adéquation"
                        value={`${kpisNationaux.tauxProductiviteMoyen ?? 98}%`}
                        icon={Gauge}
                        color="green"
                        tooltip="Pourcentage de couverture des besoins par l'effectif actuel."
                    />
                </motion.div>
            </div>

            {/* --- MAIN VISUALIZATION AREA --- */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">

                {/* LEFT: MAP & CHART (2/3 width) */}
                <div className="xl:col-span-2 flex flex-col gap-4">

                    {/* MAP SECTION */}
                    <motion.div variants={itemVariants} className={`${cardStyle} p-0 overflow-hidden flex flex-col h-[380px]`}>
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <MapIcon size={18} className="text-[#005EA8]" />
                                Répartition Géographique des Écarts
                            </h3>
                        </div>
                        <div className="flex-1 relative z-0">
                            <MapContainer
                                center={[31.7917, -7.0926]}
                                zoom={6}
                                style={{ height: "100%", width: "100%" }}
                                className="z-0"
                            >
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                {regionsData.map((r) => (
                                    <CircleMarker
                                        key={r.code}
                                        center={[r.lat, r.lng]}
                                        radius={(Math.sqrt(r.etpActuel) || 10) * 0.4}
                                        pathOptions={{
                                            color: getColor(r.tauxOccupation),
                                            fillColor: getColor(r.tauxOccupation),
                                            fillOpacity: 0.6,
                                            weight: 2
                                        }}
                                        className={Math.abs(r.etpRecommande - r.etpActuel) > 10 ? "animate-pulse" : ""}
                                    >
                                        <Popup>
                                            <div className="p-1">
                                                <p className="font-bold text-sm mb-1">{r.nom}</p>
                                                <div className="text-xs space-y-0.5">
                                                    <p>Actuel: <b>{r.etpActuel}</b></p>
                                                    <p>Cible: <b>{r.etpRecommande}</b></p>
                                                    <p className={r.etpRecommande - r.etpActuel < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                                                        Écart: {r.etpRecommande - r.etpActuel}
                                                    </p>
                                                </div>
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                ))}
                            </MapContainer>
                        </div>
                    </motion.div>

                    {/* CHART SECTION */}
                    <motion.div variants={itemVariants} className={cardStyle}>
                        <h3 className="font-bold text-md text-slate-800 mb-4 flex items-center gap-2">
                            <BarChart3 size={18} className="text-[#005EA8]" />
                            Comparatif Actuel vs Cible
                        </h3>
                        <ReactECharts option={getBarOption(regionsData)} style={{ height: 280 }} opts={{ renderer: 'canvas' }} />
                    </motion.div>
                </div>

                {/* RIGHT: INSIGHTS & SUMMARY (1/3 width) */}
                <div className="flex flex-col gap-4">

                    {/* AI INSIGHTS PANEL */}
                    <motion.div variants={itemVariants} className={`${cardStyle} bg-gradient-to-br from-white to-blue-50/50`}>
                        <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                            <span className="bg-blue-100 text-[#005EA8] p-1 rounded">
                                <FileText size={16} />
                            </span>
                            Insights Clés
                        </h3>
                        <div className="space-y-1">
                            {insights.map((insight, idx) => (
                                <InsightTile key={idx} type={insight.type} text={insight.text} />
                            ))}
                        </div>
                    </motion.div>

                    {/* DISTRIBUTION PIE */}
                    <motion.div variants={itemVariants} className={cardStyle}>
                        <h3 className="font-bold text-md text-slate-800 mb-2">Répartition Effectifs</h3>
                        <ReactECharts
                            option={getPieOption(regionsData)}
                            style={{ height: 220 }}
                            opts={{ renderer: 'canvas' }}
                        />
                    </motion.div>

                    {/* QUICK ACTIONS */}
                    <motion.div variants={itemVariants} className={cardStyle}>
                        <h3 className="font-bold text-md text-slate-800 mb-4">Actions Rapides</h3>
                        <div className="space-y-3">
                            <div className="relative">
                                <button
                                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                    disabled={exportStatus === 'loading'}
                                    className={`w-full flex items-center justify-between px-4 py-3 bg-white border rounded-lg text-sm font-semibold transition-all group
                                    ${exportStatus === 'success'
                                            ? 'border-green-200 bg-green-50 text-green-700'
                                            : 'border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-blue-300'
                                        }`}
                                >
                                    <span className="flex items-center gap-2">
                                        {exportStatus === 'loading' && <Loader2 size={16} className="animate-spin text-[#005EA8]" />}
                                        {exportStatus === 'success' ? 'Export Réussi !' : 'Exporter le rapport'}
                                    </span>
                                    {exportStatus === 'success' ? (
                                        <CheckCircle2 size={18} className="text-green-600" />
                                    ) : (
                                        <div className="flex items-center gap-2 text-slate-400 group-hover:text-[#005EA8]">
                                            <Download size={16} />
                                            <ChevronDown size={14} className={`transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                    )}
                                </button>

                                {isExportMenuOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                        <button onClick={() => handleExport("Excel")} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-sm font-medium transition-colors text-left">
                                            <FileSpreadsheet size={16} className="text-emerald-600" />
                                            <span>Format Excel (.xlsx)</span>
                                        </button>
                                        <button onClick={() => handleExport("PDF")} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-sm font-medium transition-colors text-left border-t border-slate-50">
                                            <FileText size={16} className="text-rose-600" />
                                            <span>Format PDF (.pdf)</span>
                                        </button>
                                        <button onClick={() => handleExport("PowerPoint")} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 text-slate-700 hover:text-orange-700 text-sm font-medium transition-colors text-left border-t border-slate-50">
                                            <Presentation size={16} className="text-orange-600" />
                                            <span>Présentation (.pptx)</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-blue-300 transition-all group">
                                <span>Partager la simulation</span>
                                <Share2 size={16} className="text-slate-400 group-hover:text-[#005EA8]" />
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* --- DETAILED DATA TABLE --- */}
            < motion.div variants={itemVariants} className={cardStyle} >
                <div className="flex items-center gap-6 border-b border-slate-100 mb-0 pb-0">
                    <button
                        onClick={() => setActiveTab("directions")}
                        className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'directions' ? 'border-[#005EA8] text-[#005EA8]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Détail par Direction
                    </button>
                    <button
                        onClick={() => setActiveTab("activite")}
                        className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'activite' ? 'border-[#005EA8] text-[#005EA8]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Détail par Activité
                    </button>
                </div>

                <div className="pt-6 overflow-x-auto">
                    {activeTab === "directions" ? (
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-xs uppercase text-slate-400 font-bold border-b border-slate-100">
                                    <th className="py-3 px-4">Direction / Entité</th>
                                    <th className="py-3 px-4 text-center">Centres</th>
                                    <th className="py-3 px-4 text-right">Effectif Actuel</th>
                                    <th className="py-3 px-4 text-right">Cible</th>
                                    <th className="py-3 px-4 text-right">Écart</th>
                                    <th className="py-3 px-4 text-right">Taux</th>
                                    <th className="py-3 px-4 text-center">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {regionsData.map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-4 font-semibold text-slate-700">{r.nom}</td>
                                        <td className="py-3 px-4 text-center text-slate-500">{r.centres}</td>
                                        <td className="py-3 px-4 text-right font-medium">{r.etpActuel}</td>
                                        <td className="py-3 px-4 text-right font-medium text-slate-600">{r.etpRecommande}</td>
                                        <td className={`py-3 px-4 text-right font-bold ${r.etpRecommande - r.etpActuel < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {r.etpRecommande - r.etpActuel > 0 ? '+' : ''}{r.etpRecommande - r.etpActuel}
                                        </td>
                                        <td className="py-3 px-4 text-right text-slate-600">{r.tauxOccupation}%</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${r.etpRecommande - r.etpActuel < -10 ? 'bg-rose-500' : (Math.abs(r.etpRecommande - r.etpActuel) < 5 ? 'bg-emerald-500' : 'bg-amber-500')}`}></span>
                                        </td>
                                    </tr>
                                ))}
                                {/* Totals row */}
                                <tr className="bg-slate-50/80 font-bold text-slate-800">
                                    <td className="py-4 px-4">TOTAL NATIONAL</td>
                                    <td className="py-4 px-4 text-center">-</td>
                                    <td className="py-4 px-4 text-right">{kpisNationaux.etpActuelTotal}</td>
                                    <td className="py-4 px-4 text-right">{kpisNationaux.etpRecommandeTotal}</td>
                                    <td className="py-4 px-4 text-right">{kpisNationaux.surplusDeficit}</td>
                                    <td className="py-4 px-4 text-right">-</td>
                                    <td className="py-4 px-4"></td>
                                </tr>
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-xs uppercase text-slate-400 font-bold border-b border-slate-100">
                                    <th className="py-3 px-4">Type d'Activité</th>
                                    <th className="py-3 px-4 text-right">Volume Quotidien</th>
                                    <th className="py-3 px-4 text-right">Poids Relatif (Est.)</th>
                                    <th className="py-3 px-4 text-right">ETP Équivalents</th>
                                    <th className="py-3 px-4 text-right">Part du Total</th>
                                    <th className="py-3 px-4 text-center">Tendance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {activityData.map((act, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${act.bg}`}>
                                                    <act.icon size={16} className={act.color} />
                                                </div>
                                                <span className="font-semibold text-slate-700">{act.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                                            {act.volume.toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-right text-slate-500">
                                            {act.weight} min/u
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold text-slate-800">
                                            {act.etp}
                                        </td>
                                        <td className="py-3 px-4 text-right text-slate-600">
                                            {act.share}%
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                                                <TrendingUp size={10} className="mr-1" /> Stable
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t border-slate-200">
                                <tr>
                                    <td className="py-3 px-4 font-bold text-slate-800">TOTAL</td>
                                    <td className="py-3 px-4 text-right font-bold text-slate-800">-</td>
                                    <td className="py-3 px-4 text-right font-bold text-slate-800">-</td>
                                    <td className="py-3 px-4 text-right font-bold text-[#005EA8]">
                                        {activityData.reduce((acc, curr) => acc + curr.etp, 0)}
                                    </td>
                                    <td className="py-3 px-4 text-right font-bold text-slate-800">100%</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    )}


                    <div className="mt-4 flex justify-end">
                        <button className="flex items-center gap-2 text-sm font-semibold text-[#005EA8] hover:underline">
                            Voir le détail complet des centres <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </motion.div >
        </motion.div >
    );
}
