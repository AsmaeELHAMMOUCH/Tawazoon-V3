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
    UploadCloud,
    ChevronDown,
    MessageCircle,
    Clock,
    Activity
} from "lucide-react";

// On utilise les composants Leaflet pour la carte
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/* ---------------------------------------------------------------------------
   STYLES / CONSTANTES
   --------------------------------------------------------------------------- */
const PRIMARY_COLOR = "#005EA8"; // Bleu Barid
const SECONDARY_COLOR = "#00A0E0"; // Bleu clair
const SUCCESS_COLOR = "#10B981"; // Vert
const WARNING_COLOR = "#F59E0B"; // Orange
const DANGER_COLOR = "#EF4444"; // Rouge
const BG_COLOR = "#F8FAFC"; // Fond très clair

const cardStyle = "bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] border border-slate-100 p-3 transition-all duration-300 hover:shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] hover:-translate-y-1";
const kpiValueStyle = "text-xl font-extrabold text-slate-900 tracking-tight mt-1 mb-0.5";
const kpiLabelStyle = "text-[9px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mb-0.5";

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
            data: ['Actuel', 'Calculé'],
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
                name: 'Calculé',
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
            orient: 'vertical', // L'un après l'autre
            bottom: 0,          // En dessous du graphique
            left: 'center',     // Centré
            type: 'scroll',     // Avec scroll si nécessaire
            height: 100,        // Hauteur réservée à la légende pour scroller
            textStyle: { color: '#64748B', fontSize: 10 },
            icon: 'circle',
            itemWidth: 8,
            itemHeight: 8,
            itemGap: 5
        },
        grid: {
            top: 0,
            bottom: 110, // Réserver place pour légende en bas
            left: 0,
            right: 0
        },
        series: [
            {
                name: 'Effectifs',
                type: 'pie',
                radius: ['35%', '55%'],
                center: ['50%', '30%'], // Remonté vers le haut
                avoidLabelOverlap: true,
                itemStyle: {
                    borderRadius: 4,
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
        <div className={`relative bg-white rounded-xl shadow-sm border border-slate-100 p-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group overflow-hidden h-full min-h-[70px]`}>
            {/* Colored Accent Line at Bottom */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${theme.bg.replace('bg-', 'bg-')} ${theme.border} opacity-80`}></div>

            {/* Info Tooltip Icon (Absolute Position) */}
            {tooltip && (
                <div className="group/info absolute top-2 right-2 cursor-help z-20">
                    <Info size={12} className="text-slate-300 hover:text-slate-500 transition-colors" />
                    <div className="absolute right-0 top-6 w-56 p-3 bg-slate-800 text-slate-50 text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-50 pointer-events-none font-medium leading-relaxed border border-slate-700">
                        {tooltip}
                        <div className="absolute right-1 bottom-full border-4 border-transparent border-b-slate-800"></div>
                    </div>
                </div>
            )}

            <div className="relative z-10 flex flex-col h-full items-center justify-center text-center gap-1">

                {/* Icon with Ring Effect */}
                <div className={`p-1.5 rounded-xl ${theme.bg} ${theme.text} ring-2 ${theme.iconRing} inline-flex items-center justify-center shadow-sm`}>
                    <Icon size={18} strokeWidth={2} />
                </div>

                <div className="flex flex-col items-center gap-0.5">
                    <div className={kpiValueStyle}>{value}</div>
                    <div className={kpiLabelStyle}>{title}</div>

                    {trend && (
                        <div className={`mt-1 flex items-center justify-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
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

import { ImportModal } from "../direction/DirectionVolumesCard";

// 3. MAIN COMPONENT
export default function VueNationale({
    kpisNationaux,
    regionsData,
    getColor,
    scenario,
    setScenario,
    onImport,
    // Paramètres de simulation
    productivite,
    setProductivite,
    heuresNet,
    setHeuresNet,
    idleMinutes,
    setIdleMinutes,
    tauxComplexite,
    setTauxComplexite,
    natureGeo,
    setNatureGeo
}) {
    // State for tabs
    const [activeTab, setActiveTab] = useState("directions"); // 'directions' | 'activite'

    // Managed Scenario State (Prop or Local Fallback)
    const [localScenario, setLocalScenario] = useState("Standard");
    const currentScenario = scenario !== undefined ? scenario : localScenario;
    const handleSetScenario = setScenario || setLocalScenario;

    const [exportStatus, setExportStatus] = useState("idle"); // 'idle' | 'loading' | 'success'
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);

    const handleImportValidate = (data) => {
        if (onImport) onImport(data);
    };

    // Data is now sourced directly from props (Backend-calculated)
    // No more client-side re-calculation for "Optimisé"



    // Fake Export Handler
    const handleExport = async (format) => {
        setExportStatus("loading");
        setIsExportMenuOpen(false);

        try {
            if (format === "Excel") {
                // Créer les données pour Excel
                const kpiData = [
                    ['KPI', 'Valeur'],
                    ['Effectif Actuel', kpisNationaux.etpActuelTotal],
                    ['Effectif Calculé', kpisNationaux.fte_calcule ?? 0],
                    ['Écart Global', kpisNationaux.surplusDeficit],
                    ['Taux d\'Adéquation', `${kpisNationaux.tauxProductiviteMoyen ?? 98}%`],
                    [],
                ];

                const directionsData = [
                    ['Direction', 'Centres', 'Effectif Actuel', 'Effectif Calculé', 'Écart', 'Taux Occupation (%)'],
                    ...regionsData.map(r => [
                        r.nom,
                        r.centres,
                        r.etpActuel,
                        r.etpRecommande,
                        r.etpRecommande - r.etpActuel,
                        r.tauxOccupation
                    ])
                ];

                // Créer le workbook
                const wb = XLSX.utils.book_new();

                // Feuille KPI
                const wsKPI = XLSX.utils.aoa_to_sheet(kpiData);
                XLSX.utils.book_append_sheet(wb, wsKPI, "KPI Nationaux");

                // Feuille Directions
                const wsDirections = XLSX.utils.aoa_to_sheet(directionsData);
                XLSX.utils.book_append_sheet(wb, wsDirections, "Directions");

                // Télécharger
                XLSX.writeFile(wb, `Simulation_RH_Nationale_${new Date().toISOString().split('T')[0]}.xlsx`);

            } else if (format === "PDF") {
                // Créer le PDF
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();

                // En-tête
                pdf.setFontSize(20);
                pdf.setTextColor(0, 94, 168); // Bleu Barid
                pdf.text('Simulation RH - Niveau National', pageWidth / 2, 20, { align: 'center' });

                pdf.setFontSize(10);
                pdf.setTextColor(100, 100, 100);
                pdf.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 28, { align: 'center' });

                // KPI
                pdf.setFontSize(14);
                pdf.setTextColor(0, 0, 0);
                pdf.text('Indicateurs Clés', 15, 40);

                pdf.setFontSize(10);
                let y = 50;
                pdf.text(`Effectif Actuel: ${kpisNationaux.etpActuelTotal} ETP`, 20, y);
                y += 8;
                pdf.text(`Effectif Calculé: ${kpisNationaux.fte_calcule ?? 0} ETP`, 20, y);
                y += 8;
                pdf.text(`Écart Global: ${kpisNationaux.surplusDeficit} ETP`, 20, y);
                y += 8;
                pdf.text(`Taux d'Adéquation: ${kpisNationaux.tauxProductiviteMoyen ?? 98}%`, 20, y);

                // Tableau des directions
                y += 15;
                pdf.setFontSize(14);
                pdf.text('Répartition par Direction', 15, y);

                y += 10;
                pdf.setFontSize(9);

                // En-têtes du tableau
                pdf.setFillColor(0, 94, 168);
                pdf.setTextColor(255, 255, 255);
                pdf.rect(15, y - 5, pageWidth - 30, 7, 'F');
                pdf.text('Direction', 17, y);
                pdf.text('Actuel', 80, y);
                pdf.text('Calculé', 110, y);
                pdf.text('Écart', 140, y);
                pdf.text('Taux', 165, y);

                y += 8;
                pdf.setTextColor(0, 0, 0);

                // Lignes du tableau
                regionsData.forEach((r, idx) => {
                    if (y > pageHeight - 20) {
                        pdf.addPage();
                        y = 20;
                    }

                    const ecart = r.etpRecommande - r.etpActuel;

                    // Alternance de couleur
                    if (idx % 2 === 0) {
                        pdf.setFillColor(248, 250, 252);
                        pdf.rect(15, y - 5, pageWidth - 30, 7, 'F');
                    }

                    pdf.text(r.nom.substring(0, 30), 17, y);
                    pdf.text(String(r.etpActuel), 80, y);
                    pdf.text(String(r.etpRecommande), 110, y);

                    // Couleur pour l'écart
                    pdf.setTextColor(ecart < 0 ? 239 : 16, ecart < 0 ? 68 : 185, ecart < 0 ? 68 : 129);
                    pdf.text(String(ecart), 140, y);
                    pdf.setTextColor(0, 0, 0);

                    pdf.text(`${r.tauxOccupation}%`, 165, y);

                    y += 8;
                });

                // Pied de page
                pdf.setFontSize(8);
                pdf.setTextColor(150, 150, 150);
                pdf.text('TAWAZOON RH - Simulation Nationale', pageWidth / 2, pageHeight - 10, { align: 'center' });

                pdf.save(`Simulation_RH_Nationale_${new Date().toISOString().split('T')[0]}.pdf`);

            } else if (format === "PowerPoint") {
                // Pour PowerPoint, on crée un fichier texte avec les données
                // (Une vraie implémentation nécessiterait une bibliothèque comme PptxGenJS)
                const content = `SIMULATION RH - NIVEAU NATIONAL
Date: ${new Date().toLocaleDateString('fr-FR')}

=== INDICATEURS CLÉS ===
Effectif Actuel: ${kpisNationaux.etpActuelTotal} ETP
Effectif Calculé: ${kpisNationaux.fte_calcule ?? 0} ETP
Écart Global: ${kpisNationaux.surplusDeficit} ETP
Taux d'Adéquation: ${kpisNationaux.tauxProductiviteMoyen ?? 98}%

=== RÉPARTITION PAR DIRECTION ===
${regionsData.map(r => `
${r.nom}
  - Centres: ${r.centres}
  - Actuel: ${r.etpActuel} ETP
  - Calculé: ${r.etpRecommande} ETP
  - Écart: ${r.etpRecommande - r.etpActuel} ETP
  - Taux: ${r.tauxOccupation}%
`).join('\n')}

---
TAWAZOON RH - Simulation Nationale
`;

                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Simulation_RH_Nationale_${new Date().toISOString().split('T')[0]}.txt`;
                a.click();
                URL.revokeObjectURL(url);
            }

            setExportStatus("success");
            setTimeout(() => setExportStatus("idle"), 2500);

        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            setExportStatus("idle");
        }
    };

    // Fonction pour télécharger le template d'import matriciel
    const handleDownloadTemplate = async () => {
        try {
            // Récupérer toutes les directions et leurs centres
            const directionsResponse = await fetch('/api/directions');
            const directions = await directionsResponse.json();

            // Créer un nouveau workbook
            const wb = XLSX.utils.book_new();

            // Préparer les données du template
            const templateData = [
                ["IMPORT VOLUMES - VUE NATIONALE"],
                ["Remplissez les volumes pour tous les centres ci-dessous"],
                ["Les centres sont organisés par direction"],
                [],
            ];

            // Pour chaque direction
            for (let dirIndex = 0; dirIndex < directions.length; dirIndex++) {
                const direction = directions[dirIndex];

                // Récupérer les centres de cette direction
                const centresResponse = await fetch(`/api/directions/${direction.id}/centres`);
                const centres = await centresResponse.json();

                if (centres.length === 0) continue;

                // Titre de la direction
                templateData.push([]);
                templateData.push([`╔═══════════════════════════════════════════════════════════╗`]);
                templateData.push([`║  DIRECTION: ${direction.label.toUpperCase()}`]);
                templateData.push([`╚═══════════════════════════════════════════════════════════╝`]);
                templateData.push([]);

                // Pour chaque centre de cette direction
                centres.forEach((centre, centreIndex) => {
                    if (centreIndex > 0) {
                        templateData.push([]);
                        templateData.push([]);
                    }

                    templateData.push([`=== CENTRE ${centreIndex + 1} ===`]);
                    templateData.push(["Nom du Centre:", centre.label]);
                    templateData.push([]);

                    // Section A : FLUX ARRIVÉE
                    templateData.push(["A) FLUX ARRIVÉE"]);
                    templateData.push(["FLUX \\ SEGMENT", "GLOBAL", "PART.", "PRO", "DIST.", "AXES"]);
                    templateData.push(["Amana", "", "", "", "", ""]);
                    templateData.push(["CO", "", "", "", "", ""]);
                    templateData.push(["CR", "", "", "", "", ""]);
                    templateData.push(["E-Barkia", "", "", "", "", ""]);
                    templateData.push(["LRH", "", "", "", "", ""]);
                    templateData.push([]);

                    // Section B : GUICHET
                    templateData.push(["B) GUICHET"]);
                    templateData.push(["OPÉRATION", "DÉPÔT", "RÉCUP."]);
                    templateData.push(["Volume", "", ""]);
                    templateData.push([]);

                    // Section C : FLUX DÉPART
                    templateData.push(["C) FLUX DÉPART"]);
                    templateData.push(["FLUX \\ SEGMENT", "GLOBAL", "PART.", "PRO", "DIST.", "AXES"]);
                    templateData.push(["Amana", "", "", "", "", ""]);
                    templateData.push(["CO", "", "", "", "", ""]);
                    templateData.push(["CR", "", "", "", "", ""]);
                    templateData.push(["E-Barkia", "", "", "", "", ""]);
                    templateData.push(["LRH", "", "", "", "", ""]);
                });
            }

            // Créer la feuille
            const ws = XLSX.utils.aoa_to_sheet(templateData);

            // Définir les largeurs de colonnes
            ws['!cols'] = [
                { wch: 20 },  // A
                { wch: 12 },  // B
                { wch: 12 },  // C
                { wch: 12 },  // D
                { wch: 12 },  // E
                { wch: 12 },  // F
            ];

            // Ajouter la feuille au workbook
            XLSX.utils.book_append_sheet(wb, ws, "Import Volumes");

            // Créer la feuille "Guide"
            const guideData = [
                ["GUIDE DE REMPLISSAGE - VUE NATIONALE"],
                [],
                ["1. STRUCTURE"],
                ["", "Le template contient TOUTES les directions et TOUS leurs centres."],
                ["", "Les centres sont organisés par direction."],
                ["", ""],
                ["", "IMPORTANT : Les noms de centres sont pré-remplis."],
                ["", "NE PAS modifier les noms de centres !"],
                [],
                ["2. REMPLISSAGE"],
                ["", "Pour chaque centre :"],
                ["", "  1. Remplissez la section A) FLUX ARRIVÉE"],
                ["", "  2. Remplissez la section B) GUICHET"],
                ["", "  3. Remplissez la section C) FLUX DÉPART"],
                ["", ""],
                ["", "Laissez vide les cellules si volume = 0"],
                [],
                ["3. STRUCTURE DES DONNÉES"],
                ["", "Le template reproduit exactement l'interface :"],
                [],
                ["A) FLUX ARRIVÉE", "Matrice 5 flux × 5 segments"],
                ["", "  Flux : Amana, CO, CR, E-Barkia, LRH"],
                ["", "  Segments : GLOBAL, PART., PRO, DIST., AXES"],
                [],
                ["B) GUICHET", "2 opérations uniquement"],
                ["", "  - DÉPÔT : Volume des dépôts"],
                ["", "  - RÉCUP. : Volume des récupérations"],
                [],
                ["C) FLUX DÉPART", "Même matrice que Flux Arrivée"],
                ["", "  Flux : Amana, CO, CR, E-Barkia, LRH"],
                ["", "  Segments : GLOBAL, PART., PRO, DIST., AXES"],
                [],
                ["4. IMPORT"],
                ["", "1. Remplissez les volumes"],
                ["", "2. Sauvegardez le fichier"],
                ["", "3. Cliquez sur 'Importer' dans l'application"],
                ["", "4. Sélectionnez ce fichier"],
                ["", "5. La simulation se lance automatiquement"],
                [],
                ["5. RÈGLES IMPORTANTES"],
                ["", "✓ Seuls les nombres sont acceptés"],
                ["", "✓ Les cellules vides = 0"],
                ["", "✓ NE PAS modifier les noms de centres"],
                ["", "✓ NE PAS modifier la structure du tableau"],
                ["", "✓ Les centres non trouvés seront ignorés"],
            ];

            const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
            wsGuide['!cols'] = [
                { wch: 25 },
                { wch: 50 },
            ];
            XLSX.utils.book_append_sheet(wb, wsGuide, "Guide");

            // Télécharger le fichier
            const today = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `Template_Volumes_National_${today}.xlsx`);

        } catch (error) {
            console.error('Erreur génération template:', error);
            alert('Erreur lors de la génération du template');
        }
    };

    // UseMemo to compute aggregated insights
    const insights = useMemo(() => {
        const totalGap = kpisNationaux.surplusDeficit;
        const topGap = [...regionsData].sort((a, b) => (b.etpRecommande - b.etpActuel) - (a.etpRecommande - a.etpActuel))[0];

        return [
            { type: totalGap >= 0 ? 'good' : 'bad', text: `Écart global national de ${totalGap > 0 ? '+' : ''}${totalGap} ETP par rapport à la cible (${currentScenario}).` },
            { type: 'warning', text: `La région ${topGap?.nom} concentre le plus fort écart (${topGap?.etpRecommande - topGap?.etpActuel} ETP).` },
            { type: 'info', text: "L'activité Courrier Ordinaire représente 45% de la charge de travail nationale." }
        ];
    }, [regionsData, kpisNationaux, currentScenario]);

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
            className="w-full min-h-screen bg-[#F8FAFC] p-2 md:p-3 font-sans text-slate-800"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* --- HEADER --- */}
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-4">

                {/* Filters Area */}
                <div className="flex items-center justify-end gap-3 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm ml-auto">
                    {/* Actions Rapides dans le header */}
                    <div className="flex items-center gap-2">
                        <button
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-md text-xs font-semibold text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all"
                            onClick={handleDownloadTemplate}
                            title="Télécharger le modèle d'import"
                        >
                            <FileSpreadsheet size={14} />
                            <span className="hidden sm:inline">Modèle</span>
                        </button>

                        <button
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 hover:text-[#005EA8] hover:border-[#005EA8] transition-all"
                            onClick={() => setIsImportOpen(true)}
                            title="Importer des volumes"
                        >
                            <UploadCloud size={14} />
                            <span className="hidden sm:inline">Importer</span>
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                disabled={exportStatus === 'loading'}
                                className={`flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs font-semibold transition-all ${exportStatus === 'success'
                                    ? 'border-green-200 bg-green-50 text-green-700'
                                    : 'border-slate-200 bg-white text-slate-700 hover:text-[#005EA8] hover:border-[#005EA8]'
                                    }`}
                            >
                                {exportStatus === 'loading' && <Loader2 size={14} className="animate-spin" />}
                                {exportStatus === 'success' ? <CheckCircle2 size={14} /> : <Download size={14} />}
                                <span className="hidden sm:inline">{exportStatus === 'success' ? 'Exporté' : 'Exporter'}</span>
                                {exportStatus !== 'success' && <ChevronDown size={12} className={`transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />}
                            </button>

                            {isExportMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                                    <button onClick={() => handleExport("Excel")} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-medium transition-colors text-left">
                                        <FileSpreadsheet size={14} className="text-emerald-600" />
                                        <span>Excel (.xlsx)</span>
                                    </button>
                                    <button onClick={() => handleExport("PDF")} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-medium transition-colors text-left border-t border-slate-50">
                                        <FileText size={14} className="text-rose-600" />
                                        <span>PDF (.pdf)</span>
                                    </button>
                                    <button onClick={() => handleExport("PowerPoint")} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-orange-50 text-slate-700 hover:text-orange-700 text-xs font-medium transition-colors text-left border-t border-slate-50">
                                        <Presentation size={14} className="text-orange-600" />
                                        <span>PowerPoint (.pptx)</span>
                                    </button>
                                </div>
                            )}
                        </div>


                        <div className="relative">
                            <button
                                onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 hover:text-[#005EA8] hover:border-[#005EA8] transition-all"
                            >
                                <Share2 size={14} />
                                <span className="hidden sm:inline">Partager</span>
                                <ChevronDown size={12} className={`transition-transform ${isShareMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isShareMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                                    <button
                                        onClick={() => {
                                            const url = window.location.href;
                                            const text = `Simulation RH Nationale - TAWAZOON RH\n\nEffectif Actuel: ${kpisNationaux.etpActuelTotal}\nEffectif Calculé: ${kpisNationaux.fte_calcule ?? 0}\nÉcart: ${kpisNationaux.surplusDeficit}\n\nConsultez le rapport complet:`;
                                            window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
                                            setIsShareMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-green-50 text-slate-700 hover:text-green-700 text-xs font-medium transition-colors text-left"
                                    >
                                        <MessageCircle size={14} className="text-green-600" />
                                        <span>WhatsApp</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            const subject = 'Simulation RH Nationale - TAWAZOON RH';
                                            const body = `Bonjour,\n\nVoici les résultats de la simulation RH au niveau national :\n\nEffectif Actuel: ${kpisNationaux.etpActuelTotal}\nEffectif Calculé: ${kpisNationaux.fte_calcule ?? 0}\nÉcart Global: ${kpisNationaux.surplusDeficit}\nTaux d'Adéquation: ${kpisNationaux.tauxProductiviteMoyen ?? 98}%\n\nConsultez le rapport complet: ${window.location.href}\n\nCordialement`;
                                            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                            setIsShareMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium transition-colors text-left border-t border-slate-50"
                                    >
                                        <Mail size={14} className="text-blue-600" />
                                        <span>Email</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <button className="p-2 bg-blue-50 text-[#005EA8] rounded hover:bg-blue-100 transition-colors">
                            <RefreshCcw size={16} />
                        </button>
                    </div>
                </div>
            </header>

            {/* ========================================
                ZONE PARAMÈTRES : Configuration Simulation
                ======================================== */}
            <motion.div
                variants={itemVariants}
                className="bg-white/80 backdrop-blur-xl rounded-xl border border-white/60 shadow-[0_4px_20px_-10px_rgba(2,6,23,0.12)] mb-3"
            >
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white/50">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 text-[#005EA8] rounded-lg">
                            <Activity size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 leading-tight">
                                Paramètres de Simulation
                            </h3>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                                Configuration globale appliquée à l'ensemble du réseau
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-3 bg-white/40">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {/* Productivité */}
                        <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-white/60 border border-slate-200/60 hover:border-blue-200 transition-colors">
                            <label className="text-[10px] font-semibold text-slate-600 uppercase flex items-center gap-1.5">
                                <Gauge size={12} className="text-blue-500" />
                                Productivité (%)
                            </label>
                            <input
                                type="number"
                                value={productivite}
                                onChange={(e) => setProductivite && setProductivite(e.target.value)}
                                className="w-full bg-transparent text-sm font-bold text-slate-800 focus:outline-none border-b border-transparent focus:border-blue-500 px-1"
                                min="0" max="200"
                            />
                        </div>

                        {/* Heures de Service (Brut) */}
                        <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-white/60 border border-slate-200/60 hover:border-blue-200 transition-colors">
                            <label className="text-[10px] font-semibold text-slate-600 uppercase flex items-center gap-1.5">
                                <Clock size={12} className="text-blue-500" />
                                Heures de Service
                            </label>
                            <input
                                type="number"
                                step="0.5"
                                value={heuresNet}
                                onChange={(e) => setHeuresNet && setHeuresNet(e.target.value)}
                                className="w-full bg-transparent text-sm font-bold text-slate-800 focus:outline-none border-b border-transparent focus:border-blue-500 px-1"
                                min="0" max="24"
                            />
                        </div>

                        {/* Temps Inactif */}
                        <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-white/60 border border-slate-200/60 hover:border-blue-200 transition-colors">
                            <label className="text-[10px] font-semibold text-slate-600 uppercase flex items-center gap-1.5">
                                <Clock size={12} className="text-slate-400" />
                                Temps Inactif (min)
                            </label>
                            <div className="flex items-center justify-between">
                                <input
                                    type="number"
                                    value={idleMinutes || 0}
                                    onChange={(e) => setIdleMinutes && setIdleMinutes(e.target.value)}
                                    className="w-16 bg-transparent text-sm font-bold text-slate-800 focus:outline-none border-b border-transparent focus:border-blue-500 px-1"
                                    min="0"
                                />
                                {/* Affichage du Net Calculé */}
                                <div className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 whitespace-nowrap">
                                    Net: {((heuresNet * 60 - (idleMinutes || 0)) / 60).toFixed(2)}h
                                </div>
                            </div>
                        </div>

                        {/* Taux Complexité */}
                        <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-white/60 border border-slate-200/60 hover:border-blue-200 transition-colors">
                            <label className="text-[10px] font-semibold text-slate-600 uppercase flex items-center gap-1.5">
                                <Activity size={12} className="text-blue-500" />
                                Complexité (%)
                            </label>
                            <input
                                type="number"
                                value={tauxComplexite || 0}
                                onChange={(e) => setTauxComplexite && setTauxComplexite(e.target.value)}
                                className="w-full bg-transparent text-sm font-bold text-slate-800 focus:outline-none border-b border-transparent focus:border-blue-500 px-1"
                                min="0"
                            />
                        </div>

                        {/* Nature Géo */}
                        <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-white/60 border border-slate-200/60 hover:border-blue-200 transition-colors">
                            <label className="text-[10px] font-semibold text-slate-600 uppercase flex items-center gap-1.5">
                                <MapIcon size={12} className="text-blue-500" />
                                Nature Géo (%)
                            </label>
                            <input
                                type="number"
                                value={natureGeo || 0}
                                onChange={(e) => setNatureGeo && setNatureGeo(e.target.value)}
                                className="w-full bg-transparent text-sm font-bold text-slate-800 focus:outline-none border-b border-transparent focus:border-blue-500 px-1"
                                min="0"
                            />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ========================================
                ZONE 1 : KPI NATIONAUX (Ligne unique)
                ======================================== */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                <motion.div variants={itemVariants} className="h-full">
                    <KpiCard
                        title="Effectif Actuel"
                        value={kpisNationaux.etpActuelTotal}
                        icon={Users}
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
                        tooltip="Besoin théorique en ETP calculé par le moteur de simulation."
                    />
                </motion.div>
                <motion.div variants={itemVariants} className="h-full">
                    <KpiCard
                        title="Écart Global"
                        value={kpisNationaux.surplusDeficit > 0 ? `+${kpisNationaux.surplusDeficit}` : kpisNationaux.surplusDeficit}
                        icon={AlertTriangle}
                        color={kpisNationaux.surplusDeficit < 0 ? "red" : "orange"}
                        tooltip="Différence entre l'effectif actuel et le calculé. Négatif = déficit."
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

            {/* ========================================
                ZONE 2 : ANALYSE RÉGIONALE (2 colonnes)
                ======================================== */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mb-3">

                {/* COLONNE PRINCIPALE (65%) - Carte + Graphique */}
                <div className="xl:col-span-2 flex flex-col gap-3">

                    {/* Carte Géographique des Écarts */}
                    <motion.div variants={itemVariants} className={`${cardStyle} p-0 overflow-hidden flex flex-col h-[300px]`}>
                        <div className="p-2 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                                <MapIcon size={16} className="text-[#005EA8]" />
                                Carte Géographique des Écarts
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
                                {regionsData.map((r) => {
                                    const ecart = r.etpRecommande - r.etpActuel;
                                    const isDeficit = ecart < 0;

                                    return (
                                        <CircleMarker
                                            key={r.code}
                                            center={[r.lat, r.lng]}
                                            radius={Math.max(Math.abs(ecart) * 0.05, 4)}
                                            pathOptions={{
                                                color: isDeficit ? '#EF4444' : '#10B981',
                                                fillColor: isDeficit ? '#FCA5A5' : '#6EE7B7',
                                                fillOpacity: 0.7,
                                                weight: 2
                                            }}
                                            className={Math.abs(ecart) > 50 ? "animate-pulse" : ""}
                                        >
                                            <Popup
                                                maxWidth={160}
                                                minWidth={140}
                                                className="compact-popup"
                                            >
                                                <div className="p-1">
                                                    <p className="font-semibold text-[11px] text-slate-800 mb-1 leading-tight border-b border-slate-100 pb-0.5">
                                                        {r.nom.replace('DR ', '')}
                                                    </p>
                                                    <div className="space-y-0.5">
                                                        <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
                                                            <span className="text-[9px] text-slate-500 font-medium">Actuel</span>
                                                            <span className="text-[10px] font-bold text-slate-800 text-right">{r.etpActuel}</span>
                                                        </div>
                                                        <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
                                                            <span className="text-[9px] text-slate-500 font-medium">Calculé</span>
                                                            <span className="text-[10px] font-bold text-blue-600 text-right">{r.etpRecommande}</span>
                                                        </div>
                                                        <div className="border-t border-slate-100 my-0.5"></div>
                                                        <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
                                                            <span className="text-[9px] text-slate-500 font-medium">Écart</span>
                                                            <span className={`text-[10px] font-bold text-right ${isDeficit ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                {ecart > 0 ? '+' : ''}{ecart}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </CircleMarker>
                                    );
                                })}
                            </MapContainer>
                        </div>
                    </motion.div>

                    {/* Comparatif Actuel vs Calculé */}
                    <motion.div variants={itemVariants} className={`${cardStyle} h-[300px]`}>
                        <h3 className="font-semibold text-sm text-slate-800 mb-3 flex items-center gap-2">
                            <BarChart3 size={16} className="text-[#005EA8]" />
                            Comparatif Actuel vs Calculé
                        </h3>
                        <ReactECharts option={getBarOption(regionsData)} style={{ height: 250 }} opts={{ renderer: 'canvas' }} />
                    </motion.div>
                </div>

                {/* COLONNE LATÉRALE DROITE (35%) - Insights + Donut + Actions */}
                <div className="flex flex-col gap-3">

                    {/* Insights Clés */}
                    <motion.div variants={itemVariants} className={`${cardStyle} bg-gradient-to-br from-white to-blue-50/50`}>
                        <h3 className="font-semibold text-sm text-slate-800 mb-3 flex items-center gap-2">
                            <span className="bg-blue-100 text-[#005EA8] p-1 rounded">
                                <FileText size={14} />
                            </span>
                            Insights Clés
                        </h3>
                        <div className="space-y-1">
                            {insights.map((insight, idx) => (
                                <InsightTile key={idx} type={insight.type} text={insight.text} />
                            ))}
                        </div>
                    </motion.div>

                    {/* Répartition Effectifs */}
                    <motion.div variants={itemVariants} className={cardStyle}>
                        <h3 className="font-semibold text-sm text-slate-800 mb-2">Répartition Effectifs</h3>
                        <ReactECharts
                            option={getPieOption(regionsData)}
                            style={{ height: 280 }} // Augmenté pour éviter les conflits
                            opts={{ renderer: 'canvas' }}
                        />
                    </motion.div>


                </div>
            </div>

            {/* ========================================
                ZONE 3 : DÉTAIL PAR DIRECTION (Grille)
                ======================================== */}
            <motion.div variants={itemVariants} className={`${cardStyle} p-0 overflow-hidden mb-3`}>
                <div className="p-3 border-b border-slate-100">
                    <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                        <MapIcon size={16} className="text-[#005EA8]" />
                        Répartition par Direction Régionale
                    </h3>
                </div>
                <div className="p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {regionsData.map((r) => {
                            const ecart = r.etpRecommande - r.etpActuel;
                            const isDeficit = ecart < 0;

                            return (
                                <div key={r.code} className="bg-slate-50 rounded-lg p-3 border border-slate-200 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-semibold text-xs text-slate-800">{r.nom}</h4>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isDeficit
                                            ? 'bg-rose-100 text-rose-700'
                                            : ecart === 0
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {r.centres} centres
                                            b        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-center mb-2">
                                        <div className="bg-white rounded p-2 border border-slate-100">
                                            <div className="text-[9px] text-slate-500 font-semibold mb-0.5">Actuel</div>
                                            <div className="text-sm font-bold text-slate-800">{r.etpActuel}</div>
                                        </div>
                                        <div className="bg-white rounded p-2 border border-slate-100">
                                            <div className="text-[9px] text-slate-500 font-semibold mb-0.5">Calculé</div>
                                            <div className="text-sm font-bold text-blue-600">{r.etpRecommande}</div>
                                        </div>
                                        <div className={`bg-white rounded p-2 border ${isDeficit ? 'border-rose-200' : 'border-emerald-200'}`}>
                                            <div className="text-[9px] text-slate-500 font-semibold mb-0.5">Écart</div>
                                            <div className={`text-sm font-bold ${isDeficit ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {ecart > 0 ? '+' : ''}{ecart}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${r.tauxOccupation > 100 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${Math.min(r.tauxOccupation, 100)}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600 min-w-[40px] text-right">{r.tauxOccupation}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </motion.div>

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
                                    <th className="py-2 px-3">Direction / Entité</th>
                                    <th className="py-2 px-3 text-center">Centres</th>
                                    <th className="py-2 px-3 text-right">Effectif Actuel</th>
                                    <th className="py-2 px-3 text-right">Calculé</th>
                                    <th className="py-2 px-3 text-right">Écart</th>
                                    <th className="py-2 px-3 text-right">Taux</th>
                                    <th className="py-2 px-3 text-center">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {regionsData.map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-2 px-3 font-semibold text-slate-700">{r.nom}</td>
                                        <td className="py-2 px-3 text-center text-slate-500">{r.centres}</td>
                                        <td className="py-2 px-3 text-right font-medium">{r.etpActuel}</td>
                                        <td className="py-2 px-3 text-right font-medium text-slate-600">{r.etpRecommande}</td>
                                        <td className={`py-2 px-3 text-right font-bold ${r.etpRecommande - r.etpActuel < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {r.etpRecommande - r.etpActuel > 0 ? '+' : ''}{r.etpRecommande - r.etpActuel}
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-600">{r.tauxOccupation}%</td>
                                        <td className="py-2 px-3 text-center">
                                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${r.etpRecommande - r.etpActuel < -10 ? 'bg-rose-500' : (Math.abs(r.etpRecommande - r.etpActuel) < 5 ? 'bg-emerald-500' : 'bg-amber-500')}`}></span>
                                        </td>
                                    </tr>
                                ))}
                                {/* Totals row */}
                                <tr className="bg-slate-50/80 font-bold text-slate-800">
                                    <td className="py-2.5 px-3">TOTAL NATIONAL</td>
                                    <td className="py-2.5 px-3 text-center">-</td>
                                    <td className="py-2.5 px-3 text-right">{kpisNationaux.etpActuelTotal}</td>
                                    <td className="py-2.5 px-3 text-right">{kpisNationaux.etpRecommandeTotal}</td>
                                    <td className="py-2.5 px-3 text-right">{kpisNationaux.surplusDeficit}</td>
                                    <td className="py-2.5 px-3 text-right">-</td>
                                    <td className="py-2.5 px-3"></td>
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

            <ImportModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onValidate={handleImportValidate}
            />
        </motion.div >
    );
}
