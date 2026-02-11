import React, { useState, useEffect, useRef } from "react";
import * as XLSX from 'xlsx';
import {
    Download,
    Package,
    Calculator,
    Truck,
    Clock,
    Timer,
    Info,
    User,
    Upload,
    Gauge,
    Box,
    Eye,
    EyeOff,
    CheckCircle2,
    TrendingUp,
    TrendingDown,
    Users,
    Globe,
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/Card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/Select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import OrganizationalChart from "@/components/centres_uniq/OrganizationalChart";
import { formatHoursMinutes } from "@/utils/formatters";

const CNDP_CENTRE_ID = 1965;

const DEFAULT_PARAMS = {
    pct_sac: 60,
    pct_ed: 40,
    pct_retenue: 1,
    pct_echantillon: 5,
    colis_par_sac: 5,
    nb_jours_ouvres_an: 264,
    productivite: 100,
    heures_par_jour: 8,
    idle_minutes: 0,
    shift: 1,
};

const isMoiPoste = (p) => {
    if (!p) return false;
    const type = (p.type_poste || "").toUpperCase();
    const label = (p.label || "").toUpperCase();
    // CNDP Specific: Check types identifying 'Management', 'Support' or specific codes if needed
    return type === "MOI" || type === "INDIRECT" || type === "STRUCTURE" || label.includes("RESPONSABLE") || !!p.is_moi;
};

const FormattedInput = ({ value, onChange, className, placeholder }) => {
    const formatNumber = (val) => {
        if (val === "" || val === null || val === undefined) return "";
        const num = Number(val);
        if (isNaN(num)) return val;
        return num.toLocaleString("fr-FR");
    };

    const handleChange = (e) => {
        const rawValue = e.target.value.replace(/[\s\u00A0\u202F]/g, '');
        if (/^\d*$/.test(rawValue)) {
            onChange(rawValue);
        }
    };

    return (
        <Input
            type="text"
            className={className}
            placeholder={placeholder}
            value={formatNumber(value)}
            onChange={handleChange}
        />
    );
};

/* ===================== KPI COMPONENTS (MATCHING BANDOENG) ===================== */
const EffectifFooter = ({ totalLabel, totalValue, modValue, moiValue, apsLabel, apsValue }) => (
    <div className="text-[10px] text-slate-600 space-y-1.5">
        {(totalValue !== undefined && totalValue !== null) && (
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-slate-50 px-2 py-1">
                {totalLabel && <span className="font-semibold text-slate-700">{totalLabel}</span>}
                <span className="px-2 py-0.5 rounded-full bg-white text-slate-800 font-semibold shadow-sm text-center min-w-[80px]">Total : {totalValue}</span>
            </div>
        )}
        <div className="flex items-center justify-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#005EA8] font-bold shadow-sm border border-blue-100/50 min-w-[70px] text-center">MOD : {modValue}</span>
            {(moiValue !== undefined && moiValue !== null) && (
                <span className="px-2 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-700 font-bold shadow-sm border border-fuchsia-100/50 min-w-[70px] text-center">MOI : {moiValue}</span>
            )}
        </div>
        {(apsValue !== undefined && apsValue !== null) && (
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-emerald-50/70 px-2 py-1">
                <span className="font-semibold text-emerald-800">{apsLabel}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/90 text-emerald-700 font-semibold shadow-sm text-center min-w-[80px]">Total APS : {apsValue}</span>
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
                <div className="mt-1 border-t border-slate-100 pt-0.5 whitespace-nowrap overflow-x-auto no-scrollbar">{customFooter}</div>
            ) : children ? (
                <div className="mt-1 border-t border-slate-100 pt-0.5 whitespace-nowrap overflow-x-auto no-scrollbar">{children}</div>
            ) : null}
        </div>
    );
};

export default function CNDPSimulation() {
    const [postes, setPostes] = useState([]);
    const [selectedPoste, setSelectedPoste] = useState("");
    const [loadingPostes, setLoadingPostes] = useState(true);
    const [amanaImport, setAmanaImport] = useState("");
    const [amanaExport, setAmanaExport] = useState("");
    const [params, setParams] = useState(DEFAULT_PARAMS);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [importMsg, setImportMsg] = useState(null);
    const fileInputRef = useRef(null);

    // State for global centre info
    const [centreInfo, setCentreInfo] = useState(null);

    useEffect(() => {
        const fetchPostes = async () => {
            setLoadingPostes(true);
            try {
                // Using dedicated CNDP postes endpoint with code_resp logic
                const response = await fetch(`/api/cndp/postes?centre_id=${CNDP_CENTRE_ID}`);
                if (!response.ok) throw new Error("Failed to fetch postes");
                const data = await response.json();
                setPostes(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error("Error fetching postes:", e);
            } finally {
                setLoadingPostes(false);
            }
        };

        const fetchCentreInfo = async () => {
            try {
                // Fetch specifically for CNDP Centre ID using new backend filter
                const response = await fetch(`/api/centres?centre_id=${CNDP_CENTRE_ID}`);
                if (!response.ok) throw new Error("Failed to fetch centres");
                const data = await response.json();

                // Expecting array with 1 item if found
                if (Array.isArray(data) && data.length > 0) {
                    setCentreInfo(data[0]);
                } else {
                    console.warn("CNDP Centre info not found");
                }
            } catch (e) {
                console.error("Error fetching centre info:", e);
            }
        };

        fetchPostes();
        fetchCentreInfo();
    }, []);

    const updateParam = (key, value) => {
        const val = Number(value) || 0;
        setParams((prev) => {
            const updates = { [key]: val };

            return { ...prev, ...updates };
        });
    };



    const heuresNettesJourCalculees = React.useMemo(() => {
        const hBase = 8; // Convention standard
        const idleH = (params.idle_minutes || 0) / 60;
        const baseProductivity = hBase * (params.productivite / 100);
        return Math.max(0, baseProductivity - idleH);
    }, [params]);

    // const isMoiPoste = (p) => {
    //     if (!p) return false;
    //     const type = (p.type_poste || "").toUpperCase();
    //     const label = (p.poste_label || p.label || "").toUpperCase();
    //     return type === "MOI" || type === "INDIRECT" || type === "STRUCTURE" || label.includes("RESPONSABLE") || !!p.is_moi;
    // };


    const handleSimulate = async () => {
        setLoading(true);
        setError(null);
        setResults(null);

        // Determine if we are simulating one poste or the whole centre
        const targetPosteId = selectedPoste && selectedPoste !== "all" ? selectedPoste : null;

        try {
            // Construct payload matching CNDPSimulateRequest Pydantic model
            const payload = {
                centre_id: CNDP_CENTRE_ID,
                poste_code: targetPosteId || null,
                volumes: {
                    amana_import: Number(amanaImport || 0),
                    amana_export: Number(amanaExport || 0)
                },
                params: {
                    pct_sac: params.pct_sac,
                    pct_ed: params.pct_ed,
                    pct_retenue: params.pct_retenue,
                    pct_echantillon: params.pct_echantillon,
                    colis_par_sac: params.colis_par_sac,
                    nb_jours_ouvres_an: params.nb_jours_ouvres_an,
                    productivite: params.productivite,
                    heures_par_jour: params.heures_par_jour,
                    idle_minutes: params.idle_minutes,
                    shift: params.shift,
                }
            };

            const res = await fetch(`/api/cndp/simulate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Erreur simulation");
            }

            const data = await res.json();
            setResults(data);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = () => {
        if (!results || !results.tasks) return;

        const data = results.tasks.map(t => ({
            "Tâche": t.task_name,
            "Unité": t.unite_mesure,
            "Source": t.volume_source,
            "Vol/Jour": Number(t.volume_journalier?.toFixed(2)),
            "Moy (min)": Number(t.moyenne_min?.toFixed(2)),
            "Heures": Number(t.heures_calculees?.toFixed(4)),
            "Formule": t.formule
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Résultats CNDP");
        XLSX.writeFile(wb, `Simulation_CNDP_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleFileImport = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportMsg({ type: "info", text: "Import en cours..." });

        const reader = new FileReader();

        reader.onload = (evt) => {
            try {
                const arrayBuffer = evt.target.result;
                const wb = XLSX.read(arrayBuffer, { type: "array" });

                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];

                const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

                console.log("✅ Imported data:", data);
                setImportMsg({ type: "success", text: `✅ Import OK (${data.length} lignes)` });

            } catch (err) {
                console.error("❌ Excel error:", err);
                setImportMsg({ type: "error", text: "❌ Erreur lecture fichier" });
            }
        };

        reader.readAsArrayBuffer(file);

        // ✅ Important: reset input pour permettre re-upload du même fichier
        e.target.value = "";
    };


    // Helpers / Computed for Logic
    const selectedPosteObj = React.useMemo(() => {
        if (!selectedPoste || selectedPoste === "all") return null;
        return postes.find(p => p.code === selectedPoste);
    }, [selectedPoste, postes]);

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

    const totalApsGlobal = React.useMemo(() => {
        if (centreInfo) {
            return Number(centreInfo.t_aps_global || centreInfo.aps_legacy || 0);
        }
        return 0;
    }, [centreInfo]);

    const isMOD = selectedPosteObj ? !isMoiPoste(selectedPosteObj) : true; // Default to MOD treatment if all selected (usually)

    // Calculated values for Footer
    // Calculated values from simulation
    const fteCalculated = results?.fte_calcule || 0;
    const fteArrondi = results?.fte_arrondi || 0;

    // Base values for display (Global or Intervenant)
    // Similar to Bandoeng's centreDetails vs computed fallbacks
    const displayMOD = Number(centreInfo?.mod_global ?? totalModGlobal ?? 0);
    const displayMOI = Number(centreInfo?.moi_global ?? totalMoiGlobal ?? 0);
    const displayAPS = Number(centreInfo?.aps ?? totalApsGlobal ?? 0);
    const displayStatutaire = displayMOD + displayMOI;
    const displayTotal = displayStatutaire + displayAPS;

    // Logique APS Calculé (Demandé par User: Cible Final vs Actuel)
    // Strict mirror of Bandoeng logic
    const statutaireCible = (isMOD ? fteArrondi : 0) + displayMOI;
    const ecartCible = statutaireCible - displayStatutaire;
    const apsCalculeDisplay = ecartCible > 0 ? ecartCible : 0;

    const formatSmallNumber = (v) => Number(v || 0).toFixed(2).replace('.', ',');

    // --- ORG CHART DATA PREPARATION ---

    const orgChartData = React.useMemo(() => {
        if (!results || !postes.length) return null;

        // Chef de centre Logic
        const chefKeywords = ["CHEF DE CENTRE", "DIRECTEUR", "RESPONSABLE SITE"];
        const chefPoste = postes.find(p => {
            const name = (p.label || "").toUpperCase();
            return chefKeywords.some(k => name.includes(k));
        });

        const chef = {
            name: chefPoste ? (chefPoste.label || "Chef de Centre") : "Chef de Centre",
            effectif: chefPoste ? Math.round(Number(chefPoste.effectif_actuel || 0) || 1) : 1
        };

        const isChef = (name) => {
            const n = (name || "").toUpperCase();
            return chefKeywords.some(k => n.includes(k));
        };

        // MOI Staff (Static list from Postes)
        const moiStaff = postes
            .filter(p => isMoiPoste(p))
            .map(p => ({
                name: p.label || "Poste MOI",
                effectif: Math.round(Number(p.effectif_actuel || 0)),
                type: p.type_poste,
                category: p.categorie || "Non défini"
            }))
            .filter(s => s.effectif > 0 && !isChef(s.name));

        // MOD Staff (Dynamic from Results)
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
                            category: posteOrigine?.categorie || "OPERATION"
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
                    effectif: Math.round(proportionalEffectif)
                };
            });

        return {
            chef,
            moiStaff,
            modStaff: modStaffWithEffectif
        };
    }, [results, postes]);

    return (
        <div className="h-screen bg-gradient-to-b from-white to-slate-50/70 p-2 font-sans text-slate-900 flex flex-col overflow-hidden">
            <div className="max-w-[1600px] w-full mx-auto flex flex-col h-full gap-2">

                {/* Header */}
                <Card className="bg-white/60 backdrop-blur-md border-slate-200/60 shadow-sm shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#005EA8]" />
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-[#005EA8]/50 to-[#0A6BBC]/50" />

                    <CardContent className="px-4 py-2 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col pl-2">
                                <h1 className="text-sm font-bold text-[#005EA8] tracking-tight leading-none mb-0.5">
                                    Simulation des Effectifs-CNDP
                                </h1>
                                <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="text-[#0A6BBC]">Region Casa</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                    Centre National de Dedouanement Postal
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 min-w-[280px]">
                            <div className="flex flex-col flex-1 relative group">
                                <Label className="absolute -top-1.5 left-2 px-1 text-[9px] font-bold text-[#005EA8] uppercase tracking-wider bg-white/50 backdrop-blur z-10 transition-colors group-hover:text-[#0A6BBC]">
                                    Intervenant
                                </Label>
                                <Select value={selectedPoste || "all"} onValueChange={(val) => setSelectedPoste(val === "all" ? "" : val)} disabled={loadingPostes}>
                                    <SelectTrigger className="h-8 text-xs font-semibold bg-white/50 border-slate-200 hover:border-[#005EA8]/30 hover:bg-blue-50/30 transition-all shadow-sm focus:ring-2 focus:ring-[#005EA8]/20 pl-3">
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <div className="p-0.5 rounded bg-blue-50 text-[#005EA8]">
                                                <User className="w-3 h-3" />
                                            </div>
                                            <SelectValue placeholder="-- Tous les intervenants --" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs font-medium">-- Tous les intervenants --</SelectItem>
                                        {postes.map((p) => (
                                            <SelectItem key={p.id} value={p.code} className="text-xs font-medium py-2 focus:bg-slate-50">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-semibold text-slate-700 uppercase tracking-tight">{p.label || p.nom}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Control Bars */}
                <div className="flex flex-col gap-1.5 shrink-0">
                    {/* Row 1: Params */}
                    <Card className="bg-white/80 backdrop-blur-md border-slate-200/60 shadow-sm">
                        <CardContent className="px-3 py-2">
                            <div className="flex items-center gap-4 w-full">
                                {/* Groupe 1: Params Flux */}
                                <div className="flex gap-1 border-r border-slate-200 pr-1 flex-[3]">
                                    <div className="flex items-center gap-1.5 min-w-[80px] flex-1">
                                        <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                            <span className="text-[8px] font-bold">%</span>
                                        </div>
                                        <div className="flex flex-col w-full">
                                            <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">Part SAC</Label>
                                            <FormattedInput
                                                value={params.pct_sac}
                                                onChange={(val) => updateParam("pct_sac", val)}
                                                className="h-6 bg-transparent text-xs font-semibold text-slate-800 !border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-center p-0"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 min-w-[80px] flex-1">
                                        <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                            <Box className="w-2.5 h-2.5" />
                                        </div>
                                        <div className="flex flex-col w-full">
                                            <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">Part ED</Label>
                                            <FormattedInput
                                                value={params.pct_ed}
                                                onChange={(val) => updateParam("pct_ed", val)}
                                                className="h-6 bg-transparent text-xs font-semibold text-slate-800 !border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-center p-0"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 min-w-[80px] flex-1">
                                        <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                            <span className="text-[8px] font-bold">#</span>
                                        </div>
                                        <div className="flex flex-col w-full">
                                            <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">Colis/Sac</Label>
                                            <FormattedInput
                                                value={params.colis_par_sac}
                                                onChange={(val) => updateParam("colis_par_sac", val)}
                                                className="h-6 bg-transparent text-xs font-semibold text-slate-800 !border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-center p-0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Groupe 2: Productivité */}
                                <div className="flex gap-1 border-r border-slate-200 pr-1 flex-[2]">
                                    <div className="flex items-center gap-1.5 min-w-[100px] flex-1">
                                        <div className="w-5 h-5 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                                            <Gauge className="w-2.5 h-2.5" />
                                        </div>
                                        <div className="flex flex-col w-full">
                                            <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">Productivité</Label>
                                            <FormattedInput
                                                value={params.productivite}
                                                onChange={(val) => updateParam("productivite", val)}
                                                className="h-6 bg-transparent text-xs font-semibold text-slate-800 !border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-center p-0"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 min-w-[100px] flex-1">
                                        <div className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                            <Clock className="w-2.5 h-2.5" />
                                        </div>
                                        <div className="flex flex-col w-full">
                                            <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">Temps Mort</Label>
                                            <FormattedInput
                                                value={params.idle_minutes}
                                                onChange={(val) => updateParam("idle_minutes", val)}
                                                className="h-6 bg-transparent text-xs font-semibold text-slate-800 !border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-center p-0"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 min-w-[80px] flex-1">
                                        <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                            <Users className="w-2.5 h-2.5" />
                                        </div>
                                        <div className="flex flex-col w-full">
                                            <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">Shift</Label>
                                            <Select
                                                value={String(params.shift)}
                                                onValueChange={(val) => updateParam("shift", val)}
                                            >
                                                <SelectTrigger className="h-6 bg-transparent text-xs font-semibold text-slate-800 !border-0 focus:ring-0 focus:ring-offset-0 text-center p-0 justify-center">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1" className="text-xs font-medium justify-center">1</SelectItem>
                                                    <SelectItem value="2" className="text-xs font-medium justify-center">2</SelectItem>
                                                    <SelectItem value="3" className="text-xs font-medium justify-center">3</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* Capacité Nette - User Requested Design */}
                                <div className="flex gap-2 min-w-[140px] items-center justify-center bg-white/50 rounded-xl border border-slate-200/60 px-3 py-1 shadow-sm">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                                            <Clock className="w-3 h-3" />
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="text-[9px] font-bold text-[#005EA8] uppercase tracking-wider text-center">
                                                Capacité Nette
                                            </label>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xl font-extrabold text-slate-800 tracking-tight leading-none">
                                                    {formatHoursMinutes(heuresNettesJourCalculees)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Row 2: Flux + Actions */}
                    <Card className="bg-white/60 backdrop-blur-md border-slate-200/60 shadow-sm transition-all">
                        <CardContent className="px-3 py-1.5">
                            <div className="flex items-center gap-4 justify-between">
                                {/* Flux Amana - Enhanced */}
                                <div className="flex items-center gap-3 border border-slate-200 rounded-lg px-3 py-1.5 relative hover:border-[#005EA8]/40 transition-all group flex-1">
                                    <Badge className="absolute -top-2 left-4 bg-gradient-to-r from-[#005EA8] to-[#0A6BBC] text-white border-0 text-[8px] font-bold uppercase tracking-wider shadow-sm px-1.5 py-0">
                                        FLUX AMANA
                                    </Badge>

                                    <div className="flex items-center gap-2 min-w-[110px] flex-1 mt-1">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-[#005EA8] group-hover:text-white transition-colors">
                                            <Package className="w-3 h-3" />
                                        </div>
                                        <div className="flex flex-col w-full">
                                            <Label className="text-[9px] font-bold text-slate-700 uppercase tracking-wider text-center">Import</Label>
                                            <FormattedInput
                                                value={amanaImport}
                                                onChange={(val) => setAmanaImport(val)}
                                                className="h-6 bg-white/60 rounded px-2 py-0.5 text-xs font-bold text-slate-900 focus-visible:ring-1 focus-visible:ring-slate-400 border-slate-200 text-center"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <Separator orientation="vertical" className="h-6 bg-slate-200 mt-1" />

                                    <div className="flex items-center gap-2 min-w-[110px] flex-1 mt-1">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-[#005EA8] group-hover:text-white transition-colors">
                                            <Truck className="w-3 h-3" />
                                        </div>
                                        <div className="flex flex-col w-full">
                                            <Label className="text-[9px] font-bold text-slate-700 uppercase tracking-wider text-center">Export</Label>
                                            <FormattedInput
                                                value={amanaExport}
                                                onChange={(val) => setAmanaExport(val)}
                                                className="h-6 bg-white/60 rounded px-2 py-0.5 text-xs font-bold text-slate-900 focus-visible:ring-1 focus-visible:ring-slate-400 border-slate-200 text-center"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Button - Enhanced */}
                                <Button
                                    onClick={handleSimulate}
                                    disabled={loading}
                                    loading={loading}
                                    className="bg-gradient-to-r from-[#005EA8] to-[#0A6BBC] hover:from-[#004e8a] hover:to-[#085a9c] text-white px-4 py-1.5 rounded-lg font-bold text-xs shadow-md hover:shadow-lg transition-all transform hover:scale-105 h-9"
                                >
                                    {!loading && <Calculator className="w-3.5 h-3.5 mr-2" />}
                                    Lancer Simulation
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Results Area */}
                <div className="flex flex-col flex-1 min-h-0 gap-2">
                    {error && (
                        <Card className="bg-red-50 border-red-100 shrink-0">
                            <CardContent className="px-3 py-2 p-0">
                                <div className="text-red-600 text-xs font-medium flex items-center gap-2">
                                    <Info className="w-4 h-4" /> {error}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {!results ? (
                        <Card className="flex-1 flex flex-col items-center justify-center border-dashed border-slate-300">
                            <CardContent className="flex flex-col items-center text-slate-400 p-8">
                                <Calculator className="w-10 h-10 opacity-20 mb-2" />
                                <p className="text-sm">Lancez la simulation pour voir les résultats</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* Synthesis Block - Bandoeng Style */}
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
                                    <div className="text-lg font-bold text-slate-800">{(results.total_heures || 0).toFixed(2)}</div>
                                    <div className="text-[9px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-0.5">heures / jour</div>
                                </div>

                                {/* 1. Effectif Actuel */}
                                {(() => {
                                    let actualStatutaire = 0;
                                    let actualMOD = 0;
                                    let actualMOI = 0;
                                    let actualAPS = 0;
                                    let actualTotal = 0;

                                    if (selectedPosteObj) {
                                        const val = Number(selectedPosteObj.effectif_actuel || 0);
                                        if (isMoiPoste(selectedPosteObj)) {
                                            actualMOI = val;
                                        } else {
                                            actualMOD = val;
                                        }
                                        actualStatutaire = actualMOD + actualMOI;
                                        actualTotal = actualStatutaire;
                                    } else {
                                        actualMOD = displayMOD;
                                        actualMOI = displayMOI;
                                        actualAPS = displayAPS;
                                        actualStatutaire = displayStatutaire;
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
                                            {(!selectedPoste || selectedPoste === "all") && (
                                                <EffectifFooter
                                                    totalLabel="Statutaire"
                                                    totalValue={Math.round(actualStatutaire)}
                                                    modValue={Math.round(actualMOD)}
                                                    moiValue={Math.round(actualMOI)}
                                                    apsLabel="APS"
                                                    apsValue={Math.round(actualAPS)}
                                                />
                                            )}
                                        </KPICardGlass>
                                    );
                                })()}

                                {/* 2. ETP Calculé */}
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
                                            {(!selectedPoste || selectedPoste === "all") && (
                                                <EffectifFooter
                                                    modValue={formatSmallNumber(targetCalculatedMOD)}
                                                    moiValue={formatSmallNumber(targetCalculatedMOI)}
                                                />
                                            )}
                                        </KPICardGlass>
                                    );
                                })()}

                                {/* 3. ETP Final */}
                                {(() => {
                                    const targetFinalMOD = isMOD ? fteArrondi : 0;
                                    const targetFinalMOI = selectedPosteObj
                                        ? (isMoiPoste(selectedPosteObj) ? Number(selectedPosteObj.effectif_actuel || 0) : 0)
                                        : displayMOI;

                                    const totalFinal = targetFinalMOD + targetFinalMOI;

                                    let actualStatutaire = 0;
                                    if (selectedPosteObj) {
                                        actualStatutaire = Number(selectedPosteObj.effectif_actuel || 0);
                                    } else {
                                        actualStatutaire = displayStatutaire;
                                    }

                                    const apsDisplay = Math.round(apsCalculeDisplay);

                                    return (
                                        <KPICardGlass
                                            label="ETP Final"
                                            icon={CheckCircle2}
                                            tone="amber"
                                            emphasize
                                            total={Math.round(totalFinal)}
                                        >
                                            {(!selectedPoste || selectedPoste === "all") && (
                                                <EffectifFooter
                                                    totalLabel="Statutaire"
                                                    totalValue={Math.round(actualStatutaire)}
                                                    modValue={targetFinalMOD}
                                                    moiValue={formatSmallNumber(targetFinalMOI)}
                                                    apsLabel="APS"
                                                    apsValue={apsDisplay}
                                                />
                                            )}
                                        </KPICardGlass>
                                    );
                                })()}

                                {/* 4. Besoin */}
                                {(() => {
                                    const formatSigned = (val) => {
                                        const num = Number(val);
                                        if (isNaN(num)) return "0";
                                        return num > 0 ? `+${num}` : `${num}`;
                                    };

                                    const targetFinalMOD = isMOD ? fteArrondi : 0;
                                    const targetFinalMOI = selectedPosteObj
                                        ? (isMoiPoste(selectedPosteObj) ? Number(selectedPosteObj.effectif_actuel || 0) : 0)
                                        : displayMOI;
                                    const statutaireCible = targetFinalMOD + targetFinalMOI;

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
                                    const diffStatutaire = statutaireCible - actualStatutaire;

                                    const apsTarget = Math.round(apsCalculeDisplay);
                                    const apsActual = Math.round(displayAPS);
                                    const apsDelta = apsTarget - apsActual;

                                    const isIndividual = selectedPoste && selectedPoste !== "all";
                                    const valToDisplay = isIndividual ? diffStatutaire : (apsDelta > 0 ? apsDelta : 0);
                                    const tone = valToDisplay > 0 ? "rose" : "emerald";
                                    const displayTotal = isIndividual ? formatSigned(Math.round(valToDisplay)) : (valToDisplay > 0 ? `+${Math.round(valToDisplay)}` : "0");

                                    const diffMOD = targetFinalMOD - actualMOD;
                                    const diffMOI = targetFinalMOI - actualMOI;

                                    return (
                                        <KPICardGlass
                                            label="Besoin"
                                            icon={valToDisplay > 0 ? TrendingUp : CheckCircle2}
                                            tone={tone}
                                            emphasize
                                            total={displayTotal}
                                        >
                                            {(!selectedPoste || selectedPoste === "all") && (
                                                <EffectifFooter
                                                    totalLabel="Ecart Statutaire"
                                                    totalValue={formatSigned(Math.round(diffStatutaire))}
                                                    modValue={formatSigned(diffMOD)}
                                                    moiValue={formatSigned(diffMOI)}
                                                    apsLabel="Var. APS"
                                                    apsValue={formatSigned(Math.round(apsDelta))}
                                                />
                                            )}
                                        </KPICardGlass>
                                    );
                                })()}
                            </div>

                            {/* Organizational Chart Section - Displayed when results are ready and no specific filter active */}
                            {results && orgChartData && (!selectedPoste || selectedPoste === "all") && (
                                <div className="mt-1 animate-in slide-in-from-bottom-2 duration-300">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                                            >
                                                <Users className="w-4 h-4 mr-2 text-[#005EA8]" />
                                                Afficher l'Organigramme
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="w-[95vw] sm:max-w-[95vw] h-[75vh] flex flex-col overflow-hidden p-0 gap-0">
                                            <DialogHeader className="p-6 pb-2 shrink-0 bg-white/50 backdrop-blur-sm border-b border-slate-100">
                                                <DialogTitle className="flex items-center justify-between gap-2 pr-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 rounded-lg bg-blue-50 text-[#005EA8]">
                                                            <Users className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-lg font-bold text-slate-800">Organigramme du Centre</span>
                                                            <span className="text-xs font-medium text-slate-500">Structure hiérarchique et effectifs</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Centre</span>
                                                        <Badge variant="secondary" className="bg-white text-slate-900 border-slate-200">
                                                            {
                                                                ((orgChartData.chef?.effectif || 1) +
                                                                    orgChartData.moiStaff.reduce((acc, s) => acc + (s.effectif || 0), 0) +
                                                                    orgChartData.modStaff.reduce((acc, s) => acc + (s.effectif || 0), 0))
                                                            } ETP
                                                        </Badge>
                                                    </div>
                                                </DialogTitle>
                                            </DialogHeader>
                                            <div className="flex-1 w-full min-h-0 relative bg-slate-50/50">
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

                            {/* Table - Fixed Height - MAXIMIZED */}
                            <Card className="flex-1 flex flex-col min-h-0 shadow-sm mt-1">
                                {importMsg && (
                                    <div className={`px-4 py-1 text-[10px] font-medium flex items-center gap-2 ${importMsg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                                        {importMsg.text}
                                    </div>
                                )}

                                <div className="border-b border-slate-100 px-3 py-1.5 flex items-center justify-between bg-slate-50/50 shrink-0">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs">
                                        Détail des Tâches
                                        <Badge variant="secondary" className="text-[9px] h-4 px-1">{results.tasks?.length}</Badge>
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileImport} />
                                        <Button
                                            onClick={() => fileInputRef.current?.click()}
                                            variant="outline"
                                            size="sm"
                                            className="h-6 text-[10px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200/50"
                                        >
                                            <Upload className="w-2.5 h-2.5 mr-1.5" /> Importer
                                        </Button>
                                        <Button
                                            onClick={handleExportExcel}
                                            variant="outline"
                                            size="sm"
                                            className="h-6 text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200/50"
                                        >
                                            <Download className="w-2.5 h-2.5 mr-1.5" /> Exporter
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                            <TableRow className="hover:bg-slate-50 h-8">
                                                <TableHead className="text-[10px] h-8 font-semibold text-slate-500 uppercase tracking-wider">Tâche</TableHead>
                                                <TableHead className="text-[10px] h-8 font-semibold text-slate-500 uppercase tracking-wider">Unité</TableHead>
                                                <TableHead className="text-[10px] h-8 font-semibold text-slate-500 uppercase tracking-wider">Source</TableHead>
                                                <TableHead className="text-[10px] h-8 font-semibold text-slate-500 uppercase tracking-wider text-right">Vol/Jour</TableHead>
                                                <TableHead className="text-[10px] h-8 font-semibold text-slate-500 uppercase tracking-wider text-right">Temps Unit</TableHead>
                                                <TableHead className="text-[10px] h-8 font-semibold text-slate-500 uppercase tracking-wider text-left text-slate-500 max-w-[200px]">Formule</TableHead>
                                                <TableHead className="text-[10px] h-8 font-semibold text-slate-500 uppercase tracking-wider text-right text-indigo-600">Charge (h)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(results.tasks || []).map((task, idx) => (
                                                <TableRow key={idx} className="group h-8 hover:bg-blue-50/30 transition-colors">
                                                    <TableCell className="text-[11px] py-1">
                                                        <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1" title={task.task_name}>
                                                            {task.task_name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-[10px] text-slate-500 py-1">{task.unite_mesure}</TableCell>
                                                    <TableCell className="text-[10px] py-1">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[9px] font-bold uppercase tracking-wider px-1 py-0 ${task.volume_source === "EXPORT"
                                                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                                                : "bg-blue-50 text-blue-700 border-blue-100"
                                                                }`}
                                                        >
                                                            {task.volume_source}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-[11px] text-right font-mono text-slate-600 tabular-nums py-1">
                                                        {task.volume_journalier?.toFixed(1)}
                                                    </TableCell>
                                                    <TableCell className="text-[11px] text-right font-mono text-slate-600 tabular-nums py-1">
                                                        {task.moyenne_min?.toFixed(2)} <span className="text-slate-400 text-[9px]">m</span>
                                                    </TableCell>
                                                    <TableCell className="text-[10px] text-left font-mono text-slate-400 py-1 max-w-[200px] truncate" title={task.formule}>
                                                        {task.formule}
                                                    </TableCell>
                                                    <TableCell className="text-[11px] text-right font-bold text-indigo-600 font-mono bg-indigo-50/30 tabular-nums py-1">
                                                        {task.heures_calculees?.toFixed(3)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
