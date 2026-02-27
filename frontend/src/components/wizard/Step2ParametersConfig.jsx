import React, { useEffect, useCallback, useState } from "react";
import {
    Package, Gauge, Truck, Info, Percent,
    Briefcase, Box, Undo2, Move, MapPin,
    Globe, Map, Mail, RefreshCw, Scale, Timer,
    Clock, Banknote, Layout, Layers, Grid2X2, Home
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
    helperText
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
        <div className={`flex flex-col gap-1 ${className}`}>
            <div className="flex items-center gap-2 w-full">
                <div className="w-8 shrink-0" /> {/* Spacer pour l'alignement avec l'input */}
                <div className="flex-1 flex justify-center items-center gap-1">
                    <label className="text-[9px] uppercase text-slate-500 font-bold text-center leading-none">{label}</label>
                    {helperText && <Info className="w-3 h-3 text-slate-300" title={helperText} />}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full ${iconBg} ${iconColor} flex items-center justify-center shrink-0 shadow-sm border border-white/50`}>
                    <Icon className="w-4 h-4" />
                </div>

                <div className="relative flex-1">
                    {type === "select" ? (
                        <Select value={String(value)} onValueChange={(val) => onValueChange(Number(val))}>
                            <SelectTrigger className="h-8 text-xs font-semibold bg-white border-slate-200 w-full focus:ring-1 focus:ring-blue-200 justify-center text-center">
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
                                className="h-8 text-xs font-semibold text-slate-800 bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 w-full pr-6 text-center"
                            />
                            {suffix && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold pointer-events-none">
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
        gridCols: "grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
        fields: [
            { id: "pctCollecte", label: "Collecte", suffix: "%", icon: Briefcase, iconColor: "text-emerald-600", iconBg: "bg-emerald-50", flux: ["amana", "cr", "co"] },
            { id: "pctMarcheOrdinaire", label: "Marché Ord.", suffix: "%", icon: Box, iconColor: "text-slate-600", iconBg: "bg-slate-50", flux: ["amana", "cr", "co"] },
            { id: "pctAxesArrivee", label: "Axes", suffix: "%", icon: Move, iconColor: "text-orange-600", iconBg: "bg-orange-50", handler: "axesArrivee", flux: ["amana", "cr", "co"] },
            { id: "pctAxesDepart", label: "Local", suffix: "%", icon: MapPin, iconColor: "text-[#005EA8]", iconBg: "bg-blue-50", handler: "axesDepart", flux: ["amana", "cr", "co"] },
            { id: "pctVagueMaster", label: "% vague master", suffix: "%", icon: Layout, iconColor: "text-purple-600", iconBg: "bg-purple-50", flux: ["cr", "co"] },
            { id: "pctBoitePostale", label: "% Boite postale", suffix: "%", icon: Mail, iconColor: "text-blue-600", iconBg: "bg-blue-50", flux: ["cr", "co"] },

            { id: "pctNational", label: "Amana Nat.", suffix: "%", icon: Map, iconColor: "text-cyan-600", iconBg: "bg-cyan-50", handler: "national", flux: ["amana", "cr"] },
            { id: "pctInternational", label: "Amana Int.", suffix: "%", icon: Globe, iconColor: "text-indigo-600", iconBg: "bg-indigo-50", handler: "international", flux: ["amana", "cr"] },
            { id: "pctCrbt", label: "% CRBT", suffix: "%", icon: Banknote, iconColor: "text-amber-600", iconBg: "bg-amber-50", handler: "crbt", flux: ["amana", "cr"] },
            { id: "pctHorsCrbt", label: "% Hors CRBT", suffix: "%", icon: Banknote, iconColor: "text-slate-600", iconBg: "bg-slate-50", handler: "horsCrbt", flux: ["amana", "cr"] },
            { id: "pctRetour", label: "Retour", suffix: "%", icon: Undo2, iconColor: "text-amber-600", iconBg: "bg-amber-50", flux: ["amana", "cr"] },

            { id: "nbrCoSac", label: "CO/Sac", icon: Mail, iconColor: "text-sky-600", iconBg: "bg-sky-50", flux: ["co"] },
            { id: "crParCaisson", label: "CR/Caisson", icon: Box, iconColor: "text-indigo-600", iconBg: "bg-indigo-50", flux: ["cr"] },
            { id: "edPercent", label: "% ED", suffix: "%", icon: Percent, iconColor: "text-slate-600", iconBg: "bg-slate-50", flux: ["amana"] },
            { id: "colisAmanaParCanvaSac", label: "Colis/Sac", icon: Package, iconColor: "text-blue-600", iconBg: "bg-blue-50", flux: ["amana"] },
        ]
    },
    {
        id: "productivity",
        title: "PRODUCTIVITÉ",
        icon: Gauge,
        titleColor: "text-blue-700",
        iconColor: "text-blue-600",
        bgIcon: "bg-blue-50",
        gridCols: "grid-cols-2", // Unified to match Volume's mobile/tablet grid where possible
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
        footer: { label: "Prod. Op. Nette", valueKey: "heuresNet" }
    },
    {
        id: "distribution",
        title: "DISTRIBUTION",
        icon: Truck,
        titleColor: "text-amber-700",
        iconColor: "text-amber-600",
        bgIcon: "bg-amber-50",
        gridCols: "grid-cols-2",
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
                    { value: 0.25, label: "0.25" },
                    { value: 0.5, label: "0.5" },
                    { value: 0.75, label: "0.75" },
                    { value: 1, label: "1" },
                    { value: 1.5, label: "1.5" }
                ]
            },
            {
                id: "tauxComplexite",
                label: "Traffic",
                icon: RefreshCw,
                type: "select",
                iconColor: "text-violet-600",
                iconBg: "bg-violet-50",
                flux: "general",
                options: [
                    { value: 0.25, label: "0.25" },
                    { value: 0.5, label: "0.5" },
                    { value: 0.75, label: "0.75" },
                    { value: 1, label: "1" },
                    { value: 1.5, label: "1.5" }
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
                options: [
                    { value: 1, label: "Oui" },
                    { value: 0, label: "Non" }
                ]
            },
        ],
        footer: { label: "Prod. Op. Facteur", valueKey: "prodOpFacteur" }
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
        return Math.max(0, 8 * prod - idleH);
    }, [data.productivite, data.idleMinutes]);

    // Calculate Productivité Opérationnelle Facteur
    const prodOpFacteur = React.useMemo(() => {
        const net = Number(heuresNet);
        const trajet = Number(data.dureeTrajet || 0) / 60;
        return Math.max(0, net - trajet);
    }, [heuresNet, data.dureeTrajet]);

    // Helper for paired percentage balancing
    const handlePairChange = useCallback((id, val, pairId) => {
        const newValue = Math.max(0, Math.min(100, Number(val || 0)));
        updateData({
            ...data,
            [id]: newValue,
            [pairId]: 100 - newValue,
        });
    }, [data, updateData]);

    const handleChange = useCallback((field, val) => {
        const prefix = field.id.includes('_') ? field.id.split('_')[0] + '_' : '';

        if (field.handler === "national") handlePairChange(`${prefix}pctNational`, val, `${prefix}pctInternational`);
        else if (field.handler === "international") handlePairChange(`${prefix}pctInternational`, val, `${prefix}pctNational`);
        else if (field.handler === "axesArrivee") handlePairChange(`${prefix}pctAxesArrivee`, val, `${prefix}pctAxesDepart`);
        else if (field.handler === "axesDepart") handlePairChange(`${prefix}pctAxesDepart`, val, `${prefix}pctAxesArrivee`);
        else if (field.handler === "crbt") handlePairChange(`${prefix}pctCrbt`, val, `${prefix}pctHorsCrbt`);
        else if (field.handler === "horsCrbt") handlePairChange(`${prefix}pctHorsCrbt`, val, `${prefix}pctCrbt`);
        else {
            updateData({ ...data, [field.id]: val });
        }
    }, [data, updateData, handlePairChange]);

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

    const [activeTab, setActiveTab] = useState("general");
    const displayMode = "grid"; // Toujours en mode panorama

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
                                fields: productivityGroup.fields,
                                footer: productivityGroup.footer
                            },
                            {
                                title: distributionGroup.title,
                                fields: distributionGroup.fields,
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
                                .filter(f => Array.isArray(f.flux) ? f.flux.includes(fluxKey) : f.flux === fluxKey)
                                .map(f => {
                                    const isGlobalTechnical = ["nbrCoSac", "nbrCrSac", "colisAmanaParCanvaSac", "edPercent", "crParCaisson"].includes(f.id);
                                    return !isGlobalTechnical ? { ...f, id: `${fluxKey}_${f.id}` } : f;
                                }), // Préfixage ici seulement si non technique global
                            footer: volumeSection.footer
                        }
                    ].filter(g => g.fields.length > 0)
                };
            });
        }

        return PARAM_SECTIONS
            .filter(section => {
                if (activeTab === "general") {
                    // Dans Général, on ne garde que Productivité et Distribution
                    return section.id === "productivity" || section.id === "distribution";
                } else {
                    // Dans les autres onglets, on ne garde que Volume
                    return section.id === "volume";
                }
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
                                    f.flux === "general" || (Array.isArray(f.flux) && f.flux.includes(activeTab)) || f.flux === activeTab
                                )
                                .map(f => {
                                    const isGlobalTechnical = ["nbrCoSac", "nbrCrSac", "colisAmanaParCanvaSac", "edPercent", "crParCaisson"].includes(f.id);
                                    return (isVolume && !isGlobalTechnical) ? { ...f, id: `${activeTab}_${f.id}` } : f;
                                }), // Préfixage si Volume et non technique global
                            footer: section.footer
                        }
                    ]
                };
            });
    }, [activeTab, displayMode]);

    return (
        <div className="wizard-step-content space-y-4 p-4 text-xs">
            <div className="text-center mb-1">
                <h2 className="text-lg font-bold text-slate-800 mb-0">
                    Paramètres
                </h2>
                <p className="text-xs text-slate-500">
                    Configuration des volumes et de la productivité par flux
                </p>
            </div>



            <div className={`max-w-full mx-auto grid gap-3 items-start ${displayMode === "grid" ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4" : "grid-cols-1 xl:grid-cols-4"}`}>
                {filteredSections.map((section) => (
                    <Card
                        key={section.id}
                        className={`wizard-card compact-card h-full ${displayMode === "tabs"
                            ? (activeTab === "general" ? "xl:col-span-2" : "xl:col-span-4")
                            : "xl:col-span-1"
                            }`}
                    >
                        <CardContent className="p-3 flex flex-col h-full">
                            <div className="wizard-section-title text-sm mb-3 justify-center">
                                <section.icon className={`w-3.5 h-3.5 ${section.iconColor}`} />
                                <span className={section.titleColor}>{section.title}</span>
                            </div>

                            <div className="space-y-6 flex-1">
                                {section.groups.map((group, gIdx) => (
                                    <div key={gIdx} className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-px flex-1 bg-slate-100"></div>
                                            <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                                                {group.title}
                                            </span>
                                            <div className="h-px flex-1 bg-slate-100"></div>
                                        </div>

                                        <div className={`grid ${section.gridCols} gap-x-4 gap-y-4`}>
                                            {group.fields.map((field) => {
                                                // Fallback: si amana_pctCollecte est absent, on cherche pctCollecte
                                                const baseId = field.id.includes('_') ? field.id.split('_').slice(1).join('_') : field.id;
                                                const displayValue = data[field.id] !== undefined ? data[field.id] : data[baseId];

                                                return (
                                                    <div key={field.id}>
                                                        <FieldWithIcon
                                                            {...field}
                                                            value={displayValue}
                                                            onValueChange={(val) => handleChange(field, val)}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {group.footer && (
                                            <div className="mt-2 flex items-center justify-between bg-slate-50/80 p-2 rounded-lg border border-slate-100/50 shadow-sm">
                                                <div className="flex items-center gap-1.5">
                                                    <Info className="w-3 h-3 text-slate-400" />
                                                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-tight">{group.footer.label}</span>
                                                </div>
                                                <span className="font-mono font-bold text-[11px] text-[#005EA8]">
                                                    {formatDuration(footerValues[group.footer.valueKey])}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

        </div>
    );
}
