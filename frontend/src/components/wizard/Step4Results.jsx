import React, { useState, useMemo, useCallback } from "react";
import { BarChart3, Calculator, Play, User, Users, CheckCircle2, TrendingUp, Clock, Download, List, Eye, EyeOff, Tag, Zap, Calendar, Network, DollarSign, GitBranch, ChevronDown, ChevronRight, LineChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import EnterpriseTable from "@/components/tables/EnterpriseTable";
import OrganigrammeDialog from "@/components/wizard/OrganigrammeDialog";
import SeasonalityDialog from "@/components/wizard/SeasonalityDialog";
import ForecastingDialog from "@/components/wizard/ForecastingDialog";
import AdequationDialog from "@/components/wizard/AdequationDialog";
import CapaciteNominaleDialog from "@/components/wizard/CapaciteNominaleDialog";
import ChiffrageDialog from "@/components/wizard/ChiffrageDialog";
import CategorisationDialog from "@/components/wizard/CategorisationDialog";
import SchemaDialog from "@/components/wizard/SchemaDialog";
import * as XLSX from 'xlsx';

// KPI Card Component (copied from VueIntervenant)
const KPICardGlass = ({
    label,
    total,
    icon: Icon,
    tone = "blue",
    emphasize = false,
    children,
    onDetailClick,
    subLabel,
}) => {
    const T = {
        blue: {
            ring: "ring-blue-300/60",
            halo: "from-blue-400/25",
            text: "text-[#005EA8]",
            border: "border-blue-200/40",
            iconBg: "bg-blue-50/80"
        },
        cyan: {
            ring: "ring-cyan-300/60",
            halo: "from-cyan-400/25",
            text: "text-cyan-600",
            border: "border-cyan-200/40",
            iconBg: "bg-cyan-50/80"
        },
        amber: {
            ring: "ring-amber-300/60",
            halo: "from-amber-400/25",
            text: "text-amber-600",
            border: "border-amber-200/40",
            iconBg: "bg-amber-50/80"
        },
        emerald: {
            ring: "ring-emerald-300/60",
            halo: "from-emerald-400/25",
            text: "text-emerald-600",
            border: "border-emerald-200/40",
            iconBg: "bg-emerald-50/80"
        },
        rose: {
            ring: "ring-rose-300/60",
            halo: "from-rose-400/25",
            text: "text-rose-600",
            border: "border-rose-200/40",
            iconBg: "bg-rose-50/80"
        },
    }[tone] || {
        ring: "ring-blue-300/60",
        halo: "from-blue-400/25",
        text: "text-[#005EA8]",
        border: "border-blue-200/40",
        iconBg: "bg-blue-50/80"
    };

    return (
        <div className={`group relative overflow-hidden rounded-2xl border ${T.border} bg-gradient-to-br from-white via-white to-slate-50/30 backdrop-blur-xl p-2.5 pb-2 flex flex-col ring-1 ${T.ring} shadow-[0_8px_30px_-8px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 h-full`}>
            <div aria-hidden className={`pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full blur-2xl bg-gradient-to-br ${T.halo} to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300`} />

            {onDetailClick && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDetailClick();
                    }}
                    className={`absolute right-2 top-2 z-10 p-1 rounded-lg ${T.iconBg} hover:bg-white text-slate-500 hover:text-slate-700 transition-all duration-200 shadow-sm border ${T.border}`}
                >
                    <Eye className="w-3 h-3" />
                </button>
            )}

            {Icon && <Icon aria-hidden className="pointer-events-none absolute right-2 bottom-0.5 w-6 h-6 opacity-10 text-slate-700 group-hover:opacity-15 transition-opacity" />}

            <div className="flex flex-col items-center mb-1.5">
                <div className="h-[26px] flex items-center justify-center">
                    <span className="text-[10px] font-bold text-center text-slate-600 uppercase tracking-tight leading-[11px] px-1">
                        {label}
                    </span>
                </div>
                <div className="text-center flex flex-col items-center justify-center h-[24px]">
                    <div className="flex items-baseline gap-1 leading-none">
                        <span className={`text-xl font-extrabold ${emphasize ? T.text : "text-slate-900"}`}>{total}</span>
                        {subLabel && (
                            <span className={`text-[9px] font-bold uppercase tracking-tighter ${emphasize ? T.text + " opacity-70" : "text-slate-400"}`}>
                                {subLabel}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {children && (
                <div className="flex-1 flex flex-col justify-center pt-1.5 border-t border-slate-200/60 w-full">
                    {children}
                </div>
            )}
        </div>
    );
};

const EffectifFooter = ({ totalLabel, totalValue, modValue, moiValue, apsLabel, apsValue }) => (
    <div className="text-[10px] text-slate-600 space-y-1 w-full">
        {/* Ligne 1: Total */}
        <div className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-0.5 border ${totalValue !== undefined ? 'bg-slate-50 border-slate-100' : 'opacity-0'}`}>
            <span className="font-bold text-slate-400 text-[8px] uppercase">{totalLabel || "TOTAL"}:</span>
            <span className="text-slate-800 font-extrabold">{totalValue || "0"}</span>
        </div>

        {/* Ligne 2: MOD / MOI */}
        <div className="flex items-center justify-center gap-1">
            <div className="flex-1 flex items-center justify-between px-1.5 py-0.5 rounded bg-blue-50/50 text-[#005EA8] border border-blue-100/50">
                <span className="text-blue-400 font-bold text-[8px]">MOD:</span>
                <span className="font-extrabold">{modValue}</span>
            </div>
            <div className={`flex-1 flex items-center justify-between px-1.5 py-0.5 rounded border ${moiValue !== undefined && moiValue !== null ? 'bg-fuchsia-50/50 text-fuchsia-700 border-fuchsia-100/50' : 'opacity-0'}`}>
                <span className="text-fuchsia-400 font-bold text-[8px]">MOI:</span>
                <span className="font-extrabold">{moiValue || "0"}</span>
            </div>
        </div>

        {/* Ligne 3: APS */}
        <div className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-0.5 border ${apsValue !== undefined && apsValue !== null ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50' : 'opacity-0'}`}>
            <span className="font-bold text-emerald-400 text-[8px] uppercase">{apsLabel || "APS"}:</span>
            <span className="font-extrabold">{apsValue || "0"}</span>
        </div>
    </div>
);

export default function Step4Results({
    data,
    onLaunchSimulation,
    simulationResults,
    loading,
    postes = [],
    centreDetails = null,
}) {
    const [selectedIntervenant, setSelectedIntervenant] = useState("");
    // Filter states
    const [filterFamille, setFilterFamille] = useState("");
    const [filterPrestation, setFilterPrestation] = useState("");

    // Dialogs state
    const [detailDialog, setDetailDialog] = useState({ open: false, title: "", data: [], tone: "blue" });
    const [showOrgChartDialog, setShowOrgChartDialog] = useState(false);
    const [showSeasonalityDialog, setShowSeasonalityDialog] = useState(false);
    const [showForecastingDialog, setShowForecastingDialog] = useState(false);
    const [showAdequationDialog, setShowAdequationDialog] = useState(false);
    const [showCapaciteNominaleDialog, setShowCapaciteNominaleDialog] = useState(false);
    const [showChiffrageDialog, setShowChiffrageDialog] = useState(false);
    const [showCategorisationDialog, setShowCategorisationDialog] = useState(false);
    const [showSchemaDialog, setShowSchemaDialog] = useState(false);
    const [showAdditionalSections, setShowAdditionalSections] = useState(false);
    const [showReferentielDialog, setShowReferentielDialog] = useState(false);
    const [refFilterFamille, setRefFilterFamille] = useState("");
    const [refFilterPrestation, setRefFilterPrestation] = useState("");

    // Helper pour extraire le premier mot (avec gestion spéciale pour e Barkia)
    const getFirstWord = (str) => {
        if (!str) return "";
        const parts = str.trim().split(/\s+/);
        if (parts.length > 1 && parts[0].toLowerCase() === "e" && parts[1].toLowerCase().includes("barkia")) {
            return "e Barkia";
        }
        return parts[0];
    };

    const formatSmallNumber = (v) => Number(v || 0).toFixed(2).replace('.', ',');
    const formatSigned = (val) => {
        const num = Number(val);
        if (isNaN(num)) return "0";
        return num > 0 ? `+ ${num} ` : `${num} `;
    };

    // Helper to detect MOI postes
    const isMoiPoste = (p) => {
        if (!p) return false;
        const type = (p.type_poste || "").toUpperCase();
        return type === "MOI" || type === "INDIRECT" || type === "STRUCTURE" || !!p.is_moi;
    };

    // Filter available postes based on simulation results for recommended mode
    const filteredPostes = useMemo(() => {
        // Collect all unique responsibles from tasks
        const tasks = simulationResults?.tasks || [];
        const activeResponsibles = new Set(
            tasks.map(t => (t.responsable || "").toUpperCase().trim())
        );

        // 1. Start with existing postes that are active in tasks
        const existingActive = postes.filter(p => {
            const label = (p.label || p.nom || "").toUpperCase().trim();
            return activeResponsibles.has(label);
        });

        // 2. Add roles that are present in simulation results but NOT in the center's postes list
        // (common in recommended/optimized mode when new roles are introduced via mapping)
        const processedLabels = new Set(existingActive.map(p => (p.label || p.nom || "").toUpperCase().trim()));

        const newRoles = Array.from(activeResponsibles)
            .filter(label => label && !processedLabels.has(label))
            .map((label, index) => ({
                id: `mapped-${label}`, // Unique ID for the filter
                label: label,
                nom: label,
                isNew: true
            }));

        const result = [...existingActive, ...newRoles];

        // If no filters are active or we are in "actuel" mode, 
        // fallback to standard postes if no tasks are yet calculated
        if (result.length === 0 && (data.mode === 'actuel' || !simulationResults)) {
            return postes;
        }

        return result.sort((a, b) =>
            (a.label || a.nom || "").localeCompare(b.label || b.nom || "")
        );
    }, [postes, simulationResults, data.mode]);

    const selectedPosteObj = useMemo(() => {
        if (!selectedIntervenant) return null;
        // Search in filteredPostes because some responsibles in Recommended mode might not be in the initial center postes
        return filteredPostes.find(p => String(p.id) === String(selectedIntervenant));
    }, [filteredPostes, selectedIntervenant]);

    const isGlobalView = !selectedIntervenant;

    // KPI Calculations (simplified from VueIntervenant)
    const kpiData = useMemo(() => {
        if (!simulationResults) {
            return {
                actualMOD: 0,
                actualMOI: 0,
                actualAPS: 0,
                actualStatutaire: 0,
                actualTotal: 0,
                targetCalculatedMOD: 0,
                targetCalculatedMOI: 0,
                totalCalculated: 0,
                targetFinalMOD: 0,
                targetFinalMOI: 0,
                totalFinal: 0,
                gapStatutaire: 0,
                diffStatutaire: 0,
                apsDelta: 0,
                totalLoad: 0,
            };
        }

        const tasks = simulationResults.tasks || [];
        let filteredTasks = tasks;

        // Apply same filters as the table for consistency
        if (selectedPosteObj) {
            const respName = (selectedPosteObj.label || selectedPosteObj.nom || "").trim().toUpperCase();
            filteredTasks = filteredTasks.filter(t => (t.responsable || "").toUpperCase().trim() === respName);
        }
        if (filterFamille) {
            filteredTasks = filteredTasks.filter(t => t.famille === filterFamille);
        }
        if (filterPrestation) {
            filteredTasks = filteredTasks.filter(t => getFirstWord(t.produit) === filterPrestation);
        }

        const totalLoad = filteredTasks.reduce((acc, t) => acc + (t.heures_calculees || 0), 0);

        const fteCalculated = simulationResults.fte_calcule || 0;
        const heuresNet = data.heuresNet || 7.33;

        let actualMOD = 0;
        let actualMOI = 0;
        let actualAPS = 0;

        if (isGlobalView && centreDetails && !data.isVirtual) {
            actualMOD = Number(centreDetails.mod_global || 0);
            actualMOI = Number(centreDetails.moi_global || 0);
            actualAPS = Number(centreDetails.aps || 0);
        } else if (selectedPosteObj && !data.isVirtual) {
            const posteLabel = (selectedPosteObj.label || selectedPosteObj.nom || "").trim();
            // Use aggregated headcount from backend if available, fallback to poste attribute
            const val = Number((simulationResults.ressources_actuelles_par_poste || {})[posteLabel] ?? (selectedPosteObj.effectif_actuel || 0));

            if (isMoiPoste(selectedPosteObj)) {
                actualMOI = val;
            } else {
                actualMOD = val;
            }
        }

        const actualStatutaire = actualMOD + actualMOI;
        const actualTotal = actualStatutaire + actualAPS;

        const isMOD = selectedPosteObj ? !isMoiPoste(selectedPosteObj) : false;
        const posteLabel = selectedPosteObj ? (selectedPosteObj.label || selectedPosteObj.nom || "").trim() : "";
        const individualCalculated = (simulationResults.ressources_par_poste || {})[posteLabel] || 0;

        const targetCalculatedMOD = isGlobalView ? fteCalculated : (isMOD ? individualCalculated : 0);
        const targetCalculatedMOI = isGlobalView ? actualMOI : (isMoiPoste(selectedPosteObj) ? individualCalculated || actualMOI : 0);
        const totalCalculated = targetCalculatedMOD + targetCalculatedMOI;

        const targetFinalMOD = isGlobalView ? Math.round(fteCalculated) : (isMOD ? Math.round(individualCalculated) : 0);
        const targetFinalMOI = isGlobalView ? Math.round(actualMOI) : (isMoiPoste(selectedPosteObj) ? Math.round(individualCalculated || actualMOI) : 0);
        const totalFinal = Math.round(totalCalculated);

        // Nouvelle logique APS pour ETP Final
        const ecartGlobal = totalCalculated - actualStatutaire;
        let finalAPS = 0;
        if (ecartGlobal > 0) {
            finalAPS = Math.round(ecartGlobal);
        } else {
            const surplusStatutaire = Math.abs(ecartGlobal);
            finalAPS = Math.max(0, Math.round(actualAPS - surplusStatutaire));
        }

        // Logique spécifique pour la carte Besoin (dernière carte)
        // Écart Statutaire réel : diff entre final et actuel
        // On ne change le statutaire (MOD) que si le surplus dépasse l'APS
        const diffStatutaireReel = Math.round(Math.min(0, totalCalculated - actualStatutaire + actualAPS));

        // Variation APS : Écart entre APS Final et Actuel
        const apsDiff = Math.round(finalAPS - actualAPS);

        // Écart global (Variation Statutaire + Variation APS)
        const totalGap = diffStatutaireReel + apsDiff;

        // Détail MOD / MOI pour le footer
        const modDiff = diffStatutaireReel;
        const moiDiff = 0; // Le MOI reste à 0 selon la demande

        return {
            actualMOD,
            actualMOI,
            actualAPS,
            actualStatutaire,
            actualTotal,
            targetCalculatedMOD,
            targetCalculatedMOI,
            totalCalculated,
            targetFinalMOD,
            targetFinalMOI,
            totalFinal,
            finalAPS,
            totalGap,
            diffStatutaireReel,
            apsDiff,
            modDiff,
            moiDiff,
            totalLoad,
        };
    }, [simulationResults, isGlobalView, selectedPosteObj, centreDetails, data.heuresNet, filterFamille, filterPrestation]);

    // Table columns
    const columns = [
        { key: "seq", label: "Seq", width: "60px" },
        { key: "task_name", label: "Tâche", width: "auto" },
        { key: "unite_mesure", label: "Unité", width: "100px" },
        { key: "volume_journalier", label: "Vol/Jour", width: "100px", align: "right" },
        { key: "moyenne_min", label: "Temps Unit (min)", width: "120px", align: "right" },
        { key: "formule", label: "Formule", width: "200px" },
        { key: "heures_calculees", label: "Charge (h)", width: "100px", align: "right", highlight: true },
    ];

    // Transform backend data to group identical tasks with different responsibles
    const tableData = useMemo(() => {
        if (!simulationResults?.tasks) return [];

        const groups = {};
        simulationResults.tasks.forEach((task) => {
            // Create a unique key for the task (excluding the specific responsible/centre_poste_id)
            const key = [
                task.task_name || "",
                task.produit || "",
                task.famille || "",
                task.unite_mesure || "",
                task.phase || "",
                task.moyenne_min?.toFixed(4) || "0"
            ].join("|||");

            if (!groups[key]) {
                groups[key] = {
                    ...task,
                    responsables: [task.responsable],
                    // Use raw volume and calculate grouped hours
                    raw_volume: task.volume_journalier || 0,
                    raw_hours: task.heures_calculees || 0
                };
            } else {
                // If the same responsible is already there (unlikely given the request), don't add
                if (!groups[key].responsables.includes(task.responsable)) {
                    groups[key].responsables.push(task.responsable);
                }
                // Accumulate volume and hours if it's the same task split
                // (Though usually it's the SAME task with SAME volume assigned to two people)
                // USER: "c'est la meme tache avec deux responsables"
                // If it's the same task, maybe the volumes in DB are already split or duplicated.
                // If duplicated, we should maybe not sum them? 
                // However, usually in these systems, if one task is 10h and split, 
                // the engine returns two rows of 5h or two rows of 10h?
                // Given "deux lignes identiques", I will assume we might need to show the TOTAL or just the first one if identical.
                // Let's assume we sum them to get the total impact of that task.
                groups[key].raw_volume += (task.volume_journalier || 0);
                groups[key].raw_hours += (task.heures_calculees || 0);
            }
        });

        return Object.values(groups).map((group, index) => ({
            ...group,
            seq: index + 1,
            resp1: group.responsables[0] || "-",
            resp2: group.responsables[1] || "-",
            volume_journalier: group.raw_volume.toFixed(2),
            moyenne_min: group.moyenne_min?.toFixed(2) || "0.00",
            heures_calculees: group.raw_hours.toFixed(2),
        }));
    }, [simulationResults]);

    // Extract unique Famille and Produit values
    const uniqueFamilles = useMemo(() => {
        if (!tableData) return [];
        const familles = [...new Set(tableData.map(t => t.famille).filter(Boolean))];
        return familles.sort();
    }, [tableData]);

    const uniquePrestations = useMemo(() => {
        if (!tableData) return [];
        const produits = [...new Set(tableData.map(t => getFirstWord(t.produit)).filter(Boolean))];
        return produits.sort();
    }, [tableData]);

    // Unique tasks for referential (moy_sec > 0)
    const referentielTasks = useMemo(() => {
        if (!simulationResults?.tasks) return [];
        const groups = {};
        simulationResults.tasks.filter(t => Number(t.moy_sec) > 0).forEach(t => {
            const key = [
                t.task_name || "",
                t.produit || "",
                t.famille || "",
                t.unite_mesure || "",
                t.phase || ""
            ].join("|||");

            if (!groups[key]) {
                groups[key] = {
                    ...t,
                    responsables: [t.responsable]
                };
            } else {
                if (!groups[key].responsables.includes(t.responsable)) {
                    groups[key].responsables.push(t.responsable);
                }
            }
        });

        return Object.values(groups).map(g => ({
            ...g,
            resp1: g.responsables[0] || "-",
            resp2: g.responsables[1] || "-"
        }));
    }, [simulationResults]);

    const uniqueRefFamilles = useMemo(() => {
        const familles = [...new Set(referentielTasks.map(t => t.famille).filter(Boolean))];
        return familles.sort();
    }, [referentielTasks]);

    const uniqueRefPrestations = useMemo(() => {
        const produits = [...new Set(referentielTasks.map(t => getFirstWord(t.produit)).filter(Boolean))];
        return produits.sort();
    }, [referentielTasks]);

    const filteredReferentielTasks = useMemo(() => {
        let filtered = referentielTasks;
        if (refFilterFamille) {
            filtered = filtered.filter(t => t.famille === refFilterFamille);
        }
        if (refFilterPrestation) {
            filtered = filtered.filter(t => getFirstWord(t.produit) === refFilterPrestation);
        }
        return filtered;
    }, [referentielTasks, refFilterFamille, refFilterPrestation]);

    // Apply filters to table data
    const filteredTableData = useMemo(() => {
        let filtered = tableData;

        // Filter by Intervenant if selected
        if (selectedPosteObj) {
            const respName = (selectedPosteObj.label || selectedPosteObj.nom || "").trim().toUpperCase();
            filtered = filtered.filter(task => {
                const tResp = (task.responsable || "").trim().toUpperCase();
                return tResp === respName;
            });
        }

        if (filterFamille) {
            filtered = filtered.filter(t => t.famille === filterFamille);
        }
        if (filterPrestation) {
            filtered = filtered.filter(t => getFirstWord(t.produit) === filterPrestation);
        }
        return filtered;
    }, [tableData, filterFamille, filterPrestation, selectedPosteObj]);

    const handleExportExcel = () => {
        if (!filteredTableData || filteredTableData.length === 0) return;

        // Build a lookup map from task_id for raw (unformatted) values
        const rawTaskMap = {};
        (simulationResults?.tasks || []).forEach(t => {
            rawTaskMap[t.task_id] = t;
        });

        // Export tasks respecting active filters
        const dataToExport = filteredTableData.map(t => {
            return {
                "Famille": t.famille,
                "Tâche": t.task_name,
                "Prestation": t.produit,
                "Responsable 1": t.resp1,
                "Responsable 2": t.resp2,
                "Unité": t.unite_mesure,
                "Volume Journalier": Number(t.volume_journalier.replace(',', '.') || 0),
                "Temps Unitaire (min)": Number(t.moyenne_min.replace(',', '.') || 0),
                "Heures Calculées": Number(t.heures_calculees.replace(',', '.') || 0),
                "Formule": t.formule
            };
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Résultats Simulation");
        XLSX.writeFile(wb, `Resultats_Simulation_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleShowDetail = (type, title, tone) => {
        if (!simulationResults) return;

        const breakdown = postes.map(p => {
            const label = (p.label || p.nom || "").trim();
            const respName = label.toUpperCase();
            const isMoi = isMoiPoste(p);

            // 1. Filter tasks for this post (respecting active filters)
            let postTasks = (simulationResults.tasks || []).filter(t => (t.responsable || "").toUpperCase().trim() === respName);
            if (filterFamille) postTasks = postTasks.filter(t => t.famille === filterFamille);
            if (filterPrestation) postTasks = postTasks.filter(t => getFirstWord(t.produit) === filterPrestation);

            const load = postTasks.reduce((acc, t) => acc + (t.heures_calculees || 0), 0);

            // 2. FTE and Calc logic
            const fteCalc = (simulationResults.ressources_par_poste || {})[label] || 0;
            const actual = Number((simulationResults.ressources_actuelles_par_poste || {})[label] ?? (p.effectif_actuel || 0));

            // Handle MOI specific values if they are not in ressources_par_poste
            const targetFteCalc = isMoi ? (fteCalc || actual) : fteCalc;
            const targetFinal = Math.round(targetFteCalc);
            const gap = targetFinal - actual;

            let val = 0;
            if (type === "load") val = load;
            else if (type === "actual") val = actual;
            else if (type === "fte_calc") val = targetFteCalc;
            else if (type === "fte_final") val = targetFinal;
            else if (type === "gap") val = gap;

            return { label, value: val, actual, gap, isMoi };
        }).filter(item => item.value !== 0 || !item.isMoi); // Keep all non-zero or MOD posts

        setDetailDialog({
            open: true,
            title,
            tone,
            type,
            data: breakdown.sort((a, b) => b.value - a.value)
        });
    };

    const BreakdownDialog = () => {
        const isComparison = detailDialog.type === "fte_final" || detailDialog.type === "fte_calc";

        return (
            <Dialog open={detailDialog.open} onOpenChange={(open) => setDetailDialog(prev => ({ ...prev, open }))}>
                <DialogContent className="max-w-lg bg-gradient-to-br from-white to-slate-50/30 p-0 overflow-hidden border border-slate-200/60 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.3)] rounded-2xl">
                    <DialogHeader className={`p-5 bg-gradient-to-br ${detailDialog.tone === 'rose' ? 'from-rose-500 via-rose-600 to-rose-700' : 'from-[#005EA8] via-blue-600 to-blue-700'} text-white relative overflow-hidden`}>
                        <div aria-hidden className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-40" />
                        <DialogTitle className="text-lg font-bold flex items-center gap-3 relative z-10">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Eye className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-xs font-medium opacity-90">Détail par Poste</div>
                                <div className="text-base font-extrabold">{detailDialog.title}</div>
                            </div>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-5 max-h-[65vh] overflow-y-auto custom-scrollbar">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b-2 border-slate-200">
                                        <TableHead className="text-xs font-extrabold text-slate-700 py-3">Poste / Intervenant</TableHead>
                                        {isComparison ? (
                                            <>
                                                <TableHead className="text-[10px] font-extrabold text-slate-600 text-right uppercase tracking-wider">Actuel</TableHead>
                                                <TableHead className="text-[10px] font-extrabold text-slate-600 text-right uppercase tracking-wider">Calculé</TableHead>
                                                <TableHead className="text-[10px] font-extrabold text-slate-600 text-right uppercase tracking-wider">Écart</TableHead>
                                            </>
                                        ) : (
                                            <TableHead className="text-xs font-extrabold text-slate-700 text-right">Valeur</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {detailDialog.data.map((item, idx) => (
                                        <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100/50 last:border-0">
                                            <TableCell className="py-3 text-xs text-slate-700">
                                                <div className="flex items-center gap-2.5">
                                                    <span className={`w-2 h-2 rounded-full shadow-sm ${item.isMoi ? 'bg-gradient-to-br from-fuchsia-400 to-fuchsia-500' : 'bg-gradient-to-br from-blue-400 to-blue-500'}`} />
                                                    <span className="truncate max-w-[180px] font-medium" title={item.label}>{item.label}</span>
                                                </div>
                                            </TableCell>
                                            {isComparison ? (
                                                <>
                                                    <TableCell className="py-3 text-right text-xs text-slate-600 font-medium">
                                                        <span className="px-2 py-1 bg-slate-50 rounded-md">{item.actual}</span>
                                                    </TableCell>
                                                    <TableCell className="py-3 text-right font-bold text-slate-900 text-xs">
                                                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                                                            {detailDialog.type === "fte_calc" ? item.value.toFixed(2).replace('.', ',') : item.value}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-3 text-right text-xs">
                                                        <Badge className={`text-[10px] px-2 py-0.5 h-5 font-bold shadow-sm ${item.gap > 0
                                                            ? 'bg-gradient-to-br from-red-50 to-red-100 text-red-700 border border-red-200'
                                                            : item.gap < 0
                                                                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200'
                                                                : 'bg-gradient-to-br from-slate-50 to-slate-100 text-slate-500 border border-slate-200'
                                                            }`}>
                                                            {detailDialog.type === "fte_calc"
                                                                ? (item.value - item.actual).toFixed(2).replace('.', ',')
                                                                : (item.gap > 0 ? `+${item.gap}` : item.gap)
                                                            }
                                                        </Badge>
                                                    </TableCell>
                                                </>
                                            ) : (
                                                <TableCell className="py-3 text-right font-bold text-slate-900 text-xs">
                                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                                                        {detailDialog.type === "load" || detailDialog.type === "fte_calc"
                                                            ? item.value.toFixed(2).replace('.', ',')
                                                            : item.value
                                                        }
                                                    </span>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                    {detailDialog.data.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={isComparison ? 4 : 2} className="text-center py-12">
                                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                                    <Eye className="w-8 h-8 opacity-30" />
                                                    <p className="text-xs italic">Aucune donnée disponible pour ce critère.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 border-t border-slate-200 flex justify-between items-center">
                        <div className="text-xs text-slate-500 font-medium">
                            {detailDialog.data.length} poste{detailDialog.data.length > 1 ? 's' : ''}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDetailDialog(prev => ({ ...prev, open: false }))}
                            className="bg-white hover:bg-slate-50 border-slate-300 shadow-sm"
                        >
                            Fermer
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    };

    return (
        <div className="wizard-step-content space-y-4 p-4 text-xs">
            <BreakdownDialog />
            <div className="text-center mb-1">
                <h2 className="text-lg font-bold text-slate-800 mb-0">
                    {data.isVirtual
                        ? `Simulation Virtuelle : ${data.virtualTypology}`
                        : data.mode === "optimise"
                            ? "Simulation Processus Optimisé"
                            : data.mode === "recommande"
                                ? "Simulation Processus Consolidé"
                                : "Simulation Processus Actuel"
                    }
                </h2>
                <p className="text-xs text-slate-500">
                    {data.isVirtual
                        ? "Test basé sur le référentiel standard"
                        : data.mode === "optimise"
                            ? "Analyse avec exclusions de tâches appliquées"
                            : data.mode === "recommande"
                                ? "Analyse avec organisation cible (Mapping)"
                                : "Analyse de l'organisation existante"
                    }
                </p>
            </div>

            <div className="max-w-6xl mx-auto space-y-3">
                {/* Launch Simulation Button */}
                {!simulationResults && (
                    <Card className="wizard-card border-blue-200 bg-gradient-to-br from-blue-50/40 to-white">
                        <CardContent className="p-8 text-center">
                            <div className="max-w-md mx-auto space-y-4">
                                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center shadow-sm">
                                    <Play className="w-8 h-8 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-800 mb-2">
                                        {data.isVirtual ? `Simulation Virtuelle : ${data.virtualTypology || 'Typologie'}` : "Aucune simulation disponible"}
                                    </h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        {data.isVirtual
                                            ? "Lancez le moteur pour tester ce scénario basé sur le référentiel Excel."
                                            : "Lancez la simulation pour calculer les besoins en ressources et analyser les résultats par intervenant."}
                                    </p>
                                </div>
                                <Button
                                    onClick={onLaunchSimulation}
                                    disabled={loading}
                                    className="bg-gradient-to-r from-[#005EA8] to-[#0A6BBC] hover:from-[#004e8a] hover:to-[#085a9c] text-white px-8 py-2.5 text-sm font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                                >
                                    {loading ? (
                                        <>
                                            <Calculator className="w-4 h-4 mr-2 animate-spin" />
                                            Simulation en cours...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4 mr-2" />
                                            Lancer la Simulation
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Results Section */}
                {simulationResults && (
                    <>
                        {/* Intervenant Filter */}
                        <Card className="wizard-card compact-card">
                            <CardContent className="p-2.5">
                                <div className="flex items-center gap-3">
                                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        Filtrer par Intervenant
                                    </Label>
                                    <Select
                                        value={selectedIntervenant || "all"}
                                        onValueChange={(val) => setSelectedIntervenant(val === "all" ? "" : val)}
                                    >
                                        <SelectTrigger className="h-7 text-xs bg-white border-slate-200 max-w-xs">
                                            <SelectValue placeholder="-- Tous les intervenants --" />
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
                                </div>
                            </CardContent>
                        </Card>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-5 gap-2">
                            {/* Charge Totale */}
                            <KPICardGlass
                                label="Charge Totale"
                                icon={BarChart3}
                                tone="blue"
                                emphasize
                                total={Number(kpiData.totalLoad || 0).toFixed(2)}
                                onDetailClick={isGlobalView ? () => handleShowDetail("load", "Charge Totale", "blue") : null}
                                subLabel="H/J"
                            >
                                <div className="text-[10px] text-slate-600 space-y-1 w-full flex flex-col items-center">
                                    <div className="opacity-0 pointer-events-none h-[22px]" aria-hidden="true">Placeholder Top</div>
                                    <div className="flex items-center justify-center gap-1.5 rounded-full px-3 py-1 bg-slate-50 border border-slate-100 shadow-sm h-[24px]">
                                        <span className="text-[#005EA8] font-bold text-[9px] uppercase tracking-tighter">heures / jour</span>
                                    </div>
                                    <div className="opacity-0 pointer-events-none h-[22px]" aria-hidden="true">Placeholder Bottom</div>
                                </div>
                            </KPICardGlass>

                            {!data.isVirtual && (
                                <KPICardGlass
                                    label="Effectif Actuel"
                                    icon={User}
                                    tone="cyan"
                                    emphasize
                                    total={Math.round(kpiData.actualTotal)}
                                    onDetailClick={isGlobalView ? () => handleShowDetail("actual", "Effectif Actuel", "cyan") : null}
                                >
                                    {isGlobalView && (
                                        <EffectifFooter
                                            totalLabel="Statutaire"
                                            totalValue={Math.round(kpiData.actualStatutaire)}
                                            modValue={Math.round(kpiData.actualMOD)}
                                            moiValue={Math.round(kpiData.actualMOI)}
                                            apsLabel="APS"
                                            apsValue={Math.round(kpiData.actualAPS)}
                                        />
                                    )}
                                </KPICardGlass>
                            )}

                            {/* ETP Calculé */}
                            <KPICardGlass
                                label={data.mode === "optimise" ? "ETP Optimisé (Calculé)" : data.mode === "recommande" ? "ETP Consolidé (Calculé)" : "ETP Calculé"}
                                icon={Calculator}
                                tone="blue"
                                emphasize
                                total={formatSmallNumber(kpiData.totalCalculated)}
                                onDetailClick={isGlobalView ? () => handleShowDetail("fte_calc", data.mode === "optimise" ? "ETP Optimisé" : data.mode === "recommande" ? "ETP Consolidé" : "ETP Calculé", "blue") : null}
                            >
                                {isGlobalView && (
                                    <EffectifFooter
                                        modValue={formatSmallNumber(kpiData.targetCalculatedMOD)}
                                        moiValue={formatSmallNumber(kpiData.targetCalculatedMOI)}
                                    />
                                )}
                            </KPICardGlass>

                            {/* ETP Final */}
                            <KPICardGlass
                                label={data.mode === "optimise" ? "ETP Optimisé (Final)" : data.mode === "recommande" ? "ETP Consolidé (Final)" : "ETP Final"}
                                icon={CheckCircle2}
                                tone="amber"
                                emphasize
                                total={Math.round(kpiData.totalFinal)}
                                onDetailClick={isGlobalView ? () => handleShowDetail("fte_final", data.mode === "optimise" ? "Calculé Optimisé" : data.mode === "recommande" ? "Calculé Consolidé" : "ETP Final", "amber") : null}
                            >
                                {isGlobalView && (
                                    <EffectifFooter
                                        totalLabel="Statutaire"
                                        totalValue={Math.round(kpiData.actualStatutaire)}
                                        modValue={Math.round(kpiData.targetFinalMOD)}
                                        moiValue={Math.round(kpiData.actualMOI)}
                                        apsLabel="APS"
                                        apsValue={kpiData.finalAPS}
                                    />
                                )}
                            </KPICardGlass>

                            {/* Ecart (anciennement Besoin) */}
                            <KPICardGlass
                                label={data.isVirtual ? "Ressources Nécessaires" : "Écart"}
                                icon={kpiData.totalGap > 0 || data.isVirtual ? TrendingUp : CheckCircle2}
                                tone={kpiData.totalGap > 0 || data.isVirtual ? "rose" : "emerald"}
                                emphasize
                                total={data.isVirtual
                                    ? Math.round(kpiData.totalFinal)
                                    : formatSigned(kpiData.totalGap)
                                }
                                subLabel={!data.isVirtual ? (kpiData.totalGap > 0 ? "Besoin" : kpiData.totalGap < 0 ? "Surplus" : "") : ""}
                            >
                                {isGlobalView && !data.isVirtual && (
                                    <EffectifFooter
                                        totalLabel="Ecart Statutaire"
                                        totalValue={formatSigned(kpiData.diffStatutaireReel)}
                                        modValue={formatSigned(kpiData.modDiff)}
                                        moiValue={formatSigned(kpiData.moiDiff)}
                                        apsLabel="Var. APS"
                                        apsValue={formatSigned(kpiData.apsDiff)}
                                    />
                                )}
                                {isGlobalView && data.isVirtual && (
                                    <div className="text-[10px] text-slate-600 space-y-1 w-full flex flex-col items-center">
                                        <div className="opacity-0 pointer-events-none h-[22px]" aria-hidden="true">Placeholder Top</div>
                                        <div className="flex items-center justify-center gap-1.5 rounded-full px-3 py-1 bg-slate-50 border border-slate-100 shadow-sm h-[24px]">
                                            <span className="text-slate-500 font-bold text-[9px] italic">Besoins bruts calculés</span>
                                        </div>
                                        <div className="opacity-0 pointer-events-none h-[22px]" aria-hidden="true">Placeholder Bottom</div>
                                    </div>
                                )}
                            </KPICardGlass>
                        </div>

                        {/* Filters */}
                        {simulationResults && simulationResults.tasks && simulationResults.tasks.length > 0 && (
                            <div className="flex flex-wrap items-center gap-4 bg-slate-50/80 p-1.5 rounded-lg border border-slate-100 self-start mb-1">
                                {/* Filtre Famille */}
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Famille:</span>
                                    <select
                                        className="bg-white border border-slate-200 text-[10px] text-slate-700 rounded px-2 py-0.5 focus:outline-none focus:border-blue-500 w-full max-w-[200px] h-6"
                                        value={filterFamille}
                                        onChange={e => setFilterFamille(e.target.value)}
                                    >
                                        <option value="">Toutes ({uniqueFamilles.length})</option>
                                        {uniqueFamilles.map(f => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                    </select>
                                    {filterFamille && (
                                        <button
                                            onClick={() => setFilterFamille("")}
                                            className="text-[10px] text-red-500 hover:text-red-700 font-medium px-1.5 py-0.5 bg-red-50 rounded border border-red-100 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* Filtre Prestation */}
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Prestation:</span>
                                    <select
                                        className="bg-white border border-slate-200 text-[10px] text-slate-700 rounded px-2 py-0.5 focus:outline-none focus:border-blue-500 w-full max-w-[150px] h-6"
                                        value={filterPrestation}
                                        onChange={e => setFilterPrestation(e.target.value)}
                                    >
                                        <option value="">Tous ({uniquePrestations.length})</option>
                                        {uniquePrestations.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                    {filterPrestation && (
                                        <button
                                            onClick={() => setFilterPrestation("")}
                                            className="text-[10px] text-red-500 hover:text-red-700 font-medium px-1.5 py-0.5 bg-red-50 rounded border border-red-100 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                <div className="ml-auto">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowReferentielDialog(true)}
                                        className="h-7 text-[10px] gap-2 font-bold px-3 bg-white text-[#005EA8] border-blue-200 hover:bg-blue-50 transition-all shadow-sm"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        Référentiel
                                        <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-blue-100 text-blue-700 border-blue-200">
                                            {referentielTasks.length}
                                        </Badge>
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Résultats de Simulation */}
                        {simulationResults && simulationResults.tasks && simulationResults.tasks.length > 0 && (
                            <div className="grid grid-cols-1 gap-2 mt-1 animate-in slide-in-from-bottom-2 duration-300 relative">

                                {/* Résultats de Simulation */}
                                <div className="bg-white rounded-lg p-1 min-h-[410px]">
                                    <EnterpriseTable
                                        title="Résultats de Simulation"
                                        subtitle={
                                            <div className="flex items-center gap-3">
                                                <span>Données calculées</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleExportExcel(); }}
                                                    className="h-5 px-1.5 text-[9px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/50 rounded flex items-center gap-1 transition-colors"
                                                    title="Exporter en Excel"
                                                >
                                                    <Download className="w-2.5 h-2.5" /> Exporter Excel
                                                </button>
                                            </div>
                                        }
                                        tooltip="Volumes × temps → heures nécessaires"
                                        icon={CheckCircle2}
                                        columns={[
                                            { key: 'produit', label: 'Prestation', align: 'left', width: '100px', ellipsis: true },
                                            { key: 'task', label: 'Tâche', align: 'left', ellipsis: true },
                                            { key: 'unite', label: 'Unité', align: 'left', width: '80px', ellipsis: true },
                                            { key: 'resp1', label: 'Responsable 1', align: 'left', width: '120px', ellipsis: true },
                                            { key: 'resp2', label: 'Responsable 2', align: 'left', width: '120px', ellipsis: true },
                                            { key: 'nombre_Unite', label: 'Vol. (/jour)', align: 'right', width: '100px', render: (val) => Number(val || 0).toFixed(1) },
                                            { key: 'heures', label: 'Heures', align: 'right', width: '80px', bold: true, render: (val) => Number(val || 0).toFixed(2) }
                                        ]}
                                        data={filteredTableData.filter(t => Number(t.heures_calculees.replace(',', '.')) > 0).map(task => ({
                                            produit: getFirstWord(task.produit) || "-",
                                            task: task.task_name,
                                            unite: task.unite_mesure,
                                            resp1: task.resp1,
                                            resp2: task.resp2,
                                            nombre_Unite: task.volume_journalier,
                                            heures: task.heures_calculees
                                        }))}
                                        footer={null}
                                        height={400}
                                        currentView="table"
                                        onViewChange={() => { }}
                                        showViewToggle={true}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Grille de Cartes pour Sections Additionnelles */}
                        {simulationResults && !selectedIntervenant && (
                            <div className="mt-8">
                                <div className="flex items-center mb-6">
                                    <button
                                        onClick={() => setShowAdditionalSections(!showAdditionalSections)}
                                        className="flex items-center gap-3 group focus:outline-none"
                                    >
                                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300 ${showAdditionalSections
                                            ? 'bg-blue-100 text-[#005EA8] rotate-0'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}>
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
                                            <p className="text-xs text-slate-500">Cliquez pour {showAdditionalSections ? 'masquer' : 'afficher'} les modules</p>
                                        </div>
                                    </button>
                                </div>

                                {showAdditionalSections && (
                                    <div className="space-y-4">
                                        {/* Première ligne - 4 cartes */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {/* Catégorisation */}
                                            <button
                                                onClick={() => setShowCategorisationDialog(true)}
                                                className="group relative overflow-hidden rounded-xl border border-purple-200/60 bg-gradient-to-br from-white via-purple-50/30 to-purple-100/20 p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-purple-300"
                                            >
                                                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-purple-400/20 to-transparent blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />
                                                <div className="relative flex items-center gap-4">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg group-hover:scale-110 transition-transform">
                                                        <Tag className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-base">Catégorisation</h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">Classification des centres</p>
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Capacité nominale */}
                                            <button
                                                onClick={() => setShowCapaciteNominaleDialog(true)}
                                                className="group relative overflow-hidden rounded-xl border border-cyan-200/60 bg-gradient-to-br from-white via-cyan-50/30 to-cyan-100/20 p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-cyan-300"
                                            >
                                                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-cyan-400/20 to-transparent blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />
                                                <div className="relative flex items-center gap-4">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg group-hover:scale-110 transition-transform">
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
                                                onClick={() => setShowAdequationDialog(true)}
                                                className="group relative overflow-hidden rounded-xl border border-emerald-200/60 bg-gradient-to-br from-white via-emerald-50/30 to-emerald-100/20 p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-300"
                                            >
                                                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400/20 to-transparent blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />
                                                <div className="relative flex items-center gap-4">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg group-hover:scale-110 transition-transform">
                                                        <TrendingUp className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-base">Index d'adéquation</h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">Mesure de performance</p>
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Prévision Année Actuel-Année Actuel+4ans */}
                                            <button
                                                onClick={() => setShowForecastingDialog(true)}
                                                className="group relative overflow-hidden rounded-xl border border-blue-200/60 bg-gradient-to-br from-white via-blue-50/30 to-blue-100/20 p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-300"
                                            >
                                                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-blue-400/20 to-transparent blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />
                                                <div className="relative flex items-center gap-4">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg group-hover:scale-110 transition-transform">
                                                        <LineChart className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-base">Prévision {new Date().getFullYear()}-{new Date().getFullYear() + 4}</h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">Période quinquennale</p>
                                                    </div>
                                                </div>
                                            </button>
                                        </div>

                                        {/* Deuxième ligne - 4 cartes */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {/* Saisonnalité */}
                                            <button
                                                onClick={() => setShowSeasonalityDialog(true)}
                                                className="group relative overflow-hidden rounded-xl border border-orange-200/60 bg-gradient-to-br from-white via-orange-50/30 to-orange-100/20 p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-orange-300"
                                            >
                                                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-orange-400/20 to-transparent blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />
                                                <div className="relative flex items-center gap-4">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg group-hover:scale-110 transition-transform">
                                                        <Calendar className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-base">Saisonnalité</h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">Variations temporelles</p>
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Schéma */}
                                            <button
                                                onClick={() => setShowSchemaDialog(true)}
                                                className="group relative overflow-hidden rounded-xl border border-indigo-200/60 bg-gradient-to-br from-white via-indigo-50/30 to-indigo-100/20 p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300"
                                            >
                                                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-400/20 to-transparent blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />
                                                <div className="relative flex items-center gap-4">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg group-hover:scale-110 transition-transform">
                                                        <Network className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-base">Schéma</h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">Visualisation des Activités</p>
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Chiffrage */}
                                            <button
                                                onClick={() => setShowChiffrageDialog(true)}
                                                className="group relative overflow-hidden rounded-xl border border-amber-200/60 bg-gradient-to-br from-white via-amber-50/30 to-amber-100/20 p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-amber-300"
                                            >
                                                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-amber-400/20 to-transparent blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />
                                                <div className="relative flex items-center gap-4">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg group-hover:scale-110 transition-transform">
                                                        <DollarSign className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-base">Chiffrage</h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">Estimation des coûts</p>
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Organigramme */}
                                            <button
                                                onClick={() => setShowOrgChartDialog(true)}
                                                className="group relative overflow-hidden rounded-xl border border-rose-200/60 bg-gradient-to-br from-white via-rose-50/30 to-rose-100/20 p-6 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-rose-300"
                                            >
                                                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-rose-400/20 to-transparent blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />
                                                <div className="relative flex items-center gap-4">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 shadow-lg group-hover:scale-110 transition-transform">
                                                        <GitBranch className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-base">Organigramme</h4>
                                                        <p className="text-xs text-slate-500 mt-0.5">Structure hiérarchique</p>
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Dialogs */}
            <ForecastingDialog
                open={showForecastingDialog}
                onOpenChange={setShowForecastingDialog}
                initialFte={kpiData.totalFinal}
                initialLoad={kpiData.totalLoad}
                gridValues={data?.gridValues || null}
                initialPosteId={selectedIntervenant || "all"}
                postes={postes}
                tasks={simulationResults?.tasks || []}
                wizardData={data}
                mode={data.mode}
            />

            <OrganigrammeDialog
                open={showOrgChartDialog}
                onOpenChange={setShowOrgChartDialog}
                wizardData={data}
                postes={postes}
                mode={data.mode}
            />

            <SeasonalityDialog
                open={showSeasonalityDialog}
                onOpenChange={setShowSeasonalityDialog}
                wizardData={data}
                postes={postes}
                mode={data.mode}
            />

            <AdequationDialog
                open={showAdequationDialog}
                onOpenChange={setShowAdequationDialog}
                simulationResults={simulationResults}
                postes={postes}
                centreDetails={centreDetails}
                mode={data.mode}
            />

            <CapaciteNominaleDialog
                open={showCapaciteNominaleDialog}
                onOpenChange={setShowCapaciteNominaleDialog}
                data={data}
                simulationResults={simulationResults}
                postes={postes}
                centreDetails={centreDetails}
                mode={data.mode}
            />

            <ChiffrageDialog
                open={showChiffrageDialog}
                onOpenChange={setShowChiffrageDialog}
                simulationResults={simulationResults}
                postes={postes}
                mode={data.mode}
            />

            <CategorisationDialog
                open={showCategorisationDialog}
                onOpenChange={setShowCategorisationDialog}
                wizardData={data}
                simulationResults={simulationResults}
                centreDetails={centreDetails}
                mode={data.mode}
            />

            <SchemaDialog
                open={showSchemaDialog}
                onOpenChange={setShowSchemaDialog}
                typologie={data.isVirtual ? data.virtualTypology : centreDetails?.categorie_label}
            />

            <Dialog open={showReferentielDialog} onOpenChange={setShowReferentielDialog}>
                <DialogContent className="max-w-none sm:max-w-[90vw] w-full sm:w-[800px] h-[85vh] p-0 overflow-hidden flex flex-col bg-white">
                    <DialogHeader className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex-shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-100" />
                            Référentiel Temps
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col p-4 bg-slate-50/50">
                        {/* Filters for Referential */}
                        <div className="flex flex-wrap items-center gap-4 mb-3 bg-white p-2 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Famille:</span>
                                <select
                                    className="bg-slate-50 border border-slate-200 text-[11px] text-slate-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[200px]"
                                    value={refFilterFamille}
                                    onChange={e => setRefFilterFamille(e.target.value)}
                                >
                                    <option value="">Toutes ({uniqueRefFamilles.length})</option>
                                    {uniqueRefFamilles.map(f => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Prestation:</span>
                                <select
                                    className="bg-slate-50 border border-slate-200 text-[11px] text-slate-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[150px]"
                                    value={refFilterPrestation}
                                    onChange={e => setRefFilterPrestation(e.target.value)}
                                >
                                    <option value="">Tous ({uniqueRefPrestations.length})</option>
                                    {uniqueRefPrestations.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                            {(refFilterFamille || refFilterPrestation) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setRefFilterFamille(""); setRefFilterPrestation(""); }}
                                    className="h-7 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                    Réinitialiser
                                </Button>
                            )}
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col p-1">
                            <EnterpriseTable
                                title="Référentiel Temps Complet"
                                subtitle={
                                    <div className="flex items-center gap-2">
                                        <span>Base de calcul unitaire</span>
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                            {filteredReferentielTasks.length} tâches affichées
                                        </Badge>
                                    </div>
                                }
                                tooltip="Temps moyen nécessaire par unité (colis, sac, etc.)"
                                icon={Clock}
                                columns={[
                                    { key: 'p', label: 'Prestation', align: 'left', width: '100px', ellipsis: true },
                                    { key: 'f', label: 'Famille', align: 'left', width: '120px', ellipsis: true },
                                    { key: 't', label: 'Tâche', align: 'left', ellipsis: true },
                                    { key: 'r1', label: 'Responsable 1', align: 'left', width: '100px', ellipsis: true },
                                    { key: 'r2', label: 'Responsable 2', align: 'left', width: '100px', ellipsis: true },
                                    { key: 'u', label: 'Unité', align: 'left', width: '80px', ellipsis: true },
                                    { key: 's', label: 'Sec', align: 'right', width: '60px', render: (val) => Number(val || 0).toFixed(2) }
                                ]}
                                data={filteredReferentielTasks.map((task, i) => ({
                                    p: getFirstWord(task.produit) || "-",
                                    f: task.famille || "",
                                    t: task.task_name,
                                    r1: task.resp1,
                                    r2: task.resp2,
                                    u: task.unite_mesure,
                                    s: Number(task.moy_sec) || 0
                                }))}
                                currentView="table"
                                onViewChange={() => { }}
                                showViewToggle={true}
                                enableExport={true}
                                height="100%"
                                searchEnabled={true}
                                searchFields={['p', 'f', 't', 'u']}
                                showFilters={true}
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
