import React, { useState, useEffect, useRef } from "react";
import * as XLSX from 'xlsx';
import {
    Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    DialogTrigger,
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
import {
    Calculator, Save, Eye, EyeOff, User, Timer,
    Box, Gauge, CheckCircle2, Building2, Package, Mail, Clock,
    Download, Upload, Info, ChevronDown, ChevronUp, TrendingUp, TrendingDown,
    Building, RefreshCw, Map as MapIcon, Undo2, Move, MapPin, HelpCircle,
    Users, Briefcase, Layers, Globe, Flag
} from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';

import { simulateBandoeng, downloadBandoengTemplate, importBandoengVolumes, downloadBandoengTasksTemplate, importBandoengTasks } from "@/services/api";
import BandoengGrid from "@/components/centres_uniq/BandoengGrid";
import BandoengParameters from "@/components/centres_uniq/BandoengParameters";
import OrganizationalChart from "@/components/centres_uniq/OrganizationalChart";
import Tooltip from "@/components/ui/Tooltip";
import { formatHoursMinutes } from "@/utils/formatters";

const BANDOENG_CENTRE_ID = 1942;

const baseInputClass = "text-[10px] text-center !px-0.5 !py-0 leading-none h-5 font-medium text-slate-700 bg-transparent border border-transparent rounded-sm hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all placeholder:text-slate-200 disabled:opacity-60 disabled:cursor-not-allowed w-full";

const DEFAULT_PARAMS = {
    pct_sac: 60,
    colis_amana_par_canva_sac: 35, // Colis/Sac
    courriers_par_sac: 350,
    nbr_co_sac: 350,   // Courrier/Sac
    nbr_cr_sac: 400,   // CR/Caisson
    ratio_trieur: 1200,
    ratio_preparateur: 1000,
    ratio_magasinier: 800,
    // Nouveaux Paramètres
    coeff_circ: 1,
    coeff_geo: 1,
    pct_retour: 0,
    pct_collecte: 0,
    pct_axes: 0,
    pct_local: 0,
    pct_international: 0,
    pct_national: 100,
    pct_march_ordinaire: 0,
    productivite: 100,
    idle_minutes: 0,
    shift: 1
};

const FormattedInput = ({ value, onChange, className, suffix }) => {
    const formatDisplay = (val) => {
        if (val === "" || val === null || val === undefined) return "";
        const num = parseFloat(String(val).replace(',', '.'));
        if (isNaN(num)) return "";
        return Math.round(num).toLocaleString("fr-FR");
    };

    const handleChange = (e) => {
        const raw = e.target.value;
        if (/^[\d\s,.]*$/.test(raw)) {
            const clean = raw.replace(/[\s\u00A0\u202F]/g, '').replace(',', '.');
            if ((clean.match(/\./g) || []).length > 1) return; // Prevent double dots
            onChange(clean);
        }
    };

    const input = (
        <Input
            type="text"
            className={`${className} ${suffix ? 'pr-4' : ''}`}
            value={formatDisplay(value)}
            onChange={handleChange}
        />
    );

    if (suffix) {
        return (
            <div className="relative w-fit">
                {input}
                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold pointer-events-none">
                    {suffix}
                </span>
            </div>
        );
    }

    return input;
};

/* ===================== KPI COMPONENTS (MATCHING CNDP) ===================== */
const EffectifFooter = ({ totalLabel, totalValue, modValue, moiValue, apsLabel, apsValue }) => (
    <div className="text-[10px] text-slate-600 space-y-1.5">
        {totalValue && (
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-slate-50 px-2 py-1">
                {totalLabel && <span className="font-semibold text-slate-700">{totalLabel}</span>}
                <span className="px-2 py-0.5 rounded-full bg-white text-slate-800 font-semibold shadow-sm">Total : {totalValue}</span>
            </div>
        )}
        <div className="flex items-center justify-center gap-2">
            <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-[#005EA8]">MOD : {modValue}</span>
            {moiValue !== undefined && moiValue !== null && (
                <span className="px-1.5 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-700">MOI : {moiValue}</span>
            )}
        </div>
        {(apsValue !== undefined && apsValue !== null) && (
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-emerald-50/70 px-2 py-1">
                <span className="font-semibold text-emerald-800">{apsLabel}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/90 text-emerald-700 font-semibold shadow-sm">Total APS : {apsValue}</span>
            </div>
        )}
    </div>
);

const KPICardGlass = ({
    label, extraLabel, extraValue, total, icon: Icon, tone = "blue",
    emphasize = false, children, customFooter, toggleable = false, isOpen = false, onToggle,
}) => {
    const T = {
        blue: { ring: "ring-blue-300/60", halo: "from-blue-400/25", text: "text-[#005EA8]", dot: "bg-[#005EA8]" },
        amber: { ring: "ring-amber-300/60", halo: "from-amber-400/25", text: "text-amber-600", dot: "bg-amber-500" },
        cyan: { ring: "ring-cyan-300/60", halo: "from-cyan-400/25", text: "text-cyan-600", dot: "bg-cyan-500" },
        rose: { ring: "ring-rose-300/60", halo: "from-rose-400/25", text: "text-rose-600", dot: "bg-rose-500" },
        emerald: { ring: "ring-emerald-300/60", halo: "from-emerald-400/25", text: "text-emerald-600", dot: "bg-emerald-500" },
        green: { ring: "ring-emerald-300/60", halo: "from-emerald-400/25", text: "text-emerald-600", dot: "bg-emerald-500" },
        slate: { ring: "ring-slate-300/60", halo: "from-slate-400/20", text: "text-slate-700", dot: "bg-slate-500" },
        red: { ring: "ring-rose-300/60", halo: "from-rose-400/25", text: "text-rose-600", dot: "bg-rose-500" },
    }[tone] || { ring: "ring-blue-300/60", halo: "from-blue-400/25", text: "text-[#005EA8]", dot: "bg-[#005EA8]" };

    return (
        <div className={`relative overflow-hidden rounded-xl border border-white/50 bg-white/55 backdrop-blur-xl p-2 min-h-[75px] pb-2 ring-1 ${T.ring} shadow-[0_18px_55px_-18px_rgba(2,6,23,0.20)] transition-all duration-300 hover:scale-[1.02]`}>
            <div aria-hidden className={`pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full blur-2xl bg-gradient-to-br ${T.halo} to-transparent`} />
            {Icon && <Icon aria-hidden className="pointer-events-none absolute right-3 bottom-0.5 w-6 h-6 opacity-15 text-slate-700" />}

            {toggleable && onToggle && (
                <button type="button" onClick={onToggle} className="absolute right-2 top-2 z-10 inline-flex items-center justify-center rounded-full border border-white/70 bg-white/80 p-0.5 shadow-sm hover:bg-slate-50">
                    {isOpen ? <EyeOff className="w-2.5 h-2.5 text-slate-500" /> : <Eye className="w-2.5 h-2.5 text-slate-500" />}
                </button>
            )}

            <div className="text-[10px] font-semibold text-center text-slate-700 px-4 uppercase tracking-wider">{label}</div>
            <div className="mt-0.5 text-center text-lg font-extrabold text-slate-900">
                <span className={emphasize ? T.text : ""}>{total}</span>
            </div>

            {customFooter ? (
                <div className="mt-1 border-t border-slate-100 pt-0.5">{customFooter}</div>
            ) : children ? (
                <div className="mt-1 border-t border-slate-100 pt-0.5">{children}</div>
            ) : null}
        </div>
    );
};

export default function BandoengSimulation() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [postes, setPostes] = useState([]);
    const [selectedPoste, setSelectedPoste] = useState("");
    const [loadingPostes, setLoadingPostes] = useState(true);
    const fileInputRef = useRef(null);
    const taskFileInputRef = useRef(null);

    const [centreDetails, setCentreDetails] = useState(null);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoadingPostes(true);
            try {
                // Fetch Postes (Simultané)
                const [postesRes, detailsRes] = await Promise.all([
                    fetch(`/api/bandoeng/postes?centre_id=${BANDOENG_CENTRE_ID}`),
                    fetch(`/api/bandoeng/centre-details/${BANDOENG_CENTRE_ID}`)
                ]);

                if (!postesRes.ok) throw new Error("Failed to fetch postes");

                // Process Postes - Load ALL postes (MOI + MOD)
                const postesData = await postesRes.json();
                const allPostes = Array.isArray(postesData) ? postesData : [];
                setPostes(allPostes);

                // Process Centre Details
                if (detailsRes.ok) {
                    const detailsData = await detailsRes.json();
                    setCentreDetails(detailsData);
                }

            } catch (e) {
                console.error("Error loading initial data:", e);
                toast.error("Erreur chargement données initiales");
            } finally {
                setLoadingPostes(false);
            }
        };
        loadInitialData();
    }, []);

    // --- State pour la grille complexe ---
    const [gridValues, setGridValues] = useState({
        amana: {
            depot: {
                gc: { global: "", local: "", axes: "" },
                part: { global: "", local: "", axes: "" }
            },
            recu: {
                gc: { global: "", local: "", axes: "" },
                part: { global: "", local: "", axes: "" }
            }
        },
        cr: {
            med: { global: "", local: "", axes: "" },
            arrive: { global: "", local: "", axes: "" }
        },
        co: {
            med: { global: "", local: "", axes: "" },
            arrive: { global: "", local: "", axes: "" }
        },
        ebarkia: {
            med: "",
            arrive: ""
        },
        lrh: {
            med: "",
            arrive: ""
        }
    });

    // UI State
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isImportTasksOpen, setIsImportTasksOpen] = useState(false);

    const [params, setParams] = useState(DEFAULT_PARAMS);

    const calculateDistribution = (globalVal, pctLocal, pctAxes) => {
        const globalNum = parseFloat(String(globalVal).replace(',', '.')) || 0;
        if (globalNum === 0) return { local: "", axes: "" };

        const localVal = Math.round(globalNum * (pctLocal / 100));
        const axesVal = Math.round(globalNum * (pctAxes / 100));

        return {
            local: localVal.toString(),
            axes: axesVal.toString()
        };
    };

    const handleParamChange = (key, value) => {
        const numValue = Number(value);

        setParams(prev => {
            const updated = { ...prev, [key]: numValue };

            // Logic: Auto-balance Local/Axes
            if (key === 'pct_local') {
                updated.pct_axes = Math.max(0, 100 - numValue);
            } else if (key === 'pct_axes') {
                updated.pct_local = Math.max(0, 100 - numValue);
            } else if (key === 'pct_international') {
                updated.pct_national = Math.max(0, 100 - numValue);
            } else if (key === 'pct_national') {
                updated.pct_international = Math.max(0, 100 - numValue);
            }

            return updated;
        });

        // Auto-calculate grid if percentages change
        if (key === "pct_local" || key === "pct_axes") {
            const newPctLocal = key === "pct_local" ? numValue : Math.max(0, 100 - numValue);
            const newPctAxes = key === "pct_axes" ? numValue : Math.max(0, 100 - numValue);

            setGridValues(prev => {
                const newState = JSON.parse(JSON.stringify(prev)); // Deep copy

                const traverseAndUpdate = (node) => {
                    if (node && typeof node === 'object') {
                        if ("global" in node && "local" in node && "axes" in node) {
                            const { local, axes } = calculateDistribution(node.global, newPctLocal, newPctAxes);
                            node.local = local;
                            node.axes = axes;
                        } else {
                            Object.values(node).forEach(child => traverseAndUpdate(child));
                        }
                    }
                };

                traverseAndUpdate(newState);
                return newState;
            });
        }
    };

  

    const heuresNettesJourCalculees = React.useMemo(() => {
        const hBase = 8; // Convention standard
        const idleH = (params.idle_minutes || 0) / 60;
        const baseProductivity = hBase * (params.productivite / 100);
        return Math.max(0, baseProductivity - idleH);
    }, [params]);

    const handleGridChange = (pathArray, value) => {
        setGridValues(prev => {
            const newState = { ...prev };
            let current = newState;
            for (let i = 0; i < pathArray.length - 1; i++) {
                current = current[pathArray[i]];
            }
            const lastKey = pathArray[pathArray.length - 1];
            current[lastKey] = value;

            // Auto-calculation if Global changes
            if (lastKey === "global") {
                const { local, axes } = calculateDistribution(value, params.pct_local, params.pct_axes);
                current["local"] = local;
                current["axes"] = axes;
            }

            // Reverse Auto-calculation if Local or Axes changes
            if (lastKey === "local" || lastKey === "axes") {
                const localVal = parseFloat(String(current["local"]).replace(',', '.')) || 0;
                const axesVal = parseFloat(String(current["axes"]).replace(',', '.')) || 0;
                const newGlobal = Math.round(localVal + axesVal);
                current["global"] = newGlobal.toString();
            }

            return newState;
        });
    };

    const sumValues = (paths) => {
        let total = 0;
        paths.forEach(pathArray => {
            let current = gridValues;
            for (const key of pathArray) {
                if (current && current[key] !== undefined) {
                    current = current[key];
                } else {
                    current = 0;
                    break;
                }
            }
            const val = parseFloat(current);
            if (!isNaN(val)) total += val;
        });
        return total;
    };

    const handleSimulate = async () => {
        setLoading(true);
        try {
            const co_export_total = sumValues([["co", "med", "global"], ["co", "med", "local"], ["co", "med", "axes"]]);
            const co_import_total = sumValues([["co", "arrive", "global"], ["co", "arrive", "local"], ["co", "arrive", "axes"]]);
            const cr_export_total = sumValues([["cr", "med", "global"], ["cr", "med", "local"], ["cr", "med", "axes"]]);
            const cr_import_total = sumValues([["cr", "arrive", "global"], ["cr", "arrive", "local"], ["cr", "arrive", "axes"]]);
            const colis_export = sumValues([
                ["amana", "depot", "gc", "global"], ["amana", "depot", "gc", "local"], ["amana", "depot", "gc", "axes"],
                ["amana", "depot", "part", "global"], ["amana", "depot", "part", "local"], ["amana", "depot", "part", "axes"]
            ]);
            const colis_import = sumValues([
                ["amana", "recu", "gc", "global"], ["amana", "recu", "gc", "local"], ["amana", "recu", "gc", "axes"],
                ["amana", "recu", "part", "global"], ["amana", "recu", "part", "local"], ["amana", "recu", "part", "axes"]
            ]);
            const gare_export = parseFloat(gridValues.ebarkia?.med || 0);
            const gare_import = parseFloat(gridValues.ebarkia?.arrive || 0);

            const payload = {
                centre_id: BANDOENG_CENTRE_ID,
                poste_code: selectedPosteObj ? selectedPosteObj.code : null,
                volumes: {
                    amana_import: colis_import,
                    amana_export: colis_export,
                    courrier_ordinaire_import: co_import_total,
                    courrier_ordinaire_export: co_export_total,
                    courrier_recommande_import: cr_import_total,
                    courrier_recommande_export: cr_export_total,
                    gare_import: gare_import,
                    gare_export: gare_export,
                    presse_import: 0,
                    presse_export: 0,
                    grid_values: gridValues // Passing detailed grid for backend logic
                },
                params: {
                    ...params
                }
            };

            const data = await simulateBandoeng(payload);
            setResults(data);
            toast.success(`Besoin total calculé : ${data.total_ressources_humaines} ETP`);
        } catch (error) {
            console.error("Simulation error:", error);
            toast.error("Echec de la simulation");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            await downloadBandoengTemplate();
            toast.success("Modèle téléchargé avec succès");
        } catch (error) {
            toast.error("Erreur téléchargement modèle");
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading("Importation en cours...");
        try {
            const data = await importBandoengVolumes(file);
            if (data) {
                setGridValues(data); // Update grid with imported values
                toast.success("Volumes importés avec succès", { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de l'importation", { id: toastId });
        } finally {
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleExportExcel = () => {
        if (!results || !results.tasks) return;

        const data = results.tasks.map(t => ({
            "Tâche": t.task_name,
            "Unité": t.unite_mesure,
            "Produit": t.produit,
            "Vol/Jour": Number(t.volume_journalier?.toFixed(2)),
            "Moy (min)": Number(t.moyenne_min?.toFixed(2)),
            "Heures": Number(t.heures_calculees?.toFixed(4)),
            "Formule": t.formule
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Résultats Bandoeng");
        XLSX.writeFile(wb, `Simulation_Bandoeng_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleDownloadTasksTemplate = async () => {
        try {
            await downloadBandoengTasksTemplate();
            toast.success("Modèle tâches téléchargé avec succès");
        } catch (error) {
            toast.error("Erreur téléchargement modèle tâches");
        }
    };

    const handleTaskFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading("Importation des tâches en cours...");
        try {
            // Pass the BANDOENG_CENTRE_ID to the API
            const data = await importBandoengTasks(file, BANDOENG_CENTRE_ID);
            if (data && data.success) {
                const dupMsg = data.duplicate_count > 0 ? `, ${data.duplicate_count} dupliquée(s)` : "";
                toast.success(
                    `${data.updated_count} tâche(s) mise(s) Ã  jour${dupMsg}. ${data.not_found_count} non trouvée(s).`,
                    { id: toastId, duration: 5000 }
                );
                if (data.errors && data.errors.length > 0) {
                    console.warn("Erreurs d'importation:", data.errors);
                    toast.error(`${data.errors.length} erreurs (voir console)`, { duration: 5000 });
                }
                // Close dialog on success
                setIsImportTasksOpen(false);

                // Refresh data by re-running simulation
                if (gridValues) {
                    handleSimulate();
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de l'importation des tâches", { id: toastId });
        } finally {
            if (taskFileInputRef.current) taskFileInputRef.current.value = "";
        }
    };

    // Helper pour formater petits nombres
    const formatSmallNumber = (v) => Number(v || 0).toFixed(2).replace('.', ',');

    // Calculer effectif actuel total
    const currentEffectif = React.useMemo(() => {
        if (selectedPoste && selectedPoste !== "all") {
            const p = postes.find(x => String(x.id) === String(selectedPoste));
            return p ? Number(p.effectif_actuel || 0) : 0;
        }
        return postes.reduce((acc, p) => acc + Number(p.effectif_actuel || 0), 0);
    }, [selectedPoste, postes]);

    // Calculer totaux MOI/MOD
    const isMoiPoste = (p) => {
        if (!p) return false;
        const type = (p.type_poste || "").toUpperCase();
        const label = (p.label || "").toUpperCase();
        return type === "MOI" || type === "INDIRECT" || type === "STRUCTURE" || label.includes("RESPONSABLE") || !!p.is_moi;
    };

    const totalMoiGlobal = React.useMemo(() => {
        return postes.reduce((acc, p) => {
            return acc + (isMoiPoste(p) ? Number(p.effectif_actuel || 0) : 0);
        }, 0);
    }, [postes]);

    const totalModGlobal = React.useMemo(() => {
        return postes.reduce((acc, p) => {
            return acc + (!isMoiPoste(p) ? Number(p.effectif_actuel || 0) : 0);
        }, 0);
    }, [postes]);

    const selectedPosteObj = React.useMemo(() => {
        if (!selectedPoste || selectedPoste === "all") return null;
        return postes.find(p => String(p.id) === String(selectedPoste));
    }, [selectedPoste, postes]);

    const isMOD = selectedPosteObj ? !isMoiPoste(selectedPosteObj) : true;

    const fteCalculated = results?.fte_calcule || 0;
    const fteArrondi = results?.fte_arrondi || 0;

    const effActuelMOD = selectedPosteObj
        ? (isMOD ? Number(selectedPosteObj.effectif_actuel || 0) : 0)
        : totalModGlobal;



    const effActuelTotal = currentEffectif;
    const apsValue = 0; // Bandoeng n'a pas d'APS pour l'instant (fallback)
    const etpCalculeTotal = (isMOD ? fteCalculated : 0) + totalMoiGlobal;

    // Valeurs sécurisées pour l'affichage
    const displayTotal = centreDetails ? (centreDetails.total_global + (centreDetails.aps || 0)) : (effActuelTotal + apsValue);
    const displayStatutaire = centreDetails ? centreDetails.total_global : effActuelTotal;
    const displayMOD = centreDetails ? centreDetails.mod_global : effActuelMOD;
    const displayMOI = centreDetails ? centreDetails.moi_global : totalMoiGlobal;
    const displayAPS = centreDetails ? (centreDetails.aps || 0) : apsValue;

    // Logique APS Calculé (Demandé par User: Cible Final vs Actuel)
    // APS = (Cible - Actuel) > 0 ? (Cible - Actuel) : 0
    const statutaireCible = (isMOD ? fteArrondi : 0) + displayMOI;
    const ecartCible = statutaireCible - displayStatutaire;

    const apsCalculeDisplay = ecartCible > 0 ? ecartCible : 0;

    // Prepare Organizational Chart Data
    const orgChartData = React.useMemo(() => {
        if (!results || !centreDetails) return null;

        // Chef de centre
        // Chef de centre - Determine specifically
        const chefPoste = postes.find(p => {
            const name = (p.label || p.nom_poste || "").toUpperCase();
            const keywords = ["CHEF DE CENTRE", "DIRECTEUR DE CENTRE", "RESPONSABLE DE CENTRE"];
            return keywords.some(k => name.includes(k));
        });

        const chef = {
            name: centreDetails.responsable || "Chef de Centre",
            effectif: chefPoste ? Math.round(Number(chefPoste.effectif_actuel || 0) || 1) : 1
        };

        // Helper to identify Chef
        const isChef = (name, role = "") => {
            const n = (name || "").toUpperCase();
            const r = (role || "").toUpperCase();
            const keywords = ["CHEF DE CENTRE", "DIRECTEUR DE CENTRE", "RESPONSABLE DE CENTRE"];
            return keywords.some(k => n.includes(k) || r.includes(k));
        };

        // MOI: Postes existants
        const moiStaff = postes
            .filter(p => isMoiPoste(p))
            .map(p => ({
                name: p.label || p.nom_poste || "Poste MOI",
                effectif: Math.round(Number(p.effectif_actuel || 0)),
                type: p.type_poste,
                category: p.categorie || "Non défini"
            }))
            .filter(s => s.effectif > 0 && !isChef(s.name)); // Filter Chef out

        // MOD: Responsables des tâches calculées
        const modMap = new Map();
        if (results.tasks && Array.isArray(results.tasks)) {
            results.tasks.forEach(task => {
                if (task.responsable && task.centre_poste_id) {
                    const responsable = task.responsable.trim();

                    // Skip generic or invalid names
                    if (!responsable || responsable === "0" || responsable === "." || responsable.toLowerCase().includes("non défini")) return;

                    // Skip Chef (Deduplication)
                    if (isChef(responsable)) return;

                    if (!modMap.has(responsable)) {
                        // Tenter de trouver le poste pour la catégorie
                        const posteOrigine = postes.find(p => (p.label || "").trim() === responsable);

                        modMap.set(responsable, {
                            name: responsable,
                            heures: 0,
                            tasks: [],
                            category: posteOrigine?.categorie || "Non défini"
                        });
                    }
                    const entry = modMap.get(responsable);
                    entry.heures += (task.heures_calculees || 0);
                    entry.tasks.push(task.task_name);
                }
            });
        }

        // Calculate effectif for each MOD responsable using KPI logic
        const totalFteCalculated = results.fte_calcule || 0;
        const totalHeures = results.total_heures || 0;

        const modStaffWithEffectif = Array.from(modMap.values())
            .filter(staff => staff.heures > 0) // Hide staff with 0 hours
            .map(staff => {
                // Calculate proportional effectif based on hours share
                const proportionalEffectif = totalHeures > 0
                    ? (staff.heures / totalHeures) * totalFteCalculated
                    : 0;

                return {
                    ...staff,
                    effectif: Math.round(proportionalEffectif) // Round to whole number
                };
            });

        return {
            chef,
            moiStaff,
            modStaff: modStaffWithEffectif
        };
    }, [results, centreDetails, postes]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-slate-50/70 p-2 font-sans text-slate-900 flex flex-col">
            <Toaster position="top-right" />
            <div className="max-w-[1600px] w-full mx-auto flex flex-col h-full gap-2">

                {/* Header Style VueIntervenant sticky */}
                <div className="sticky top-[57px] z-20 grid grid-cols-1 xl:grid-cols-2 gap-2">
                    {/* Barre de sélection */}
                    <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg px-3 py-1.5 flex flex-wrap items-center gap-2 transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#005EA8]" />
                        <div className="flex flex-col pl-1 pr-4">
                            <h1 className="text-sm font-bold text-[#005EA8] tracking-tight leading-none mb-0.5">
                                Simulation des Effectifs-Bandoeng
                            </h1>
                            <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="text-[#0A6BBC]">Region Casa</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                Agence Courrier Bandoeung
                            </div>
                        </div>

                        <div className="w-px h-5 bg-slate-200 hidden md:block" />

                        <div className="flex items-center gap-2 min-w-[180px] flex-1">
                            <div className="flex flex-col flex-1 relative group">
                                <label className="absolute -top-1.5 left-2 px-1 text-[8px] font-bold text-[#005EA8] uppercase tracking-wider bg-white/50 backdrop-blur z-10 transition-colors group-hover:text-[#0A6BBC]">
                                    Intervenant
                                </label>
                                <Select value={selectedPoste || "all"} onValueChange={(val) => setSelectedPoste(val === "all" ? "" : val)} disabled={loadingPostes}>
                                    <SelectTrigger className="h-7 text-[10px] font-semibold bg-white/50 border-slate-200 hover:border-[#005EA8]/30 hover:bg-blue-50/30 transition-all shadow-sm focus:ring-1 focus:ring-[#005EA8]/20 pl-2">
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <div className="p-0.5 rounded bg-blue-50 text-[#005EA8]">
                                                <User className="w-2.5 h-2.5" />
                                            </div>
                                            <SelectValue placeholder="-- Tous --" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs font-medium">-- Tous --</SelectItem>
                                        {postes.map((p) => (
                                            <SelectItem key={p.id} value={String(p.id)} className="text-xs font-medium">
                                                {p.label || p.nom || `Poste ${p.id}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Configuration & Performance */}
                    <BandoengParameters
                        params={params}
                        handleParamChange={handleParamChange}
                        netCapacity={formatHoursMinutes(heuresNettesJourCalculees)}
                    />
                </div>

                {/* Body - Vertical Layout like CNDP */}
                <div className="flex flex-col gap-1 pb-2">



                    {/* Main Content Area: Grid + Action + Results */}
                    <div className="flex flex-col gap-2 flex-1 min-h-0">
                        {/* Input Grid + Action Button */}
                        <Card className="bg-white border-slate-200 shadow-sm shrink-0">
                            <div className="flex items-center justify-between px-4 py-1 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                    <Box className="w-4 h-4 text-[#005EA8]" />
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Saisie des Volumes</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".xlsx"
                                        onChange={handleFileUpload}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadTemplate}
                                        className="h-7 text-[10px] bg-white text-slate-600 hover:text-[#005EA8] hover:border-[#005EA8]/30 px-2"
                                    >
                                        <Download className="w-3 h-3 mr-1.5" />
                                        Modèle
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-7 text-[10px] bg-white text-slate-600 hover:text-[#005EA8] hover:border-[#005EA8]/30 px-2"
                                    >
                                        <Upload className="w-3 h-3 mr-1.5" />
                                        Importer
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                </div>
                            </div>
                            <CardContent className="p-1">
                                <BandoengGrid
                                    gridValues={gridValues}
                                    handleGridChange={handleGridChange}
                                />
                            </CardContent>
                        </Card>
                        {/* Params Bar (Horizontal) */}
                        <Card className="bg-white/80 backdrop-blur-md border-slate-200/60 shadow-sm shrink-0">
                            <CardContent className="px-2 py-1">
                                <div className="flex items-center gap-4 w-full">
                                    {/* Groupe 1: Sacs & Contenants */}
                                    <div className="flex gap-1 border-r border-slate-200 pr-1 flex-[3]">
                                        <div className="flex flex-col gap-1 flex-1">
                                            <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">Colis/Sac</Label>
                                            <div className="flex items-center gap-1">
                                                <div className="w-5 h-5 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                                                    <Package className="w-3 h-3" />
                                                </div>
                                                <FormattedInput
                                                    className={baseInputClass + " w-full"}
                                                    value={params.colis_amana_par_canva_sac}
                                                    onChange={(val) => handleParamChange('colis_amana_par_canva_sac', val)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 flex-1">
                                            <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">Courrier/Sac</Label>
                                            <div className="flex items-center gap-1">
                                                <div className="w-5 h-5 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                                                    <Mail className="w-3 h-3" />
                                                </div>
                                                <FormattedInput
                                                    className={baseInputClass + " w-full"}
                                                    value={params.nbr_co_sac}
                                                    onChange={(val) => handleParamChange('nbr_co_sac', val)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 flex-1">
                                            <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">CR/Caisson</Label>
                                            <div className="flex items-center gap-1">
                                                <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                    <Box className="w-3 h-3" />
                                                </div>
                                                <FormattedInput
                                                    className={baseInputClass + " w-full"}
                                                    value={params.nbr_cr_sac}
                                                    onChange={(val) => handleParamChange('nbr_cr_sac', val)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Groupe 2: Coefficients */}
                                    <div className="flex gap-1 border-r border-slate-200 pr-1 flex-[2]">
                                        <div className="flex flex-col gap-1 flex-1">
                                            <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">Coeff Circ</Label>
                                            <div className="flex items-center gap-1">
                                                <div className="w-5 h-5 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                                                    <RefreshCw className="w-3 h-3" />
                                                </div>
                                                <Select
                                                    value={String(params.coeff_circ)}
                                                    onValueChange={(val) => handleParamChange('coeff_circ', val)}
                                                >
                                                    <SelectTrigger className={baseInputClass + " w-full px-2 text-center justify-center"}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="0.5">0,5</SelectItem>
                                                        <SelectItem value="1">1</SelectItem>
                                                        <SelectItem value="1.25">1,25</SelectItem>
                                                        <SelectItem value="1.5">1,5</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 flex-1">
                                            <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">Coeff GEO</Label>
                                            <div className="flex items-center gap-1">
                                                <div className="w-5 h-5 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                                                    <MapIcon className="w-3 h-3" />
                                                </div>
                                                <Select
                                                    value={String(params.coeff_geo)}
                                                    onValueChange={(val) => handleParamChange('coeff_geo', val)}
                                                >
                                                    <SelectTrigger className={baseInputClass + " w-full px-2 text-center justify-center"}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="0.5">0,5</SelectItem>
                                                        <SelectItem value="1">1</SelectItem>
                                                        <SelectItem value="1.25">1,25</SelectItem>
                                                        <SelectItem value="1.5">1,5</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Groupe 3: Pourcentages */}
                                    <div className="flex gap-1 border-r border-slate-200 pr-1 flex-[6]">
                                        <div className="flex flex-col gap-1 flex-1">
                                            <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">% Retour</Label>
                                            <div className="flex items-center gap-1">
                                                <div className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                                    <Undo2 className="w-3 h-3" />
                                                </div>
                                                <FormattedInput
                                                    className={baseInputClass + " w-full"}
                                                    value={params.pct_retour}
                                                    onChange={(val) => handleParamChange('pct_retour', val)}
                                                    suffix="%"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 flex-1">
                                            <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">% Collecte</Label>
                                            <div className="flex items-center gap-1">
                                                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                    <Briefcase className="w-3 h-3" />
                                                </div>
                                                <FormattedInput
                                                    className={baseInputClass + " w-full"}
                                                    value={params.pct_collecte}
                                                    onChange={(val) => handleParamChange('pct_collecte', val)}
                                                    suffix="%"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 flex-1">
                                            <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">% Axes</Label>
                                            <div className="flex items-center gap-1">
                                                <div className="w-5 h-5 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                                                    <Move className="w-3 h-3" />
                                                </div>
                                                <FormattedInput
                                                    className={baseInputClass + " w-full"}
                                                    value={params.pct_axes}
                                                    onChange={(val) => handleParamChange('pct_axes', val)}
                                                    suffix="%"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 flex-1">
                                            <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">% Local</Label>
                                            <div className="flex items-center gap-1">
                                                <div className="w-5 h-5 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                                                    <MapPin className="w-3 h-3" />
                                                </div>
                                                <FormattedInput
                                                    className={baseInputClass + " w-full"}
                                                    value={params.pct_local}
                                                    onChange={(val) => handleParamChange('pct_local', val)}
                                                    suffix="%"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 flex-1">
                                            <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">% March Ord</Label>
                                            <div className="flex items-center gap-1">
                                                <div className="w-5 h-5 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                                                    <Box className="w-3 h-3" />
                                                </div>
                                                <FormattedInput
                                                    className={baseInputClass + " w-full"}
                                                    value={params.pct_march_ordinaire}
                                                    onChange={(val) => handleParamChange('pct_march_ordinaire', val)}
                                                    suffix="%"
                                                />
                                            </div>
                                        </div>
                                        {/* % Nat input hidden as per request (default 100%) */}
                                        <div className="flex flex-col gap-1 flex-1">
                                            <Label className="text-[9px] uppercase text-slate-500 font-bold text-center">% Inter</Label>
                                            <div className="flex items-center gap-1">
                                                <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                    <Globe className="w-3 h-3" />
                                                </div>
                                                <FormattedInput
                                                    className={baseInputClass + " w-full"}
                                                    value={params.pct_international}
                                                    onChange={(val) => handleParamChange('pct_international', val)}
                                                    suffix="%"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>

                        </Card>
                        <div className="flex justify-end shrink-0">
                            <Button
                                onClick={handleSimulate}
                                disabled={loading}
                                className="bg-[#005EA8] hover:bg-[#004e8a] text-white px-6 shadow-md transition-all transform hover:scale-105"
                            >
                                {!loading && <Calculator className="w-4 h-4 mr-2" />}
                                {loading ? "Calcul en cours..." : "Lancer Simulation"}
                            </Button>
                        </div>

                        {/* Results Area */}
                        {!results ? (
                            <Card className="flex-1 flex flex-col items-center justify-center border-dashed border-slate-300">
                                <CardContent className="flex flex-col items-center text-slate-400 p-8">
                                    <Calculator className="w-10 h-10 opacity-20 mb-2" />
                                    <p className="text-sm">Lancez la simulation pour voir les résultats</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                {/* KPI Cards - CNDP Style */}
                                <div className="flex items-center gap-2 mb-0.5 px-1 shrink-0">
                                    <Gauge className="w-3.5 h-3.5 text-[#005EA8]" />
                                    <h3 className="text-xs font-semibold text-[#005EA8]">
                                        Synthèse
                                    </h3>
                                </div>

                                <div className="grid grid-cols-5 gap-2 shrink-0">
                                    {/* Charge Totale */}
                                    <div className="relative overflow-hidden rounded-xl border border-white/50 bg-white/55 backdrop-blur-xl p-2 min-h-[70px] pb-2 ring-1 ring-slate-200 shadow-sm flex flex-col items-center justify-center transition-all hover:ring-blue-200 hover:scale-[1.02] duration-300">
                                        <div className="text-[10px] font-semibold text-slate-600 mb-0.5">Charge Totale</div>
                                        <div className="text-lg font-bold text-slate-800">{(results.total_heures).toFixed(2)}</div>
                                        <div className="text-[9px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-0.5">heures / jour</div>
                                    </div>

                                    {/* Effectif Actuel */}
                                    {(() => {
                                        // Determine Actuals respecting selection
                                        let actualMOD = 0;
                                        let actualMOI = 0;
                                        let actualAPS = 0;
                                        let actualStatutaire = 0;
                                        let actualTotal = 0;

                                        if (selectedPosteObj) {
                                            // Individual view
                                            const val = Number(selectedPosteObj.effectif_actuel || 0);
                                            if (isMoiPoste(selectedPosteObj)) {
                                                actualMOI = val;
                                            } else {
                                                actualMOD = val;
                                            }
                                            // pure statutaire for sorting
                                            actualStatutaire = actualMOD + actualMOI;
                                            actualTotal = actualStatutaire; // APS ignored for individual unless specified
                                        } else {
                                            // Global view
                                            actualMOD = displayMOD;
                                            actualMOI = displayMOI;
                                            actualAPS = displayAPS;
                                            actualStatutaire = actualMOD + actualMOI;
                                            actualTotal = displayTotal;
                                        }

                                        return (
                                            <KPICardGlass
                                                label="Effectif Actuel"
                                                icon={User}
                                                tone="cyan"
                                                emphasize
                                                total={Math.round(actualTotal)}
                                            >
                                                <EffectifFooter
                                                    totalLabel="Statutaire"
                                                    totalValue={Math.round(actualStatutaire)}
                                                    modValue={Math.round(actualMOD)}
                                                    moiValue={Math.round(actualMOI)}
                                                    apsLabel="APS"
                                                    apsValue={Math.round(actualAPS)}
                                                />
                                            </KPICardGlass>
                                        );
                                    })()}

                                    {/* ETP Calculé */}
                                    {(() => {
                                        const targetCalculatedMOD = isMOD ? fteCalculated : 0;
                                        const targetCalculatedMOI = selectedPosteObj
                                            ? (isMoiPoste(selectedPosteObj) ? Number(selectedPosteObj.effectif_actuel || 0) : 0)
                                            : displayMOI;

                                        const totalCalculated = targetCalculatedMOD + targetCalculatedMOI;

                                        return (
                                            <KPICardGlass
                                                label="ETP Calculé"
                                                icon={Calculator}
                                                tone="blue"
                                                emphasize
                                                total={formatSmallNumber(totalCalculated)}
                                            >
                                                <EffectifFooter
                                                    modValue={formatSmallNumber(targetCalculatedMOD)}
                                                    moiValue={formatSmallNumber(targetCalculatedMOI)}
                                                />
                                            </KPICardGlass>
                                        );
                                    })()}

                                    {/* ETP Final */}
                                    {(() => {
                                        // Targets
                                        const targetFinalMOD = isMOD ? fteArrondi : 0;
                                        const targetFinalMOI = selectedPosteObj
                                            ? (isMoiPoste(selectedPosteObj) ? Number(selectedPosteObj.effectif_actuel || 0) : 0)
                                            : displayMOI;

                                        const totalFinal = targetFinalMOD + targetFinalMOI;

                                        // Actuals for Footer comparison
                                        let actualStatutaire = 0;
                                        if (selectedPosteObj) {
                                            const val = Number(selectedPosteObj.effectif_actuel || 0);
                                            actualStatutaire = val; // Assuming selected is either MOD or MOI, so total is just val
                                        } else {
                                            actualStatutaire = displayMOD + displayMOI;
                                        }

                                        // APS (Target)
                                        const apsDisplay = Math.round(apsCalculeDisplay);

                                        return (
                                            <KPICardGlass
                                                label="ETP Final"
                                                icon={CheckCircle2}
                                                tone="amber"
                                                emphasize
                                                total={Math.round(totalFinal)}
                                            >
                                                <EffectifFooter
                                                    totalLabel="Statutaire"
                                                    totalValue={Math.round(actualStatutaire)}
                                                    modValue={targetFinalMOD}
                                                    moiValue={formatSmallNumber(targetFinalMOI)}
                                                    apsLabel="APS"
                                                    apsValue={apsDisplay}
                                                />
                                            </KPICardGlass>
                                        );
                                    })()}

                                    {/* Besoin */}
                                    {(() => {
                                        // Cibles (Final)
                                        const targetFinalMOD = isMOD ? fteArrondi : 0;
                                        const targetFinalMOI = selectedPosteObj
                                            ? (isMoiPoste(selectedPosteObj) ? Number(selectedPosteObj.effectif_actuel || 0) : 0)
                                            : displayMOI;
                                        const statutaireCible = targetFinalMOD + targetFinalMOI;

                                        // Actuels
                                        let actualMOD = 0;
                                        let actualMOI = 0;
                                        if (selectedPosteObj) {
                                            actualMOD = isMOD ? Number(selectedPosteObj.effectif_actuel || 0) : 0;
                                            actualMOI = isMoiPoste(selectedPosteObj) ? Number(selectedPosteObj.effectif_actuel || 0) : 0;
                                        } else {
                                            actualMOD = displayMOD;
                                            actualMOI = displayMOI;
                                        }
                                        const actualStatutaire = actualMOD + actualMOI;

                                        // APS Delta (Besoin)
                                        const apsTarget = Math.round(apsCalculeDisplay);
                                        const apsActual = Math.round(displayAPS);
                                        const apsDelta = apsTarget - apsActual;

                                        // "si on a augmente l'APS" -> on affiche de combien
                                        const valToDisplay = apsDelta > 0 ? apsDelta : 0;

                                        // Footer Ecarts
                                        const diffMOD = targetFinalMOD - actualMOD;
                                        const diffMOI = targetFinalMOI - actualMOI;
                                        const diffStatutaire = statutaireCible - actualStatutaire;

                                        const formatSigned = (val) => {
                                            const num = Number(val);
                                            if (isNaN(num)) return "0";
                                            return num > 0 ? `+${num}` : `${num}`;
                                        };

                                        return (
                                            <KPICardGlass
                                                label="Besoin"
                                                icon={valToDisplay > 0 ? TrendingUp : CheckCircle2}
                                                tone={valToDisplay > 0 ? "rose" : "emerald"}
                                                emphasize
                                                total={valToDisplay > 0 ? `+${Math.round(valToDisplay)}` : "0"}
                                            >
                                                <EffectifFooter
                                                    totalLabel="Ecart Statutaire"
                                                    totalValue={formatSigned(Math.round(diffStatutaire))}
                                                    modValue={formatSigned(diffMOD)}
                                                    moiValue={formatSigned(diffMOI)}
                                                    apsLabel="Var. APS"
                                                    apsValue={formatSigned(Math.round(apsDelta))}
                                                />
                                            </KPICardGlass>
                                        );
                                    })()}

                                </div>

                                {/* Organizational Chart Section */}
                                {results && orgChartData && !selectedPosteObj && (
                                    <div className="mt-2 animate-in slide-in-from-bottom-2 duration-300">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs bg-white hover:bg-slate-50"
                                                >
                                                    <Users className="w-4 h-4 mr-2" />
                                                    Afficher l'Organigramme
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="w-[95vw] sm:max-w-[95vw] h-[75vh] flex flex-col overflow-hidden p-0 gap-0">
                                                <DialogHeader className="p-6 pb-2 shrink-0">
                                                    <DialogTitle className="flex items-center justify-between gap-2 pr-6">
                                                        <div className="flex items-center gap-2">
                                                            <Users className="w-5 h-5 text-[#005EA8]" />
                                                            Organigramme du Centre
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Centre</span>
                                                            <span className="text-sm font-bold text-slate-900">
                                                                {
                                                                    (orgChartData.chef?.effectif || 1) +
                                                                    orgChartData.moiStaff.reduce((acc, s) => acc + (s.effectif || 0), 0) +
                                                                    orgChartData.modStaff.reduce((acc, s) => acc + (s.effectif || 0), 0)
                                                                } ETP
                                                            </span>
                                                        </div>
                                                    </DialogTitle>
                                                </DialogHeader>
                                                <div className="flex-1 w-full min-h-0 relative bg-slate-50/30">
                                                    <OrganizationalChart
                                                        chefCentre={orgChartData.chef}
                                                        moiStaff={orgChartData.moiStaff}
                                                        modStaff={orgChartData.modStaff}
                                                    />
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                )}

                                {results && results.tasks && results.tasks.length > 0 && (
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 mt-1 animate-in slide-in-from-bottom-2 duration-300">
                                        {/* Table 1: Référentiel Temps */}
                                        <div className="bg-white rounded border border-slate-200 overflow-hidden flex flex-col" style={{ height: 300 }}>
                                            <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between flex-shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5 text-slate-600" />
                                                    <div className="flex items-center gap-1.5">
                                                        <h3 className="text-xs font-semibold text-slate-700">
                                                            Référentiel Temps
                                                        </h3>
                                                        <Tooltip content="Temps moyen nécessaire pour traiter une unité (colis, sacâ€¦) par responsable" position="bottom">
                                                            <HelpCircle className="w-3.5 h-3.5 text-[#005EA8] cursor-help" />
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setIsImportTasksOpen(true)}
                                                        className="h-6 text-[10px] bg-white text-slate-600 hover:text-[#005EA8] hover:border-[#005EA8]/30 px-2"
                                                    >
                                                        <Upload className="w-3 h-3 mr-1" />
                                                        Importer Tâches
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex-1 overflow-auto enterprise-scrollbar">
                                                <Table>
                                                    <TableHeader className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b-2 border-slate-300">
                                                        <TableRow className="hover:bg-slate-100 h-6">
                                                            <TableHead className="text-[9px] h-6 font-semibold uppercase tracking-wide">Famille</TableHead>
                                                            <TableHead className="text-[9px] h-6 font-semibold uppercase tracking-wide pl-2">Tâche</TableHead>
                                                            <TableHead className="text-[9px] h-6 font-semibold uppercase tracking-wide">Unité</TableHead>
                                                            <TableHead className="text-[9px] h-6 font-semibold uppercase tracking-wide">Responsable 1</TableHead>
                                                            <TableHead className="text-[9px] h-6 font-semibold uppercase tracking-wide">Responsable 2</TableHead>
                                                            <TableHead className="text-[9px] h-6 font-semibold uppercase tracking-wide text-right pr-2">Moy(sec)</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {(() => {
                                                            // Group tasks by composite key: name + produit + famille + unite + phase
                                                            const groups = {};
                                                            const allTasks = (results.tasks || []).filter(t => Number(t.heures_calculees?.toFixed(3)) > 0);

                                                            allTasks.forEach(t => {
                                                                // Create composite key for true duplicates
                                                                const key = [
                                                                    t.task_name || "",
                                                                    t.produit || "",
                                                                    t.famille || "",
                                                                    t.unite_mesure || "",
                                                                    t.phase || ""
                                                                ].join("|||");

                                                                if (!groups[key]) {
                                                                    groups[key] = { ...t, responsables: [] };
                                                                }
                                                                // Add responsable if it's not empty and not already in the list
                                                                const resp = (t.responsable || "").trim();
                                                                if (resp && resp !== "N/A" && !groups[key].responsables.includes(resp)) {
                                                                    groups[key].responsables.push(resp);
                                                                }
                                                            });

                                                            // Debug: Log tasks with multiple responsables
                                                            const multiResp = Object.entries(groups).filter(([_, task]) => task.responsables.length > 1);
                                                            if (multiResp.length > 0) {
                                                                console.log("Tasks with multiple responsables:", multiResp.map(([key, task]) => ({
                                                                    name: task.task_name,
                                                                    produit: task.produit,
                                                                    famille: task.famille,
                                                                    responsables: task.responsables
                                                                })));
                                                            } else {
                                                                console.log("No tasks with multiple responsables found. Total unique tasks:", Object.keys(groups).length);
                                                            }

                                                            return Object.values(groups).map((task, idx) => (
                                                                <TableRow key={idx} className={`border-b border-slate-100 transition-colors h-6 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/30`}>
                                                                    <TableCell className="text-[10px] py-1 text-slate-500">
                                                                        {task.famille || "-"}
                                                                    </TableCell>
                                                                    <TableCell className="text-[11px] py-1 pl-2 max-w-[150px]">
                                                                        <div className="font-medium text-slate-900 group-hover:text-amber-600 transition-colors truncate" title={task.task_name}>
                                                                            {task.task_name}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-[10px] py-1 text-slate-500">
                                                                        {task.unite_mesure || "-"}
                                                                    </TableCell>
                                                                    <TableCell className="text-[10px] py-1">
                                                                        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-slate-50 text-slate-600 border-slate-200 truncate max-w-[100px]" title={task.responsables[0]}>
                                                                            {task.responsables[0] || "-"}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-[10px] py-1">
                                                                        {task.responsables[1] && (
                                                                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-slate-50 text-slate-600 border-slate-200 truncate max-w-[100px]" title={task.responsables[1]}>
                                                                                {task.responsables[1]}
                                                                            </Badge>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-[11px] text-right font-mono text-slate-600 tabular-nums py-1 pr-2">
                                                                        {task.moy_sec?.toFixed(0)} <span className="text-slate-400 text-[9px]">s</span>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ));
                                                        })()}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                        {/* Table 2: Résultats de Simulation */}
                                        <div className="bg-white rounded border border-slate-200 overflow-hidden flex flex-col" style={{ height: 300 }}>
                                            <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between flex-shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
                                                    <div className="flex items-center gap-1.5">
                                                        <h3 className="text-xs font-semibold text-slate-700">
                                                            Résultats de Simulation
                                                            <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-2">{results.tasks?.length}</Badge>
                                                        </h3>
                                                        <Tooltip content="Volumes Ã— temps â†’ heures nécessaires par tâche" position="bottom">
                                                            <HelpCircle className="w-3.5 h-3.5 text-[#005EA8] cursor-help" />
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleExportExcel();
                                                    }}
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200/50"
                                                >
                                                    <Download className="w-2.5 h-2.5 mr-1.5" /> Exporter
                                                </Button>
                                            </div>

                                            <div className="flex-1 overflow-auto enterprise-scrollbar">
                                                <Table>
                                                    <TableHeader className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b-2 border-slate-300">
                                                        <TableRow className="hover:bg-slate-100 h-6">
                                                            <TableHead className="text-[9px] h-6 font-semibold uppercase tracking-wide pl-2">Tâche</TableHead>
                                                            <TableHead className="text-[9px] h-6 font-semibold uppercase tracking-wide text-right">Vol/Jour</TableHead>
                                                            <TableHead className="text-[9px] h-6 font-semibold uppercase tracking-wide text-right">Unit(m)</TableHead>
                                                            <TableHead className="text-[9px] h-6 font-semibold uppercase tracking-wide text-right text-indigo-600 pr-2">Charge</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {(results.tasks || []).filter(t => Number(t.heures_calculees?.toFixed(3)) > 0).map((task, idx) => (
                                                            <TableRow key={idx} className={`border-b border-slate-100 transition-colors h-6 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/30`}>
                                                                <TableCell className="text-[11px] py-1 pl-2 max-w-[180px]">
                                                                    <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors truncate" title={task.task_name}>
                                                                        {task.task_name}
                                                                    </div>
                                                                    <div className="text-[9px] text-slate-400 truncate" title={task.formule}>{task.formule}</div>
                                                                </TableCell>
                                                                <TableCell className="text-[11px] text-right font-mono text-slate-600 tabular-nums py-1">
                                                                    {task.volume_journalier?.toFixed(1)}
                                                                </TableCell>
                                                                <TableCell className="text-[11px] text-right font-mono text-slate-600 tabular-nums py-1">
                                                                    {task.moyenne_min?.toFixed(2)}
                                                                </TableCell>
                                                                <TableCell className="text-[11px] text-right font-bold text-indigo-600 font-mono bg-indigo-50/30 tabular-nums py-1 pr-2">
                                                                    {task.heures_calculees?.toFixed(3)}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>


                                    </div>
                                )}
                            </>
                        )}
                    </div>

                </div>
            </div>
            {/* Import Tasks Dialog */}
            <Dialog open={isImportTasksOpen} onOpenChange={setIsImportTasksOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-[#005EA8]">
                            <Upload className="w-5 h-5" />
                            Importation des Tâches
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-6 py-4">
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">1</span>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-semibold text-slate-800">Télécharger le modèle</h4>
                                    <p className="text-xs text-slate-500">
                                        Commencez par télécharger le fichier Excel modèle contenant les colonnes requises.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadTasksTemplate}
                                        className="h-8 text-xs mt-1 hover:text-[#005EA8] hover:bg-blue-50"
                                    >
                                        <Download className="w-3.5 h-3.5 mr-2" />
                                        Télécharger le modèle
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold shrink-0">2</span>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-semibold text-slate-800">Importer le fichier</h4>
                                    <p className="text-xs text-slate-500">
                                        Sélectionnez votre fichier rempli pour mettre Ã  jour les chronos et responsables.
                                    </p>
                                    <div className="mt-2">
                                        <input
                                            type="file"
                                            ref={taskFileInputRef}
                                            className="hidden"
                                            accept=".xlsx"
                                            onChange={handleTaskFileUpload}
                                        />
                                        <Button
                                            onClick={() => taskFileInputRef.current?.click()}
                                            className="h-8 text-xs bg-[#005EA8] hover:bg-[#004e8a] text-white"
                                        >
                                            <Upload className="w-3.5 h-3.5 mr-2" />
                                            Sélectionner un fichier
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded text-xs text-slate-500 flex gap-2">
                            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                                <p>Le système identifiera les tâches par leur Nom, Produit, Famille et Unité.</p>
                                <p className="mt-1">Si deux responsables sont renseignés, la tâche sera dupliquée automatiquement.</p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}
