import React, { useState, useEffect } from "react";
import { MapPin, Building, Tag, CheckCircle2, AlertCircle, Users, UserCheck, Clock, Layers, List, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";

export default function Step1CentreSelection({
    data,
    onDataChange,
    onValidationChange,
}) {
    const [regions, setRegions] = useState([]);
    const [typologies, setTypologies] = useState([]);
    const [centres, setCentres] = useState([]);
    const [loading, setLoading] = useState(false);
    const [centreDetails, setCentreDetails] = useState(null);

    // Load regions on mount
    useEffect(() => {
        const fetchRegions = async () => {
            try {
                const res = await api.regions();
                setRegions(res || []);
            } catch (err) {
                console.error("Error loading regions:", err);
            }
        };
        fetchRegions();
    }, []);

    // Load typologies when region changes
    useEffect(() => {
        if (!data.region) {
            setTypologies([]);
            onDataChange({ ...data, typologie: null, centre: null });
            return;
        }

        const fetchTypologies = async () => {
            try {
                const res = await api.categories();
                const filtered = (res || []).filter(
                    (t) => {
                        const label = (t.label || t.nom || "").toUpperCase();
                        return label !== "CENTRE UNIQUE";
                    }
                );
                setTypologies(filtered);
            } catch (err) {
                console.error("Error loading typologies:", err);
            }
        };
        fetchTypologies();
    }, [data.region]);

    // Load centres when typologie changes
    useEffect(() => {
        if (!data.typologie) {
            setCentres([]);
            onDataChange({ ...data, centre: null });
            return;
        }

        const fetchCentres = async () => {
            setLoading(true);
            try {
                const res = await api.centres(data.region);
                const filtered = (res || []).filter(
                    (c) => String(c.categorie_id) === String(data.typologie)
                );
                setCentres(filtered);
            } catch (err) {
                console.error("Error loading centres:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCentres();
    }, [data.typologie, data.region]);

    // Load centre details when centre changes
    useEffect(() => {
        if (!data.centre) {
            setCentreDetails(null);
            onValidationChange(false);
            return;
        }

        const fetchDetails = async () => {
            try {
                const res = await fetch(`/api/bandoeng/centre-details/${data.centre}`);
                if (res.ok) {
                    const details = await res.json();
                    setCentreDetails(details);
                    onValidationChange(true);
                }
            } catch (err) {
                console.error("Error loading centre details:", err);
                onValidationChange(false);
            }
        };
        fetchDetails();
    }, [data.centre, onValidationChange]);

    const selectedRegion = regions.find((r) => String(r.id) === String(data.region));
    const selectedTypologie = typologies.find(
        (t) => String(t.id) === String(data.typologie)
    );
    const selectedCentre = centres.find((c) => String(c.id) === String(data.centre));

    return (
        <div className="wizard-step-content space-y-4 p-4 text-xs">
            <div className="flex items-center justify-center gap-3 mb-1.5 px-4 py-2 bg-gradient-to-r from-blue-50/60 via-white to-blue-50/60 border border-blue-100 rounded-xl shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#005EA8] to-[#48cae4] flex items-center justify-center shrink-0 shadow-sm">
                    <MapPin className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                    <h2 className="text-sm font-black text-[#0b3f6f] leading-none">Sélection du Centre</h2>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Choisissez la région, la typologie et le centre</p>
                </div>
            </div>

            <div className="max-w-xl mx-auto space-y-3">
                {/* Region Selector */}
                <Card className="wizard-card compact-card shadow-sm border border-slate-200">
                    <CardContent className="p-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                <MapPin className="w-4 h-4 text-[#005EA8]" />
                            </div>
                            <div className="flex-1">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                                    Région
                                </Label>
                                <Select
                                    value={data.region || ""}
                                    onValueChange={(val) =>
                                        onDataChange({ ...data, region: val, typologie: null, centre: null })
                                    }
                                >
                                    <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                                        <SelectValue placeholder="-- Sélectionner une région --" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {regions.map((r) => (
                                            <SelectItem key={r.id} value={String(r.id)}>
                                                {r.label || r.nom}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {data.region && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Typologie Selector */}
                <Card className="wizard-card compact-card shadow-sm border border-slate-200">
                    <CardContent className="p-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                                <Tag className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="flex-1">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                                    Typologie
                                </Label>
                                <Select
                                    value={data.typologie || ""}
                                    onValueChange={(val) =>
                                        onDataChange({ ...data, typologie: val, centre: null })
                                    }
                                    disabled={!data.region}
                                >
                                    <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                                        <SelectValue placeholder="-- Sélectionner une typologie --" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {typologies.map((t) => (
                                            <SelectItem key={t.id} value={String(t.id)}>
                                                {t.label || t.nom}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {data.typologie && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Centre Selector */}
                <Card className="wizard-card compact-card shadow-sm border border-slate-200">
                    <CardContent className="p-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                                <Building className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                                    Centre
                                </Label>
                                <Select
                                    value={data.centre || ""}
                                    onValueChange={(val) => onDataChange({ ...data, centre: val })}
                                    disabled={!data.typologie || loading}
                                >
                                    <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                                        <SelectValue placeholder="-- Sélectionner un centre --" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {centres.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>
                                                {c.label || c.nom}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {data.centre && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Centre Details Card */}
                {centreDetails && (
                    <Card className="wizard-card border-blue-100 bg-gradient-to-br from-white to-blue-50/20 shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg">
                        <div className="absolute top-0 right-0 p-1 opacity-10 pointer-events-none">
                            <Building className="w-16 h-16 text-blue-600 rotate-12" />
                        </div>
                        <CardContent className="p-2 relative z-10">
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-1 pb-1 border-b border-blue-100/50">
                                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#005EA8] to-blue-600 flex items-center justify-center shadow-md">
                                    <h2 className="text-white font-bold text-base">C</h2>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xs font-extrabold text-slate-800 leading-none mb-1">
                                        Centre Sélectionné
                                    </h3>
                                </div>
                            </div>

                            {/* Core Info Grid */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-1">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Building className="w-2.5 h-2.5 text-blue-400" /> Nom
                                    </span>
                                    <span className="text-[10px] text-slate-700 font-bold truncate">
                                        {selectedCentre?.label || selectedCentre?.nom}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <MapPin className="w-2.5 h-2.5 text-blue-400" /> Région
                                    </span>
                                    <span className="text-[10px] text-slate-700 font-bold truncate">
                                        {selectedRegion?.label || selectedRegion?.nom}
                                    </span>
                                </div>
                                <div className="col-span-2 flex flex-col gap-0.5 bg-blue-50/50 p-2 rounded-xl border border-blue-100/50">
                                    <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Layers className="w-2.5 h-2.5 text-blue-500" /> Typologie
                                    </span>
                                    <span className="text-[10px] text-[#005EA8] font-black">
                                        {selectedTypologie?.label || selectedTypologie?.nom}
                                    </span>
                                </div>
                            </div>

                            {/* Consolidated Totals - Compact & Light Theme - REMOVED AS IT WILL BE AT THE BOTTOM */}

                            {/* Workforce Dashboard Section */}
                            <div className="mt-3 pt-3 border-t border-slate-100/80 space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.15em]">
                                        Récapitulatif de l'Effectif
                                    </h4>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 shadow-sm hover:bg-indigo-100 transition-colors cursor-pointer group/sites">
                                                <Building className="w-3 h-3 text-indigo-500 group-hover/sites:scale-110 transition-transform" />
                                                <span className="text-[10px] font-black text-indigo-700">{centreDetails.sites_count || 0} {centreDetails.sites_count === 1 ? "Site rattaché" : "Sites rattachés"}</span>
                                                <Eye className="w-2.5 h-2.5 text-indigo-400 opacity-0 group-hover/sites:opacity-100 transition-opacity" />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-0 shadow-xl border-indigo-100" align="end">
                                            <div className="p-3 border-b border-indigo-50 bg-indigo-50/30">
                                                <div className="flex items-center gap-2">
                                                    <Building className="w-3.5 h-3.5 text-indigo-600" />
                                                    <h3 className="text-xs font-black text-indigo-900 uppercase">Sites Rattachés</h3>
                                                </div>
                                            </div>
                                            <ScrollArea className="max-h-[250px]">
                                                <div className="p-2 space-y-1">
                                                    {centreDetails.sites && centreDetails.sites.length > 0 ? (
                                                        centreDetails.sites.map((site, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-50 transition-colors">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></div>
                                                                <span className="text-[11px] font-bold text-slate-700">{site}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-[10px] text-slate-400 text-center py-4 font-bold">Aucun site rattaché</p>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="grid grid-cols-2 gap-1">
                                    {/* Statutaires Card */}
                                    <div className="group relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-3 transition-all duration-300 hover:shadow-md hover:border-blue-200">
                                        <div className="absolute -right-2 -top-2 h-12 w-12 rounded-full bg-blue-50/50 transition-transform duration-500 group-hover:scale-150"></div>
                                        <div className="relative z-10 flex flex-col items-center text-center">
                                            <div className="flex items-center justify-center gap-2 mb-2">
                                                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 shadow-sm shadow-blue-200">
                                                    <Users className="h-3 w-3 text-white" />
                                                </div>
                                                <span className="text-[10px] font-black text-blue-900 uppercase">Statutaires</span>
                                            </div>
                                            
                                            <div className="flex items-baseline justify-center gap-1 mb-1">
                                                <span className="text-xl font-black text-blue-700 leading-none">{centreDetails.total_global || 0}</span>
                                            </div>

                                            <div className="flex flex-col gap-1.5 pt-1 border-t border-blue-50 w-full">
                                                <div className="flex items-center justify-between px-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">MOD</span>
                                                    <span className="text-[10px] font-black text-slate-700">{centreDetails.mod_global || 0}</span>
                                                </div>
                                                <div className="flex items-center justify-between px-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">MOI</span>
                                                    <span className="text-[10px] font-black text-slate-700">{centreDetails.moi_global || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* APS Card */}
                                    <div className="group relative overflow-hidden rounded-2xl border border-amber-100 bg-white p-3 transition-all duration-300 hover:shadow-md hover:border-amber-200">
                                        <div className="absolute -right-2 -top-2 h-12 w-12 rounded-full bg-amber-50/50 transition-transform duration-500 group-hover:scale-150"></div>
                                        <div className="relative z-10 flex flex-col items-center text-center">
                                            <div className="flex items-center justify-center gap-2 mb-2">
                                                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500 shadow-sm shadow-amber-200">
                                                    <Clock className="h-3.5 w-3.5 text-white" />
                                                </div>
                                                <span className="text-[10px] font-black text-amber-900 uppercase">APS</span>
                                            </div>
                                            
                                            <div className="flex items-baseline justify-center gap-1 mb-1">
                                                <span className="text-xl font-black text-amber-600 leading-none">{centreDetails.aps || 0}</span>
                                            </div>

                                            <div className="flex flex-col gap-1.5 pt-1 border-t border-amber-50 w-full">
                                                <div className="flex items-center justify-between px-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">MOD</span>
                                                    <span className="text-[10px] font-black text-slate-700">{centreDetails.aps_mod || 0}</span>
                                                </div>
                                                <div className="flex items-center justify-between px-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">MOI</span>
                                                    <span className="text-[10px] font-black text-slate-700">{centreDetails.aps_moi || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Total Hero Section - Light & Compact */}
                                <div className="relative mt-2 overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50/30 p-2.5 shadow-sm transition-all duration-300 hover:shadow-md">
                                    <div className="relative z-10 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-md shadow-blue-200">
                                                <UserCheck className="h-4 w-4 text-white" />
                                            </div>
                                            <div>
                                                <h5 className="text-[9px] font-black text-blue-800 uppercase tracking-wider leading-none mb-0.5">
                                                    Effectif Global
                                                </h5>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-2xl font-black text-blue-700 tracking-tighter">
                                                {Number(centreDetails.total_global || 0) + Number(centreDetails.aps || 0)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Validation Message */}
                {!data.centre && (
                    <div className="flex items-center gap-2 text-amber-600 text-xs p-2 bg-amber-50 rounded border border-amber-200">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>Veuillez sélectionner un centre pour continuer</span>
                    </div>
                )}
            </div>
        </div>
    );
}
