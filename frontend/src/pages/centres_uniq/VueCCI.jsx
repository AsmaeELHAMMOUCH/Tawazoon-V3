import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useDebouncedValue } from "../../hooks/useDebounce";
import {
    User,
    Gauge,
    Clock,
    Table as TableIcon,
    BarChart3,
    CheckCircle2,
    ArrowRight,
    UserRound,
    Calculator,
    Package,
    Play,
    Mail,
    Archive,
    ArrowUpRight,
    TrendingUp,
    Percent,
    Sliders,
    MapPin,
    AlertCircle,
    Layers,
} from "lucide-react";
import SimulationHeader from "@/components/centres_uniq/SimulationHeader";
import { EmptyStateFirstRun } from "@/components/states/EmptyStateFirstRun";
import { EmptyStateDirty } from "@/components/states/EmptyStateDirty";
import GraphReferentielComponent from "@/components/charts/GraphReferentiel";
import GraphResultatsComponent from "@/components/charts/GraphResultats";
import EnterpriseTable from "@/components/tables/EnterpriseTable";
import "@/components/tables/EnterpriseTable.css";
import "@/styles/tooltips.css";

/* ===================== HELPERS ===================== */
const normalizeString = (str) => {
    return String(str || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
};

const formatThousands = (val) => {
    if (val === undefined || val === null || val === "") return "0";
    return String(val).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const parseNonNeg = (val) => {
    if (val === undefined || val === null || val === "") return 0;
    const clean = String(val).replace(/\s/g, '').replace(/,/g, '.');
    const n = Number(clean);
    return isNaN(n) || n < 0 ? 0 : n;
};

const toInput = (v) => (v === 0 || v === null || v === undefined ? "" : String(v));
const formatSmallNumber = (v, d = 2) => Number(v || 0).toFixed(d).replace('.', ',');
const formatUnit = (x) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(Number(x || 0));

/* ===================== UI COMPONENTS ===================== */
const Card = ({ title, children, actions, bodyClassName = "" }) => (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-lg">
        {title && (
            <header className="h-10 px-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                {actions}
            </header>
        )}
        <div className={`p-2.5 ${bodyClassName}`}>{children}</div>
    </section>
);

const KPICardGlass = ({
    label, MOD, MOI, extraLabel, extraValue, total, icon: Icon, tone = "blue",
    emphasize = false, leftLabel = "MOD", rightLabel = "MOI", children,
    customFooter, toggleable = false, isOpen = false, onToggle,
}) => {
    const T = {
        blue: { ring: "ring-blue-300/60", halo: "from-blue-400/25", text: "text-[#005EA8]", dot: "bg-[#005EA8]" },
        amber: { ring: "ring-amber-300/60", halo: "from-amber-400/25", text: "text-amber-600", dot: "bg-amber-500" },
        green: { ring: "ring-emerald-300/60", halo: "from-emerald-400/25", text: "text-emerald-600", dot: "bg-emerald-500" },
        slate: { ring: "ring-slate-300/60", halo: "from-slate-400/20", text: "text-slate-700", dot: "bg-slate-500" },
        red: { ring: "ring-rose-300/60", halo: "from-rose-400/25", text: "text-rose-600", dot: "bg-rose-500" },
    }[tone] || { ring: "ring-blue-300/60", halo: "from-blue-400/25", text: "text-[#005EA8]", dot: "bg-[#005EA8]" };

    return (
        <div className={`relative overflow-hidden rounded-2xl border border-white/50 bg-white/55 backdrop-blur-xl p-2.5 min-h-[90px] pb-3 ring-1 ${T.ring} shadow-[0_18px_55px_-18px_rgba(2,6,23,0.20)] transition-all duration-300`}>
            <div aria-hidden className={`pointer-events-none absolute -right-14 -top-14 h-28 w-28 rounded-full blur-2xl bg-gradient-to-br ${T.halo} to-transparent`} />
            {Icon && <Icon aria-hidden className="pointer-events-none absolute right-3 bottom-1 w-7 h-7 opacity-15 text-slate-700" />}

            <div className="text-[11px] font-semibold text-center text-slate-700 px-4">{label}</div>
            <div className="mt-0.5 text-center text-lg font-extrabold text-slate-900">
                <span className={emphasize ? T.text : ""}>{total}</span>
            </div>

            {customFooter ? (
                <div className="mt-1.5 border-t border-slate-100 pt-1">{customFooter}</div>
            ) : children ? (
                <div className="mt-1.5 border-t border-slate-100 pt-1">{children}</div>
            ) : ((MOD !== undefined || MOI !== undefined || extraValue !== undefined) && (
                <div className="flex justify-center gap-3 mt-0.5 text-[10px] font-medium text-slate-600">
                    {MOD !== undefined && <div>{leftLabel}: {MOD}</div>}
                    {MOI !== undefined && <div>{rightLabel}: {MOI}</div>}
                    {extraValue !== undefined && extraLabel && <div>{extraLabel}: {extraValue}</div>}
                </div>
            ))}
        </div>
    );
};

const EffectifFooter = ({ totalLabel, totalValue, modValue, moiValue, apsLabel, apsValue }) => (
    <div className="text-[10px] text-slate-600 space-y-1.5">
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-slate-50 px-2 py-1">
            <span className="font-semibold text-slate-700">{totalLabel}</span>
            <span className="px-2 py-0.5 rounded-full bg-white text-slate-800 font-semibold shadow-sm">Total : {totalValue}</span>
        </div>
        <div className="flex items-center justify-center gap-2">
            <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-[#005EA8]">MOD : {modValue}</span>
            {moiValue !== undefined && moiValue !== null && (
                <span className="px-1.5 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-700">MOI : {moiValue}</span>
            )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-emerald-50/70 px-2 py-1">
            <span className="font-semibold text-emerald-800">{apsLabel}</span>
            <span className="px-2 py-0.5 rounded-full bg-white/90 text-emerald-700 font-semibold shadow-sm">Total APS : {apsValue}</span>
        </div>
    </div>
);

const CCI_CENTRE_ID = "1952";

export default function VueCCI() {
    // ============ STATE MANAGEMENT ============
    const [loading, setLoading] = useState({});
    const [poste, setPoste] = useState("");
    const [postesOptions, setPostesOptions] = useState([]);

    // Volumes Inputs (Flux x Sens)
    const [volCoImport, setVolCoImport] = useState("");
    const [volCoExport, setVolCoExport] = useState("");
    const [volCrImport, setVolCrImport] = useState("");
    const [volCrExport, setVolCrExport] = useState("");

    // Parameters
    const [productivite, setProductivite] = useState(100);
    const [idleMinutes, setIdleMinutes] = useState(0);
    const [heuresNet, setHeuresNet] = useState(8.0);
    const [filterFamille, setFilterFamille] = useState("");
    const [tauxComplexite, setTauxComplexite] = useState(1);
    const [natureGeo, setNatureGeo] = useState(1);

    // CCI Specific Params
    const [nbrCourrierLiasseCo, setNbrCourrierLiasseCo] = useState(500);
    const [nbrCourrierLiasseCr, setNbrCourrierLiasseCr] = useState(500);

    const [courriersCoParSac, setCourriersCoParSac] = useState(2500);
    const [courriersCrParSac, setCourriersCrParSac] = useState(500);

    const [pctRetourCo, setPctRetourCo] = useState(0);
    const [pctRetourCr, setPctRetourCr] = useState(0);

    const [annotesCo, setAnnotesCo] = useState(0);
    const [annotesCr, setAnnotesCr] = useState(0);

    const [pctReclamCo, setPctReclamCo] = useState(0);
    const [pctReclamCr, setPctReclamCr] = useState(0);

    const [shiftParam, setShiftParam] = useState(1);

    // Debounced
    const debouncedProductivite = useDebouncedValue(productivite, 500);
    const debouncedIdleMinutes = useDebouncedValue(idleMinutes, 500);

    // Results
    const [referentiel, setReferentiel] = useState([]);
    const [resultats, setResultats] = useState([]); // details_taches
    const [totaux, setTotaux] = useState(null); // Global totals
    const [hasSimulated, setHasSimulated] = useState(false);
    const [simDirty, setSimDirty] = useState(false);

    // Display
    const [display, setDisplay] = useState("tableau");
    const [refDisplay, setRefDisplay] = useState("tableau");

    // ============ API CALLS ============
    useEffect(() => {
        loadPositions();
        loadReferentiel();
    }, []);

    useEffect(() => {
        if (poste) loadReferentiel();
    }, [poste]);

    // Calculate heures nettes
    useEffect(() => {
        const heuresBase = 8.0;
        const prodFactor = Number(debouncedProductivite ?? 100) / 100;
        const idleH = Number(debouncedIdleMinutes || 0) / 60;
        const hNet = Math.max(0, (heuresBase * prodFactor) - idleH);
        setHeuresNet(hNet.toFixed(2));
    }, [debouncedIdleMinutes, debouncedProductivite]);


    async function loadPositions() {
        try {
            setLoading(prev => ({ ...prev, postes: true }));
            const response = await fetch(`/api/cci/postes?centre_id=${CCI_CENTRE_ID}`);
            const data = await response.json();
            setPostesOptions(data.postes || []);
        } catch (err) {
            console.error("Error loading positions:", err);
        } finally {
            setLoading(prev => ({ ...prev, postes: false }));
        }
    }

    async function loadReferentiel() {
        try {
            const url = `/api/cci/referentiel?centre_id=${CCI_CENTRE_ID}${poste ? `&poste_id=${poste}` : ""}`;
            const response = await fetch(url);
            const data = await response.json();
            setReferentiel(data.referentiel || []);
        } catch (err) {
            console.error("Error loading referentiel:", err);
        }
    }

    const handleSimuler = useCallback(async () => {
        try {
            setLoading(prev => ({ ...prev, simulation: true }));

            // Construct Volumes UI List
            const volumes_ui = [];
            if (parseNonNeg(volCoImport) > 0) volumes_ui.push({ flux: "CO", sens: "IMPORT", volume: parseNonNeg(volCoImport) });
            if (parseNonNeg(volCoExport) > 0) volumes_ui.push({ flux: "CO", sens: "EXPORT", volume: parseNonNeg(volCoExport) });
            if (parseNonNeg(volCrImport) > 0) volumes_ui.push({ flux: "CR", sens: "IMPORT", volume: parseNonNeg(volCrImport) });
            if (parseNonNeg(volCrExport) > 0) volumes_ui.push({ flux: "CR", sens: "EXPORT", volume: parseNonNeg(volCrExport) });

            const payload = {
                centre_id: parseInt(CCI_CENTRE_ID),
                poste_id: (poste && poste !== "__ALL__") ? parseInt(poste) : null,

                volumes_ui: volumes_ui,

                productivite: parseFloat(productivite || 100),
                idle_minutes: parseFloat(idleMinutes || 0),

                // Specific Params
                nb_courrier_liasse_co: parseFloat(nbrCourrierLiasseCo || 500),
                nb_courrier_liasse_cr: parseFloat(nbrCourrierLiasseCr || 500),

                courriers_co_par_sac: parseFloat(courriersCoParSac || 2500),
                courriers_cr_par_sac: parseFloat(courriersCrParSac || 500),
                shift_param: parseFloat(shiftParam || 1),

                pct_retour_co: parseFloat(pctRetourCo || 0),
                pct_retour_cr: parseFloat(pctRetourCr || 0),

                annotes_co: parseFloat(annotesCo || 0),
                annotes_cr: parseFloat(annotesCr || 0),

                pct_reclam_co: parseFloat(pctReclamCo || 0),
                pct_reclam_cr: parseFloat(pctReclamCr || 0),
            };

            const response = await fetch("/api/cci/simulate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            setResultats(result.details_taches || []); // Individual task details

            setTotaux({
                total_heures: result.total_heures,
                fte_calcule: result.fte_calcule,
                fte_arrondi: result.fte_arrondi,
                heures_net_jour: result.heures_net_jour,
                total_moi: result.total_moi || 0,
                total_aps: result.total_aps || 0,
                total_mod_actuel: result.total_mod_actuel || 0,
                total_moi_actuel: result.total_moi_actuel || 0,
                total_aps_actuel: result.total_aps_actuel || 0,
            });

            setHasSimulated(true);
            setSimDirty(false);

        } catch (err) {
            console.error("Simulation error:", err);
        } finally {
            setLoading(prev => ({ ...prev, simulation: false }));
        }
    }, [
        poste, volCoImport, volCoExport, volCrImport, volCrExport,
        productivite, idleMinutes,
        nbrCourrierLiasseCo, nbrCourrierLiasseCr,
        courriersCoParSac, courriersCrParSac,
        pctRetourCo, pctRetourCr,
        annotesCo, annotesCr,
        pctReclamCo, pctReclamCr
    ]);

    // Dirty State Logic
    useEffect(() => {
        if (hasSimulated) setSimDirty(true);
    }, [
        volCoImport, volCoExport, volCrImport, volCrExport,
        productivite, idleMinutes,
        nbrCourrierLiasseCo, nbrCourrierLiasseCr
    ]);

    // Use Memo for Referentiel Filtered
    const referentielFiltered = useMemo(() => {
        return (referentiel || []).filter((row) => {
            const hasMin = Number(row.m ?? 0) > 0;
            const matchFamille = !filterFamille || row.famille === filterFamille;
            return hasMin && matchFamille;
        });
    }, [referentiel, filterFamille]);

    const uniqueFamilles = useMemo(() => {
        const s = new Set((referentiel || []).map(r => r.famille).filter(Boolean));
        return Array.from(s).sort();
    }, [referentiel]);

    // Prepare Intervenant Options
    const intervenantOptions = useMemo(() => {
        const base = Array.isArray(postesOptions) ? postesOptions : [];
        const cleaned = base.map(p => ({
            id: String(p.id),
            label: p.label
        }));
        cleaned.sort((a, b) => String(a.label).localeCompare(String(b.label)));
        return cleaned;
    }, [postesOptions]);


    // ============ RENDER ============
    return (
        <div className="w-full flex flex-col gap-5 pb-16" style={{ zoom: "90%" }}>
            {/* 🔹 TITRE & HEADER (Sticky) */}
            <div className="sticky top-[57px] z-30 flex flex-col gap-2">
                <SimulationHeader
                    title="Centre Colis International (CCI)"
                    region="Region Casa"
                    subtitle="Code 1952 - Simulation Dédiée"
                >
                    <div className="flex items-center gap-2 min-w-[280px] flex-1">
                        <div className="flex flex-col flex-1 relative group">
                            <label className="absolute -top-1.5 left-2 px-1 text-[8px] font-bold text-[#005EA8] uppercase tracking-wider bg-white/50 backdrop-blur z-10 transition-colors group-hover:text-[#0A6BBC]">
                                Poste de Travail
                            </label>
                            <div className="relative">
                                <select
                                    className="appearance-none bg-white/50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg pl-3 pr-8 py-1 focus:outline-none focus:ring-1 focus:ring-[#005EA8]/20 focus:border-[#005EA8]/30 w-full cursor-pointer transition-all hover:bg-white hover:border-blue-300 h-7"
                                    value={poste}
                                    onChange={(e) => setPoste(e.target.value)}
                                    disabled={loading?.postes}
                                >
                                    <option value="">Sélectionner un poste...</option>
                                    {intervenantOptions.map((p) => (
                                        <option key={p.id} value={p.id}>{p.label}</option>
                                    ))}
                                </select>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <Sliders className="w-3 h-3" />
                                </div>
                            </div>
                        </div>
                    </div>
                </SimulationHeader>

                {/* 🔹 BARRE DE CONFIGURATION (Sticky secondary) */}
                <div className="flex flex-col xl:flex-row gap-4 items-stretch">

                    {/* 2. Configuration & Performance */}
                    <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg px-3 py-2 flex-grow">
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Productivité */}
                            <div className="flex items-center gap-1.5 min-w-[100px] flex-1">
                                <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                                    <Gauge className="w-3 h-3" />
                                </div>
                                <div className="flex flex-col w-full">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                        Productivité
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min={0}
                                            max={200}
                                            value={toInput(productivite)}
                                            placeholder="100"
                                            onChange={(e) => setProductivite(parseNonNeg(e.target.value) ?? 100)}
                                            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full pr-6 text-center"
                                        />
                                        <span className="absolute right-0 top-0 text-[9px] text-slate-400 font-bold pointer-events-none">%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="w-px h-6 bg-slate-200 hidden md:block" />

                            {/* Temps Mort */}
                            <div className="flex items-center gap-1.5 min-w-[100px] flex-1">
                                <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                    <Clock className="w-3 h-3" />
                                </div>
                                <div className="flex flex-col w-full">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                        Temps mort
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min={0}
                                            value={idleMinutes}
                                            onChange={(e) => setIdleMinutes(Number(e.target.value || 0))}
                                            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full pr-8 text-center"
                                        />
                                        <span className="absolute right-0 top-0 text-[9px] text-slate-400 font-bold pointer-events-none">min</span>
                                    </div>
                                </div>
                            </div>

                            <div className="w-px h-6 bg-slate-200 hidden md:block" />

                            {/* Complexité Circulation */}
                            <div className="flex items-center gap-1.5 min-w-[90px] flex-1">
                                <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                                    <Sliders className="w-3 h-3" />
                                </div>
                                <div className="flex flex-col w-full">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                        Compl. Circ.
                                    </label>
                                    <select
                                        value={tauxComplexite}
                                        onChange={(e) => setTauxComplexite(Number(e.target.value))}
                                        className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center cursor-pointer"
                                    >
                                        <option value="1">1</option>
                                        <option value="1.25">1.25</option>
                                        <option value="1.5">1.5</option>
                                    </select>
                                </div>
                            </div>

                            <div className="w-px h-6 bg-slate-200 hidden md:block" />

                            {/* Complexité Géo */}
                            <div className="flex items-center gap-1.5 min-w-[90px] flex-1">
                                <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                                    <MapPin className="w-3 h-3" />
                                </div>
                                <div className="flex flex-col w-full">
                                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                        Compl. Géo
                                    </label>
                                    <select
                                        value={natureGeo}
                                        onChange={(e) => setNatureGeo(Number(e.target.value))}
                                        className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center cursor-pointer"
                                    >
                                        <option value="1">1</option>
                                        <option value="1.5">1.5</option>
                                    </select>
                                </div>
                            </div>

                            <div className="w-px h-6 bg-slate-200 hidden md:block" />

                            {/* Capacité Nette */}
                            <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                                    <Clock className="w-3 h-3" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[9px] font-bold text-[#005EA8] uppercase tracking-wider">
                                        Capacité Nette
                                    </label>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-lg font-extrabold text-slate-800 tracking-tight">
                                            {Number(heuresNet || 0).toFixed(2)}
                                        </span>
                                        <span className="text-[9px] font-semibold text-slate-500">h/j</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🔹 BLOC VOLUMES CCI (Juste sous la barre sticky) */}
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg p-2 flex justify-center">
                <div className="rounded-lg border border-slate-200/60 bg-white shadow-sm overflow-hidden min-w-[350px] w-full max-w-[800px]">
                    <div className="bg-gradient-to-r from-blue-50 to-white py-2 border-b border-slate-100 flex items-center justify-center gap-2">
                        <div className="p-1 rounded bg-indigo-100 text-indigo-600 shadow-sm">
                            <Package className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            Volumes CCI (Import / Export)
                        </span>
                    </div>

                    <table className="w-full text-[10px]">
                        <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-medium tracking-wide">
                                <th className="px-2 py-2 text-left font-normal uppercase text-[9px] w-1/3">Flux</th>
                                <th className="px-2 py-2 text-center font-normal uppercase text-[9px] text-blue-600 bg-blue-50/20 w-1/3">Import (Arrivée)</th>
                                <th className="px-2 py-2 text-center font-normal uppercase text-[9px] text-emerald-600 bg-emerald-50/20 w-1/3">Export (Départ)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {/* CO */}
                            <tr className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-3 py-1.5 font-bold text-[10px] text-slate-700 uppercase tracking-wider text-left border-l-2 border-indigo-500">
                                    Courrier Ordinaire (CO)
                                </td>
                                <td className="px-1 py-1 bg-blue-50/10">
                                    <input
                                        type="text"
                                        placeholder="0"
                                        value={formatThousands(volCoImport)}
                                        onChange={(e) => setVolCoImport(e.target.value.replace(/\s/g, ""))}
                                        className="text-xs text-center !px-1.5 !py-1 leading-none h-8 font-semibold text-[#005EA8] bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#005EA8] focus:ring-2 focus:ring-blue-100 transition-all w-full"
                                    />
                                </td>
                                <td className="px-1 py-1 bg-emerald-50/10">
                                    <input
                                        type="text"
                                        placeholder="0"
                                        value={formatThousands(volCoExport)}
                                        onChange={(e) => setVolCoExport(e.target.value.replace(/\s/g, ""))}
                                        className="text-xs text-center !px-1.5 !py-1 leading-none h-8 font-semibold text-emerald-700 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all w-full"
                                    />
                                </td>
                            </tr>
                            {/* CR */}
                            <tr className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-3 py-1.5 font-bold text-[10px] text-slate-700 uppercase tracking-wider text-left border-l-2 border-rose-500">
                                    Courrier Recommandé (CR)
                                </td>
                                <td className="px-1 py-1 bg-blue-50/10">
                                    <input
                                        type="text"
                                        placeholder="0"
                                        value={formatThousands(volCrImport)}
                                        onChange={(e) => setVolCrImport(e.target.value.replace(/\s/g, ""))}
                                        className="text-xs text-center !px-1.5 !py-1 leading-none h-8 font-semibold text-[#005EA8] bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#005EA8] focus:ring-2 focus:ring-blue-100 transition-all w-full"
                                    />
                                </td>
                                <td className="px-1 py-1 bg-emerald-50/10">
                                    <input
                                        type="text"
                                        placeholder="0"
                                        value={formatThousands(volCrExport)}
                                        onChange={(e) => setVolCrExport(e.target.value.replace(/\s/g, ""))}
                                        className="text-xs text-center !px-1.5 !py-1 leading-none h-8 font-semibold text-emerald-700 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all w-full"
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 🔹 PARAMETERS BAR (Thin, Aligned) */}
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                    {/* CO/Sac */}
                    <div className="flex items-center gap-1.5 min-w-[80px] flex-1">
                        <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Mail className="w-3 h-3" /></div>
                        <div className="flex flex-col w-full">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">CO/Sac</label>
                            <input type="number" value={courriersCoParSac} onChange={e => setCourriersCoParSac(Number(e.target.value))} className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center" />
                        </div>
                    </div>
                    <div className="w-px h-6 bg-slate-200 hidden md:block" />
                    {/* CR/Sac */}
                    <div className="flex items-center gap-1.5 min-w-[80px] flex-1">
                        <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"><Mail className="w-3 h-3" /></div>
                        <div className="flex flex-col w-full">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">CR/Sac</label>
                            <input type="number" value={courriersCrParSac} onChange={e => setCourriersCrParSac(Number(e.target.value))} className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center" />
                        </div>
                    </div>
                    <div className="w-px h-6 bg-slate-200 hidden md:block" />
                    {/* Liasse CO */}
                    <div className="flex items-center gap-1.5 min-w-[90px] flex-1">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><Archive className="w-3 h-3" /></div>
                        <div className="flex flex-col w-full">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Liasse CO</label>
                            <input type="number" value={nbrCourrierLiasseCo} onChange={e => setNbrCourrierLiasseCo(Number(e.target.value))} className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center" />
                        </div>
                    </div>
                    <div className="w-px h-6 bg-slate-200 hidden md:block" />
                    {/* Liasse CR */}
                    <div className="flex items-center gap-1.5 min-w-[90px] flex-1">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><Archive className="w-3 h-3" /></div>
                        <div className="flex flex-col w-full">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Liasse CR</label>
                            <input type="number" value={nbrCourrierLiasseCr} onChange={e => setNbrCourrierLiasseCr(Number(e.target.value))} className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full text-center" />
                        </div>
                    </div>
                    <div className="w-px h-6 bg-slate-200 hidden md:block" />
                    {/* % Ret. CO */}
                    <div className="flex items-center gap-1.5 min-w-[80px] flex-1">
                        <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><Percent className="w-3 h-3" /></div>
                        <div className="flex flex-col w-full">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">% Ret. CO</label>
                            <div className="relative">
                                <input type="number" value={pctRetourCo} onChange={e => setPctRetourCo(Number(e.target.value))} className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full pr-3 text-center" />
                                <span className="absolute right-0 top-0 text-[8px] text-slate-400 font-bold pointer-events-none">%</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-px h-6 bg-slate-200 hidden md:block" />
                    {/* % Ret. CR */}
                    <div className="flex items-center gap-1.5 min-w-[80px] flex-1">
                        <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><Percent className="w-3 h-3" /></div>
                        <div className="flex flex-col w-full">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">% Ret. CR</label>
                            <div className="relative">
                                <input type="number" value={pctRetourCr} onChange={e => setPctRetourCr(Number(e.target.value))} className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full pr-3 text-center" />
                                <span className="absolute right-0 top-0 text-[8px] text-slate-400 font-bold pointer-events-none">%</span>
                            </div>
                        </div>
                    </div>

                    <div className="w-px h-6 bg-slate-200 hidden md:block" />

                    {/* SHIFT PARAMETER */}
                    <div className="flex items-center gap-1.5 min-w-[80px] flex-1">
                        <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Layers className="w-3 h-3" />
                        </div>
                        <div className="flex flex-col w-full">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                SHIFT
                            </label>
                            <div className="relative">
                                <select
                                    value={shiftParam}
                                    onChange={(e) => setShiftParam(Number(e.target.value))}
                                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full pr-3 text-center appearance-none cursor-pointer"
                                >
                                    <option value={1}>1</option>
                                    <option value={2}>2</option>
                                    <option value={3}>3</option>
                                </select>
                                <div className="absolute right-0 top-0 pointer-events-none">
                                    <span className="text-[10px] text-slate-400">▼</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-px h-6 bg-slate-200 hidden md:block" />

                    {/* Button */}
                    <div className="flex items-center ml-auto">
                        <button
                            onClick={handleSimuler}
                            disabled={!poste && !volCoImport && !volCoExport}
                            className={`px-4 py-1.5 rounded-full font-bold text-xs transition-all flex items-center gap-1.5
                            ${(!poste && !volCoImport && !volCoExport) ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-gradient-to-r from-[#005EA8] to-blue-600 text-white hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"}
                        `}
                        >
                            <Gauge className="w-3.5 h-3.5" />
                            {loading?.simulation ? "Calcul..." : "Lancer Simulation"}
                        </button>
                    </div>
                </div>
            </div>

            {/* DETAILS & RESULTATS */}
            <div className="flex flex-col gap-3">

                {/* FILTRE FAMILLE */}
                {uniqueFamilles.length > 0 && (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-slate-50/90 to-slate-50/70 backdrop-blur-sm p-2 rounded-xl border border-slate-200/60 self-start shadow-sm">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filtre Famille:</span>
                        <select
                            className="bg-white border border-slate-200/80 text-xs text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#005EA8]/20 focus:border-[#005EA8] w-full max-w-[240px] transition-all"
                            value={filterFamille}
                            onChange={e => setFilterFamille(e.target.value)}
                        >
                            <option value="">Toutes les familles ({uniqueFamilles.length})</option>
                            {uniqueFamilles.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        {filterFamille && (
                            <button onClick={() => setFilterFamille("")} className="text-[10px] text-red-500 hover:text-red-700 font-medium px-2.5 py-1 bg-red-50 rounded-lg border border-red-100 transition-colors hover:bg-red-100">✕</button>
                        )}
                    </div>
                )}

                {/* MAIN GRID */}
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_1fr] gap-5 min-h-0 items-start">

                    {/* REFERENTIEL */}
                    {refDisplay === "tableau" ? (
                        <div className="flex flex-col gap-2 w-full">
                            <EnterpriseTable
                                title="Référentiel Temps"
                                subtitle={filterFamille ? `Filtre: ${filterFamille}` : "Base de calcul"}
                                tooltip="Temps moyen par tâche"
                                icon={Clock}
                                columns={[
                                    { key: 't', label: 'Tâche', align: 'left', ellipsis: true },
                                    { key: 'f', label: 'Famille', align: 'left', width: '120px', ellipsis: true },
                                    { key: 'u', label: 'Unité', align: 'left', width: '140px', ellipsis: true },
                                    { key: 'm', label: 'Moy. (min)', align: 'right', width: '80px', render: (val) => Number(val || 0).toFixed(5) }
                                ]}
                                data={referentielFiltered.map((r, i) => ({
                                    seq: i + 1,
                                    f: r.famille || "",
                                    t: r.t,
                                    u: r.u,
                                    m: r.m
                                }))}
                                currentView="table"
                                onViewChange={(view) => setRefDisplay(view === 'table' ? 'tableau' : 'graphe')}
                                showViewToggle={true}
                                height={380}
                            />
                        </div>
                    ) : (
                        <Card title={<span className="text-[11px] font-semibold">Référentiel Temps</span>}
                            actions={
                                <div className="flex rounded-lg border border-slate-300 overflow-hidden shadow-sm">
                                    <button className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors flex items-center gap-1.5 ${refDisplay === "tableau" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`} onClick={() => setRefDisplay("tableau")}><TableIcon className="w-3 h-3" /> Tableau</button>
                                    <button className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors flex items-center gap-1.5 border-l border-slate-300 ${refDisplay === "graphe" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`} onClick={() => setRefDisplay("graphe")}><BarChart3 className="w-3 h-3" /> Graphe</button>
                                </div>
                            }
                            bodyClassName="!p-1">
                            <div className="p-1.5 h-[380px]">
                                <GraphReferentielComponent referentiel={referentielFiltered} loading={loading?.referentiel} hasPhase={false} />
                            </div>
                        </Card>
                    )}

                    {/* ARROW */}
                    <div className="hidden xl:flex flex-col items-center justify-center py-12">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shadow-sm ring-1 ring-blue-100">
                            <ArrowRight className="w-5 h-5 text-[#005EA8]" />
                        </div>
                        <span className="text-[10px] font-semibold text-[#005EA8] mt-2 uppercase tracking-wider">Calcul</span>
                    </div>

                    {/* RÉSULTATS */}
                    {display === "tableau" ? (
                        loading?.simulation ? (
                            <Card title={<span className="text-[11px] font-semibold">Résultats</span>} bodyClassName="!p-1"><div className="px-2 py-1 text-slate-500 text-[10px]">Calcul en cours…</div></Card>
                        ) : !hasSimulated ? (
                            <Card title={<span className="text-[11px] font-semibold">Résultats</span>} bodyClassName="!p-1"><EmptyStateFirstRun onSimuler={handleSimuler} /></Card>
                        ) : simDirty ? (
                            <Card title={<span className="text-[11px] font-semibold">Résultats</span>} bodyClassName="!p-1"><EmptyStateDirty onSimuler={handleSimuler} /></Card>
                        ) : (
                            <EnterpriseTable
                                title="Résultats"
                                subtitle="Données calculées"
                                icon={CheckCircle2}
                                columns={[
                                    { key: 'task', label: 'Tâche', align: 'left', ellipsis: true },
                                    { key: 'nombre_unite', label: 'Vol/J', align: 'right', width: '100px', render: (val) => formatUnit(val) },
                                    { key: 'heures', label: 'Heures', align: 'right', width: '80px', bold: true, render: (val) => Number(val || 0).toFixed(2) }
                                ]}
                                data={resultats}
                                footer={null}
                                height={380}
                                currentView="table"
                                onViewChange={(view) => setDisplay(view === 'table' ? 'tableau' : 'graphe')}
                                showViewToggle={true}
                            />
                        )
                    ) : (
                        <Card title={<span className="text-[11px] font-semibold">Résultats de Simulation</span>}
                            actions={
                                <div className="flex rounded-lg border border-slate-300 overflow-hidden shadow-sm">
                                    <button className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors flex items-center gap-1.5 ${display === "tableau" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`} onClick={() => setDisplay("tableau")}><TableIcon className="w-3 h-3" /> Tableau</button>
                                    <button className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors flex items-center gap-1.5 border-l border-slate-300 ${display === "graphe" ? "bg-[#005EA8] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`} onClick={() => setDisplay("graphe")}><BarChart3 className="w-3 h-3" /> Graphe</button>
                                </div>
                            }
                            bodyClassName="!p-1">
                            <div className="p-1.5 h-[380px]">
                                {loading?.simulation ? <div className="text-center text-xs">Calcul...</div> :
                                    (!hasSimulated ? <EmptyStateFirstRun /> :
                                        <GraphResultatsComponent resultats={resultats} totaux={{ total_heures: totaux?.total_heures, heures_net: heuresNet }} />)}
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {hasSimulated && (() => {
                const isAll = (!poste || poste === "__ALL__");

                // 1. Actual Values
                const effActuelMOD = Number(totaux?.total_mod_actuel || 0);
                const effActuelMOI = Number(totaux?.total_moi_actuel || 0);
                const effActuelAPS = isAll ? Number(totaux?.total_aps_actuel || 0) : 0;
                const effActuelTotal = effActuelMOD + effActuelMOI + effActuelAPS;

                // 2. Target Values (Raw Calculated)
                const targetMOD = Number(totaux?.total_mod_target || totaux?.fte_arrondi || 0);
                const targetMOI = Number(totaux?.total_moi_target || totaux?.total_moi || 0);
                const targetAPS = isAll ? Number(totaux?.total_aps_target || totaux?.total_aps || 0) : 0;

                // 3. Total Gap
                const targetTotalCalc = targetMOD + targetMOI + targetAPS;
                const ecartTotal = targetTotalCalc - effActuelTotal;

                // 4. Cascading Distribution (Display Logic)
                let displayMOD = effActuelMOD;
                let displayMOI = effActuelMOI;
                let displayAPS = effActuelAPS;

                if (ecartTotal > 0) {
                    // Surplus: Need more people.
                    // Rule: Keep MOD as Actual, add ALL gap to APS.
                    displayMOD = effActuelMOD;
                    displayAPS = effActuelAPS + ecartTotal;
                } else if (ecartTotal < 0) {
                    // Deficit: Need fewer people.
                    // Rule: Reduce APS first.
                    const absEcart = Math.abs(ecartTotal);
                    if (effActuelAPS >= absEcart) {
                        displayAPS = effActuelAPS - absEcart;
                    } else {
                        const remainder = absEcart - effActuelAPS;
                        displayAPS = 0;
                        displayMOD = Math.max(0, effActuelMOD - remainder);
                    }
                } else {
                    // Equal
                    displayMOD = effActuelMOD;
                    displayAPS = effActuelAPS;
                }

                const displayTotal = displayMOD + displayMOI + displayAPS;

                // 5. Computed Ecarts (for the Ecart card)
                const ecartMOD = displayMOD - effActuelMOD;
                const ecartMOI = displayMOI - effActuelMOI;
                const ecartAPS = displayAPS - effActuelAPS;

                return (
                    <div className="bg-gradient-to-br from-blue-50/60 via-blue-50/40 to-slate-50/60 border border-blue-100/80 rounded-2xl p-4 mt-2 shadow-lg backdrop-blur-sm">
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#005EA8] to-blue-600 flex items-center justify-center shadow-md">
                                <Gauge className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="text-base font-bold text-[#005EA8] tracking-tight">Synthèse des Résultats</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {/* 1. Charge Totale */}
                            <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-3 min-h-[100px] ring-1 ring-slate-200/60 shadow-md flex flex-col items-center justify-center transition-all hover:ring-blue-200 hover:shadow-lg">
                                <div className="text-[11px] font-semibold text-slate-600 mb-1.5">Charge Totale</div>
                                <div className="text-2xl font-extrabold text-slate-900">{Number(totaux?.total_heures || 0).toFixed(2)}</div>
                                <div className="text-[10px] text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-full mt-1.5 font-medium">heures / jour</div>
                            </div>

                            {/* 2. Effectif Actuel */}
                            <KPICardGlass
                                label="Effectif Actuel"
                                icon={UserRound}
                                tone="slate"
                                emphasize
                                total={formatSmallNumber(effActuelTotal, 2)}
                                toggleable={false}
                                customFooter={
                                    <div className="flex flex-col w-full px-2 mt-1 gap-1">
                                        <div className="flex justify-center border-b border-slate-100 pb-1 mb-0.5">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] text-fuchsia-600 font-bold uppercase tracking-wide">Statutaire</span>
                                                <span className="text-[11px] font-extrabold text-slate-800">{formatSmallNumber(effActuelMOD + effActuelMOI, 0)}</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center w-full">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] text-slate-400 font-bold uppercase">MOD</span>
                                                <span className="text-[10px] font-bold text-slate-700">{formatSmallNumber(effActuelMOD, 0)}</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] text-slate-400 font-bold uppercase">MOI</span>
                                                <span className="text-[10px] font-bold text-slate-700">{formatSmallNumber(effActuelMOI, 0)}</span>
                                            </div>
                                            {isAll && (
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase">APS</span>
                                                    <span className="text-[10px] font-bold text-slate-700">{formatSmallNumber(effActuelAPS, 0)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                }
                            />

                            {/* 3. Effectif Calculé (NO APS/STATUTAIRE) */}
                            <KPICardGlass
                                label="Effectif Calculé"
                                icon={Calculator}
                                tone="blue"
                                emphasize
                                total={formatSmallNumber(targetMOD + targetMOI, 2)}
                                toggleable={false}
                                customFooter={
                                    <div className="flex justify-evenly items-center w-full px-2 mt-1">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[9px] text-blue-400 font-bold uppercase">MOD</span>
                                            <span className="text-[10px] font-bold text-slate-700">{formatSmallNumber(targetMOD, 2)}</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[9px] text-blue-400 font-bold uppercase">MOI</span>
                                            <span className="text-[10px] font-bold text-slate-700">{formatSmallNumber(targetMOI, 0)}</span>
                                        </div>
                                    </div>
                                }
                            />

                            {/* 4. Effectif Final (Distributed/Allocated) */}
                            <KPICardGlass
                                label="Effectif Final"
                                icon={CheckCircle2}
                                tone="amber"
                                emphasize
                                total={formatSmallNumber(displayTotal, 0)}
                                toggleable={false}
                                customFooter={
                                    <div className="flex justify-between items-center w-full px-2 mt-1">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[9px] text-amber-500 font-bold uppercase">MOD</span>
                                            <span className="text-[10px] font-bold text-slate-800">{formatSmallNumber(displayMOD, 0)}</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[9px] text-amber-500 font-bold uppercase">MOI</span>
                                            <span className="text-[10px] font-bold text-slate-800">{formatSmallNumber(displayMOI, 0)}</span>
                                        </div>
                                        {isAll && (
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] text-amber-500 font-bold uppercase">APS</span>
                                                <span className="text-[10px] font-bold text-slate-800">{formatSmallNumber(displayAPS, 0)}</span>
                                            </div>
                                        )}
                                    </div>
                                }
                            />

                            {/* 5. Ecart Total */}
                            <div className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl p-3 min-h-[100px] shadow-md flex flex-col items-center justify-between
                            ${ecartTotal > 0 ? "bg-emerald-50/60 border-emerald-100 ring-1 ring-emerald-200" : ecartTotal < 0 ? "bg-red-50/60 border-red-100 ring-1 ring-red-200" : "bg-white/70 border-white/60"}
                        `}>
                                <div className="text-[11px] font-semibold text-slate-600 mb-0.5 flex items-center gap-1.5 w-full justify-center">
                                    <TrendingUp className="w-3 h-3" /> Ecart Total
                                </div>

                                <div className={`text-2xl font-extrabold -mt-1 ${ecartTotal > 0 ? "text-emerald-600" : ecartTotal < 0 ? "text-red-500" : "text-slate-400"}`}>
                                    {ecartTotal > 0 ? "+" : ""}{formatSmallNumber(ecartTotal, 2)}
                                </div>

                                {/* Detailed Breakdown Footer */}
                                <div className="flex justify-between items-center w-full px-1 mt-1 border-t border-slate-200/50 pt-1">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[8px] text-slate-500 font-bold uppercase">MOD</span>
                                        <span className={`text-[9px] font-bold ${ecartMOD > 0 ? "text-emerald-600" : ecartMOD < 0 ? "text-red-500" : "text-slate-600"}`}>
                                            {ecartMOD > 0 ? "+" : ""}{formatSmallNumber(ecartMOD, 1)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[8px] text-slate-500 font-bold uppercase">MOI</span>
                                        <span className={`text-[9px] font-bold ${ecartMOI > 0 ? "text-emerald-600" : ecartMOI < 0 ? "text-red-500" : "text-slate-600"}`}>
                                            {ecartMOI > 0 ? "+" : ""}{formatSmallNumber(ecartMOI, 1)}
                                        </span>
                                    </div>
                                    {isAll && (
                                        <div className="flex flex-col items-center">
                                            <span className="text-[8px] text-slate-500 font-bold uppercase">APS</span>
                                            <span className={`text-[9px] font-bold ${ecartAPS > 0 ? "text-emerald-600" : ecartAPS < 0 ? "text-red-500" : "text-slate-600"}`}>
                                                {ecartAPS > 0 ? "+" : ""}{formatSmallNumber(ecartAPS, 1)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

        </div>
    );
}
