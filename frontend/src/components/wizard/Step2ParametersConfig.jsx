import React, { useEffect, useCallback, useState } from "react";
import {
    Package, Gauge, Truck, Info, Percent,
    Briefcase, Box, Undo2, Move, MapPin,
    Globe, Map, Mail, RefreshCw, Scale, Timer,
    Clock, Banknote, Layout, Layers, Grid2X2, Home, RotateCcw, Copy
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import "@/styles/wizard.css";

// Helper component for formatted number input with Icon
const FieldWithIcon = ({
    icon: Icon,
    label,
    value,
    onValueChange,
    type = "number",
    options = [],
    suffix,
    iconColor = "text-blue-600",
    iconBg = "bg-blue-50",
    className,
    helperText,
    disabled = false
}) => {
    const [displayRaw, setDisplayRaw] = useState("");

    // Initialize/Sync display value for number inputs
    useEffect(() => {
        if (type === "select") return;

        if (value === undefined || value === null) {
            setDisplayRaw("");
        } else {
            const num = parseFloat(String(value));
            if (!isNaN(num)) {
                const valStr = num.toLocaleString("fr-FR", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                    useGrouping: true
                });
                setDisplayRaw(valStr);
            } else {
                setDisplayRaw("");
            }
        }
    }, [value, type]);

    const handleChange = (e) => {
        const raw = e.target.value;
        if (/^[\d\s,.]*$/.test(raw)) {
            setDisplayRaw(raw);
            const clean = raw.replace(/[\s\u00A0\u202F]/g, '').replace(',', '.');
            if ((clean.match(/\./g) || []).length > 1) return;

            const num = parseFloat(clean);
            if (!isNaN(num)) {
                onValueChange(num);
            } else if (clean === "") {
                onValueChange(0);
            }
        }
    };

    return (
        <div className={`h-[76px] rounded-lg border border-slate-200/80 bg-slate-50/60 p-2 shadow-sm hover:shadow transition-all flex flex-col justify-between ${className}`}>
            <div className="flex items-center justify-between mb-1 min-h-[14px]">
                <label className="text-[10px] uppercase text-slate-600 font-black tracking-wide leading-none truncate pr-1" title={label}>{label}</label>
                {helperText && <Info className="w-3.5 h-3.5 text-slate-300" title={helperText} />}
            </div>

            <div className="flex items-center gap-1.5 min-h-[32px]">
                <div className={`w-8 h-8 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0 shadow-sm border border-white/60`}>
                    <Icon className="w-3.5 h-3.5" />
                </div>

                <div className="relative flex-1">
                    {type === "select" ? (
                        <Select value={String(value)} onValueChange={(val) => onValueChange(Number(val))} disabled={disabled}>
                            <SelectTrigger className={`h-8 text-xs font-semibold bg-white border-slate-200 w-full focus:ring-1 focus:ring-blue-200 justify-center text-center ${disabled ? "opacity-60 cursor-not-allowed bg-slate-100" : ""}`}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {options.map(opt => (
                                    <SelectItem key={opt.value} value={String(opt.value)} className="justify-center">
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <>
                            <Input
                                type="text"
                                value={displayRaw}
                                onChange={handleChange}
                                disabled={disabled}
                                className={`h-8 text-xs font-semibold text-slate-800 bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 w-full pr-7 text-center ${disabled ? "opacity-60 cursor-not-allowed bg-slate-100" : ""}`}
                            />
                            {suffix && (
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-black pointer-events-none">
                                    {suffix}
                                </span>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const PARAM_SECTIONS = [
    {
        id: "volume",
        title: "VOLUME",
        icon: Package,
        titleColor: "text-emerald-700",
        iconColor: "text-emerald-600",
        bgIcon: "bg-emerald-50",
        gridCols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        fields: [
            // Row 1: Collecte / Marché
            { id: "pctCollecte", label: "Collecte", suffix: "%", icon: Briefcase, iconColor: "text-emerald-600", iconBg: "bg-emerald-50", handler: "collecte", flux: ["amana", "cr", "co"] },
            { id: "pctMarcheOrdinaire", label: "Marché Ord.", suffix: "%", icon: Box, iconColor: "text-slate-600", iconBg: "bg-slate-50", handler: "marche", flux: ["amana", "cr", "co"] },

            // Row 2: % Guichet (Ventilation Local) - Alone on its row
            { id: "pctGuichet", label: "% Guichet", suffix: "%", icon: Layout, iconColor: "text-blue-600", iconBg: "bg-blue-50", handler: "guichet", flux: ["amana", "cr", "co"] },
            { id: "spacer_guichet", isSpacer: true, flux: ["amana", "cr", "co"] },

            // Row 3: Axes / Local
            { id: "pctAxesArrivee", label: "Axes", suffix: "%", icon: Move, iconColor: "text-orange-600", iconBg: "bg-orange-50", handler: "axesArrivee", flux: ["amana", "cr", "co"] },
            { id: "pctAxesDepart", label: "Local", suffix: "%", icon: MapPin, iconColor: "text-[#005EA8]", iconBg: "bg-blue-50", handler: "axesDepart", flux: ["amana", "cr", "co"] },

            // Row 3: Nat / Inter
            { id: "pctNational", label: "Nat.", suffix: "%", icon: Map, iconColor: "text-cyan-600", iconBg: "bg-cyan-50", handler: "national", flux: ["amana", "cr"] },
            { id: "pctInternational", label: "Inter.", suffix: "%", icon: Globe, iconColor: "text-indigo-600", iconBg: "bg-indigo-50", handler: "international", flux: ["amana", "cr"] },

            // Row 4: CRBT / Hors CRBT
            { id: "pctCrbt", label: "% CRBT", suffix: "%", icon: Banknote, iconColor: "text-amber-600", iconBg: "bg-amber-50", handler: "crbt", flux: ["amana", "cr"] },
            { id: "pctHorsCrbt", label: "% Hors CRBT", suffix: "%", icon: Banknote, iconColor: "text-slate-600", iconBg: "bg-slate-50", handler: "horsCrbt", flux: ["amana", "cr"] },

            // Row 5: VagueMaster / BP
            { id: "pctVagueMaster", label: "% Vaguemestre", suffix: "%", icon: Layout, iconColor: "text-purple-600", iconBg: "bg-purple-50", flux: ["cr", "co"] },
            { id: "pctBoitePostale", label: "% Boite postale", suffix: "%", icon: Mail, iconColor: "text-blue-600", iconBg: "bg-blue-50", flux: ["co"] },

            // Row 6: Retour / % ED
            { id: "pctRetour", label: "Retour", suffix: "%", icon: Undo2, iconColor: "text-amber-600", iconBg: "bg-amber-50", flux: ["amana", "cr", "co"] },
            { id: "edPercent", label: "% ED", suffix: "%", icon: Percent, iconColor: "text-slate-600", iconBg: "bg-slate-50", flux: ["amana"] },

            // Row 7: Technical Unified (Cols/Sac, CO/Sac, CR/Caisson)
            { id: "tech_unified", label: "Spécifique", icon: Box, flux: ["amana", "co", "cr"], isTechUnified: true },
        ]
    },
    {
        id: "productivity",
        title: "PRODUCTIVITÉ",
        icon: Gauge,
        titleColor: "text-blue-700",
        iconColor: "text-blue-600",
        bgIcon: "bg-blue-50",
        gridCols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        fields: [
            { id: "productivite", label: "Prod.", suffix: "%", icon: Gauge, iconColor: "text-blue-600", iconBg: "bg-blue-50", flux: "general" },
            { id: "idleMinutes", label: "T. Mort", suffix: "min", icon: Timer, iconColor: "text-amber-600", iconBg: "bg-amber-50", flux: "general" },
            {
                id: "shift",
                label: "Shift",
                icon: Clock,
                type: "select",
                iconColor: "text-purple-600",
                iconBg: "bg-purple-50",
                flux: "general",
                options: [
                    { value: 1, label: "1" },
                    { value: 2, label: "2" },
                    { value: 3, label: "3" }
                ]
            }
        ],
        footer: { label: "Centre(Hors facteur)", valueKey: "heuresNet", tone: "amber" }
    },
    {
        id: "distribution",
        title: "DISTRIBUTION",
        icon: Truck,
        titleColor: "text-amber-700",
        iconColor: "text-amber-600",
        bgIcon: "bg-amber-50",
        gridCols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        fields: [
            {
                id: "natureGeo",
                label: "Geographie",
                icon: Map,
                type: "select",
                iconColor: "text-pink-600",
                iconBg: "bg-pink-50",
                flux: "general",
                options: [
                    { value: 0, label: "0" },
                    { value: -0.05, label: "-0.05" },
                    { value: -0.1, label: "-0.1" },
                    { value: -0.15, label: "-0.15" },
                    { value: -0.2, label: "-0.2" }
                ]
            },
            {
                id: "tauxComplexite",
                label: "Circulation",
                icon: RefreshCw,
                type: "select",
                iconColor: "text-violet-600",
                iconBg: "bg-violet-50",
                flux: "general",
                options: [
                    { value: 0, label: "0" },
                    { value: 0.2, label: "0.2" },
                    { value: 0.4, label: "0.4" },
                    { value: 0.6, label: "0.6" },
                    { value: 0.8, label: "0.8" }
                ]
            },
            { id: "dureeTrajet", label: "Trajet A/R", suffix: "min", icon: Truck, iconColor: "text-amber-600", iconBg: "bg-amber-50", flux: "general" },
            {
                id: "hasGuichet",
                label: "Guichet",
                icon: Layout,
                type: "select",
                iconColor: "text-blue-600",
                iconBg: "bg-blue-50",
                flux: "general",
                hidden: true,
                options: [
                    { value: 1, label: "Oui" },
                    { value: 0, label: "Non" }
                ]
            },
        ],
        footer: { label: "Facteur", valueKey: "prodOpFacteur", tone: "amber" }
    }
];

// Helper to format hours (float) into Hh MM
const formatDuration = (val) => {
    const num = Number(val || 0);
    const h = Math.floor(num);
    const m = Math.round((num - h) * 60);
    return `${h}h ${String(m).padStart(2, "0")}`;
};

export default function Step2ParametersConfig({
    data,
    onDataChange,
    handleParameterChange,
    onValidationChange,
}) {
    // Use handleParameterChange if provided, otherwise fall back to onDataChange
    const updateData = handleParameterChange || onDataChange;
    // Calculate Productivité Opérationnelle Nette
    const heuresNet = React.useMemo(() => {
        const prod = Number(data.productivite || 100) / 100;
        const idleH = Number(data.idleMinutes || 0) / 60;
        // Capacité "heures nettes" basée sur une journée standard de 8h30
        return Math.max(0, 8.5 * prod - idleH);
    }, [data.productivite, data.idleMinutes]);

    // Calculate Productivité Opérationnelle Facteur
    const prodOpFacteur = React.useMemo(() => {
        const net = Number(heuresNet);
        const trajet = (Number(data.dureeTrajet || 0) * 2) / 60;
        return Math.max(0, net - trajet);
    }, [heuresNet, data.dureeTrajet]);

    // Helper to resolve value with fallback (similar to display logic)
    const resolveValue = useCallback((id) => {
        if (data[id] !== undefined) return Number(data[id] || 0);
        const baseId = id.includes('_') ? id.split('_').slice(1).join('_') : id;
        return Number(data[baseId] || 0);
    }, [data]);

    // Helper for multi-percentage balancing (3-way Waterfall)
    const handleTripleChange = useCallback((field, val) => {
        const newValue = Math.max(0, Math.min(100, Number(val || 0)));
        const prefix = field.id.includes('_') ? field.id.split('_')[0] + '_' : '';
        
        const collKey = `${prefix}pctCollecte`;
        const marcKey = `${prefix}pctMarcheOrdinaire`;
        const guicKey = `${prefix}pctGuichet`;

        if (field.handler === "collecte") {
            // Rule 1: Change Collecte => Split remaining 50/50 between Marche & Guichet
            const rem = 100 - newValue;
            updateData({
                [collKey]: newValue,
                [marcKey]: Math.round((rem / 2) * 100) / 100,
                [guicKey]: Math.round((rem / 2) * 100) / 100,
            });
        } else if (field.handler === "marche") {
            // Rule 2: Change Marche => Guichet takes the rest (Collecte stays same)
            const currentColl = resolveValue(collKey);
            const rem = Math.max(0, 100 - currentColl - newValue);
            updateData({
                [marcKey]: newValue,
                [guicKey]: Math.round(rem * 100) / 100,
            });
        } else if (field.handler === "guichet") {
            // Rule 3: Change Guichet => Marche takes the rest (Collecte stays same)
            const currentColl = resolveValue(collKey);
            const rem = Math.max(0, 100 - currentColl - newValue);
            updateData({
                [guicKey]: newValue,
                [marcKey]: Math.round(rem * 100) / 100,
            });
        }
    }, [updateData, resolveValue]);

    // Helper for paired percentage balancing
    const handlePairChange = useCallback((id, val, pairId) => {
        const newValue = Math.max(0, Math.min(100, Number(val || 0)));
        updateData({
            [id]: newValue,
            [pairId]: Math.round((100 - newValue) * 100) / 100,
        });
    }, [updateData]);

    const handleChange = useCallback((field, val) => {
        const prefix = field.id.includes('_') ? field.id.split('_')[0] + '_' : '';

        if (field.handler === "national") handlePairChange(`${prefix}pctNational`, val, `${prefix}pctInternational`);
        else if (field.handler === "international") handlePairChange(`${prefix}pctInternational`, val, `${prefix}pctNational`);
        else if (field.handler === "axesArrivee") handlePairChange(`${prefix}pctAxesArrivee`, val, `${prefix}pctAxesDepart`);
        else if (field.handler === "axesDepart") handlePairChange(`${prefix}pctAxesDepart`, val, `${prefix}pctAxesArrivee`);
        else if (field.handler === "crbt") handlePairChange(`${prefix}pctCrbt`, val, `${prefix}pctHorsCrbt`);
        else if (field.handler === "horsCrbt") handlePairChange(`${prefix}pctHorsCrbt`, val, `${prefix}pctCrbt`);
        else if (["collecte", "marche", "guichet"].includes(field.handler)) handleTripleChange(field, val);
        else {
            updateData({ [field.id]: val });
        }
    }, [handlePairChange, handleTripleChange, updateData]);

    // Validation: all required fields filled
    useEffect(() => {
        const isValid =
            data.productivite > 0 &&
            data.shift > 0;
        onValidationChange(isValid);
    }, [data, onValidationChange]);

    const footerValues = {
        heuresNet,
        prodOpFacteur
    };

    const [activeTab, setActiveTab] = useState("productivity");
    const displayMode = "tabs";

    const filteredSections = React.useMemo(() => {
        if (displayMode === "grid") {
            // En mode grille (Scénario B), on crée 4 colonnes virtuelles basées sur les flux
            const fluxKeys = ["general", "amana", "co", "cr"];
            return fluxKeys.map(fluxKey => {
                if (fluxKey === "general") {
                    const productivityGroup = PARAM_SECTIONS.find(s => s.id === "productivity");
                    const distributionGroup = PARAM_SECTIONS.find(s => s.id === "distribution");

                    return {
                        id: "general_col",
                        title: "GÉNÉRAL",
                        icon: Home,
                        iconColor: "text-slate-600",
                        titleColor: "text-slate-800",
                        gridCols: "grid-cols-1 sm:grid-cols-2",
                        groups: [
                            {
                                title: productivityGroup.title,
                                fields: productivityGroup.fields.filter(f => !f.hidden),
                                footer: productivityGroup.footer
                            },
                            {
                                title: distributionGroup.title,
                                fields: distributionGroup.fields.filter(f => !f.hidden),
                                footer: distributionGroup.footer
                            }
                        ].filter(g => g.fields.length > 0)
                    };
                }

                const fluxTitles = { amana: "AMANA", co: "CO", cr: "CR" };
                const fluxIcons = { amana: Package, co: Mail, cr: Banknote };
                const fluxColors = { amana: "text-blue-600", co: "text-emerald-600", cr: "text-amber-600" };
                const volumeSection = PARAM_SECTIONS.find(s => s.id === "volume");

                return {
                    id: `${fluxKey}_col`,
                    title: fluxTitles[fluxKey],
                    icon: fluxIcons[fluxKey],
                    iconColor: fluxColors[fluxKey],
                    titleColor: "text-slate-800",
                    gridCols: "grid-cols-1 sm:grid-cols-2",
                    groups: [
                        {
                            title: volumeSection.title,
                            fields: volumeSection.fields
                                .map(f => {
                                    const isApplicable = Array.isArray(f.flux) ? f.flux.includes(fluxKey) : f.flux === fluxKey;
                                    if (!isApplicable || f.isSpacer) return { id: f.id || `spacer_${Math.random()}`, isSpacer: true };

                                    let updatedField = { ...f };

                                    // Handle Technical Unified Field
                                    if (f.isTechUnified) {
                                        if (fluxKey === "amana") {
                                            updatedField = { ...updatedField, id: "colisAmanaParCanvaSac", label: "Colis/Sac", icon: Package, iconColor: "text-blue-600", iconBg: "bg-blue-50" };
                                        } else if (fluxKey === "co") {
                                            updatedField = { ...updatedField, id: "nbrCoSac", label: "CO/Sac", icon: Mail, iconColor: "text-sky-600", iconBg: "bg-sky-50" };
                                        } else if (fluxKey === "cr") {
                                            updatedField = { ...updatedField, id: "crParCaisson", label: "CR/Caisson", icon: Box, iconColor: "text-indigo-600", iconBg: "bg-indigo-50" };
                                        }
                                    }

                                    if (fluxKey === "cr") {
                                        if (f.id === "pctNational") updatedField.label = "CR Nat.";
                                        if (f.id === "pctInternational") updatedField.label = "CR Int.";
                                        if (f.id === "pctCrbt") updatedField.label = "Accusé de réc.";
                                        if (f.id === "pctHorsCrbt") updatedField.label = "Hors Accusé réc.";
                                    }
                                    if (fluxKey === "amana") {
                                        if (f.id === "pctNational") updatedField.label = "Amana Nat.";
                                        if (f.id === "pctInternational") updatedField.label = "Amana Int.";
                                    }

                                    const isGlobalTechnical = ["nbrCoSac", "nbrCrSac", "colisAmanaParCanvaSac", "edPercent", "crParCaisson"].includes(updatedField.id);
                                    return !isGlobalTechnical ? { ...updatedField, id: `${fluxKey}_${updatedField.id}` } : updatedField;
                                }),
                            footer: volumeSection.footer
                        }
                    ].filter(g => g.fields.length > 0)
                };
            });
        }

        return PARAM_SECTIONS
            .filter(section => {
                if (activeTab === "productivity") return section.id === "productivity";
                if (activeTab === "distribution") return section.id === "distribution";
                return section.id === "volume";
            })
            .map(section => {
                const isVolume = section.id === "volume";
                return {
                    ...section,
                    groups: [
                        {
                            title: section.title,
                            fields: section.fields
                                .filter(f =>
                                    !f.hidden && (
                                        f.flux === "general" ||
                                        (Array.isArray(f.flux) && f.flux.includes(activeTab)) ||
                                        f.flux === activeTab
                                    )
                                )
                                .map(f => {
                                    let updatedField = { ...f };
                                    if (f.isTechUnified) {
                                        if (activeTab === "amana") {
                                            updatedField = { ...updatedField, id: "colisAmanaParCanvaSac", label: "Colis/Sac", icon: Package, iconColor: "text-blue-600", iconBg: "bg-blue-50" };
                                        } else if (activeTab === "co") {
                                            updatedField = { ...updatedField, id: "nbrCoSac", label: "CO/Sac", icon: Mail, iconColor: "text-sky-600", iconBg: "bg-sky-50" };
                                        } else if (activeTab === "cr") {
                                            updatedField = { ...updatedField, id: "crParCaisson", label: "CR/Caisson", icon: Box, iconColor: "text-indigo-600", iconBg: "bg-indigo-50" };
                                        }
                                    }
                                    if (activeTab === "cr") {
                                        if (f.id === "pctNational") updatedField.label = "CR Nat.";
                                        if (f.id === "pctInternational") updatedField.label = "CR Int.";
                                        if (f.id === "pctCrbt") updatedField.label = "Accusé de réc.";
                                        if (f.id === "pctHorsCrbt") updatedField.label = "Hors Accusé réc.";
                                    }
                                    const isGlobalTechnical = ["nbrCoSac", "nbrCrSac", "colisAmanaParCanvaSac", "edPercent", "crParCaisson"].includes(updatedField.id);
                                    return (isVolume && !isGlobalTechnical) ? { ...updatedField, id: `${activeTab}_${f.id}` } : updatedField;
                                }), // Préfixage si Volume et non technique global
                            footer: section.footer
                        }
                    ]
                };
            });
    }, [activeTab, displayMode]);

    const tabItems = [
        { id: "productivity", label: "PRODUCTIVITÉ", icon: Gauge },
        { id: "distribution", label: "DISTRIBUTION", icon: Truck },
        { id: "amana", label: "AMANA", icon: Package },
        { id: "co", label: "CO", icon: Mail },
        { id: "cr", label: "CR", icon: Banknote },
    ];

    const handleResetCurrentTab = useCallback(() => {
        if (activeTab === "productivity") {
            updateData({ productivite: 100, idleMinutes: 0, shift: 1 });
            return;
        }
        if (activeTab === "distribution") {
            return;
        }
        const defaults = {
            amana: { amana_pctCollecte: 5, amana_pctMarcheOrdinaire: 0, amana_pctGuichet: 95, amana_pctAxesArrivee: 0, amana_pctAxesDepart: 100, amana_pctNational: 100, amana_pctInternational: 0, amana_pctRetour: 0, amana_pctCrbt: 50, amana_pctHorsCrbt: 50 },
            co: { co_pctCollecte: 5, co_pctMarcheOrdinaire: 0, co_pctGuichet: 95, co_pctAxesArrivee: 0, co_pctAxesDepart: 100, co_pctRetour: 0, co_pctVagueMaster: 0, co_pctBoitePostale: 0, nbrCoSac: 350 },
            cr: { cr_pctCollecte: 5, cr_pctMarcheOrdinaire: 0, cr_pctGuichet: 95, cr_pctAxesArrivee: 0, cr_pctAxesDepart: 100, cr_pctNational: 100, cr_pctInternational: 0, cr_pctRetour: 0, cr_pctCrbt: 50, cr_pctHorsCrbt: 50, cr_pctVagueMaster: 0, crParCaisson: 40 },
        };
        updateData(defaults[activeTab] || {});
    }, [activeTab, updateData]);

    const handleApplyFluxToAll = useCallback(() => {
        if (!["amana", "co", "cr"].includes(activeTab)) return;
        const source = activeTab;
        const pick = (suffix) => Number(data[`${source}_${suffix}`] ?? 0);

        // Paramètres communs aux 3 prestations
        const common = {
            amana_pctCollecte: pick("pctCollecte"),
            amana_pctMarcheOrdinaire: pick("pctMarcheOrdinaire"),
            amana_pctGuichet: pick("pctGuichet"),
            amana_pctAxesArrivee: pick("pctAxesArrivee"),
            amana_pctAxesDepart: pick("pctAxesDepart"),
            amana_pctRetour: pick("pctRetour"),
            co_pctCollecte: pick("pctCollecte"),
            co_pctMarcheOrdinaire: pick("pctMarcheOrdinaire"),
            co_pctGuichet: pick("pctGuichet"),
            co_pctAxesArrivee: pick("pctAxesArrivee"),
            co_pctAxesDepart: pick("pctAxesDepart"),
            co_pctRetour: pick("pctRetour"),
            cr_pctCollecte: pick("pctCollecte"),
            cr_pctMarcheOrdinaire: pick("pctMarcheOrdinaire"),
            cr_pctGuichet: pick("pctGuichet"),
            cr_pctAxesArrivee: pick("pctAxesArrivee"),
            cr_pctAxesDepart: pick("pctAxesDepart"),
            cr_pctRetour: pick("pctRetour"),
        };

        // Paramètres partagés entre AMANA & CR uniquement
        if (["amana", "cr"].includes(source)) {
            Object.assign(common, {
                amana_pctNational: pick("pctNational"),
                amana_pctInternational: pick("pctInternational"),
                amana_pctCrbt: pick("pctCrbt"),
                amana_pctHorsCrbt: pick("pctHorsCrbt"),
                cr_pctNational: pick("pctNational"),
                cr_pctInternational: pick("pctInternational"),
                cr_pctCrbt: pick("pctCrbt"),
                cr_pctHorsCrbt: pick("pctHorsCrbt"),
            });
        }

        // Paramètres partagés entre CO & CR uniquement
        if (["co", "cr"].includes(source)) {
            Object.assign(common, {
                co_pctVagueMaster: pick("pctVagueMaster"),
                cr_pctVagueMaster: pick("pctVagueMaster"),
            });
        }
        if (source === "co") {
            Object.assign(common, {
                co_pctBoitePostale: pick("pctBoitePostale"),
            });
        }

        updateData(common);
    }, [activeTab, data, updateData]);

    return (
        <div className="wizard-step-content space-y-3 p-3 text-xs bg-gradient-to-br from-[#eef6ff] via-white to-[#f8fbff] rounded-2xl border border-blue-100">
            <div className="flex items-center justify-center gap-3 mb-1.5 px-4 py-2 bg-gradient-to-r from-blue-50/60 via-white to-blue-50/60 border border-blue-100 rounded-xl shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#005EA8] to-[#48cae4] flex items-center justify-center shrink-0 shadow-sm">
                    <Gauge className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                    <h2 className="text-sm font-black text-[#0b3f6f] leading-none">Paramètres</h2>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Configuration par onglets : paramètres généraux et règles par flux</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-[1200px] mx-auto">
                <div className="bg-white border-2 border-[#d7e9ff] rounded-xl p-1.5 shadow-md">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1 bg-transparent h-auto p-0">
                        {tabItems.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <TabsTrigger
                                    key={tab.id}
                                    value={tab.id}
                                    className="h-9 rounded-lg border border-[#e5eefb] bg-[#f8fbff] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#005EA8] data-[state=active]:to-[#0A6BBC] data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:border-[#005EA8] text-[10px] font-black text-slate-700 hover:bg-[#eef5ff] transition-all"
                                >
                                    <span className="inline-flex items-center gap-1.5">
                                        <Icon className="w-3.5 h-3.5" />
                                        {tab.label}
                                    </span>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </div>

                {tabItems.map((tab) => (
                    <TabsContent key={tab.id} value={tab.id} className="mt-2.5 animate-in fade-in-50 slide-in-from-bottom-1 duration-300">
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-2.5 items-start">
                            <div className="xl:col-span-9 space-y-2.5">
                                {filteredSections.map((section) => (
                                    <Card key={section.id} className="wizard-card compact-card h-full border-2 border-blue-100 bg-white shadow-md hover:shadow-lg transition-shadow">
                                        <CardContent className="p-3 flex flex-col h-full">
                                            <div className="wizard-section-title text-sm mb-2.5 justify-center pb-1.5 border-b border-blue-100 bg-gradient-to-r from-[#f3f8ff] to-white rounded-md px-2 py-1">
                                                <section.icon className={`w-3.5 h-3.5 ${section.iconColor}`} />
                                                <span className={section.titleColor}>{section.title}</span>
                                            </div>

                                            <div className="space-y-6 flex-1">
                                                {section.groups.map((group, gIdx) => (
                                                    <div key={gIdx} className="space-y-2.5 rounded-lg border border-slate-100 bg-white p-2.5">
                                                        {group.title !== section.title && (
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-px flex-1 bg-slate-100"></div>
                                                                <span className="text-[10px] font-black text-slate-500 tracking-wider">
                                                                    {group.title}
                                                                </span>
                                                                <div className="h-px flex-1 bg-slate-100"></div>
                                                            </div>
                                                        )}

                                                        <div className={`grid ${section.gridCols} gap-x-2.5 gap-y-2.5 auto-rows-fr`}>
                                                            {group.fields.map((field) => {
                                                                if (field.isSpacer) return null;

                                                                const baseId = field.id.includes('_') ? field.id.split('_').slice(1).join('_') : field.id;
                                                                const displayValue = data[field.id] !== undefined ? data[field.id] : data[baseId];
                                                                const isReadOnlyField = ["natureGeo", "tauxComplexite", "dureeTrajet"].includes(field.id);

                                                                return (
                                                                    <div key={field.id} className="h-full">
                                                                        <FieldWithIcon
                                                                            {...field}
                                                                            value={displayValue}
                                                                            onValueChange={(val) => handleChange(field, val)}
                                                                            disabled={isReadOnlyField}
                                                                            className="h-full"
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {group.footer && (
                                                            <div className={`mt-3 flex items-center justify-between p-2.5 rounded-xl border shadow-sm transition-all duration-300 hover:shadow-md ${group.footer.tone === 'blue'
                                                                ? 'bg-gradient-to-r from-blue-50 to-white border-blue-100'
                                                                : 'bg-gradient-to-r from-amber-50 to-white border-amber-100'
                                                                }`}>
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`p-1.5 rounded-lg shadow-sm ${group.footer.tone === 'blue' ? 'bg-blue-600' : 'bg-amber-500'}`}>
                                                                        <Gauge className="w-3 h-3 text-white" />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className={`text-[8px] uppercase font-black tracking-[0.1em] ${group.footer.tone === 'blue' ? 'text-blue-500' : 'text-amber-600'}`}>
                                                                            {group.footer.label}
                                                                        </span>
                                                                        <span className="text-[10px] font-bold text-slate-400 leading-none mt-0.5">Productivité Op. Nette</span>
                                                                    </div>
                                                                </div>
                                                                <div className={`flex items-baseline gap-1 px-3 py-1.5 rounded-lg border shadow-inner ${group.footer.tone === 'blue'
                                                                    ? 'bg-white border-blue-100 text-blue-700'
                                                                    : 'bg-white border-amber-100 text-amber-700'
                                                                    }`}>
                                                                    <span className="text-sm font-black tracking-tighter tabular-nums">
                                                                        {formatDuration(footerValues[group.footer.valueKey])}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <div className="xl:col-span-3">
                                <Card className="border-2 border-[#b8d8ff] shadow-lg sticky top-3 bg-gradient-to-b from-[#f4f9ff] to-white">
                                    <CardContent className="p-2.5 space-y-2.5">
                                        <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                                            <Grid2X2 className="w-4 h-4 text-[#005EA8]" />
                                            <h3 className="text-xs font-black text-[#0b3f6f] uppercase tracking-wider">Résumé</h3>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-1 gap-1">
                                                <button
                                                    type="button"
                                                    onClick={handleResetCurrentTab}
                                                    className="inline-flex items-center justify-center gap-1.5 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-600 transition-colors"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    Reset onglet
                                                </button>
                                                {["amana", "co", "cr"].includes(activeTab) && (
                                                    <button
                                                        type="button"
                                                        onClick={handleApplyFluxToAll}
                                                        className="inline-flex items-center justify-center gap-1.5 h-8 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[10px] font-bold text-[#005EA8] transition-colors"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                        Appliquer aux 3 prestations
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/60 px-2.5 py-2">
                                                <span className="text-[10px] text-slate-600 font-bold">Staff Centre</span>
                                                <span className="text-[12px] font-black text-[#005EA8] tabular-nums">{formatDuration(heuresNet)}</span>
                                            </div>
                                            <div className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/60 px-2.5 py-2">
                                                <span className="text-[10px] text-slate-600 font-bold">Facteur (Conducteur/Distributeur)</span>
                                                <span className="text-[12px] font-black text-amber-700 tabular-nums">{formatDuration(prodOpFacteur)}</span>
                                            </div>
                                            <div className="rounded-lg border border-blue-100 bg-white px-2.5 py-2 shadow-sm">
                                                <p className="text-[10px] font-bold text-[#0b3f6f] mb-1">Paramètres clés</p>
                                                <div className="space-y-1 text-[10px] text-slate-500">
                                                    <div className="flex justify-between">
                                                        <span>Productivité</span>
                                                        <span className="font-bold text-slate-700">{Number(data.productivite || 0)}%</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Temps mort</span>
                                                        <span className="font-bold text-slate-700">{Number(data.idleMinutes || 0)} min</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Shift</span>
                                                        <span className="font-bold text-slate-700">{Number(data.shift || 0)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
