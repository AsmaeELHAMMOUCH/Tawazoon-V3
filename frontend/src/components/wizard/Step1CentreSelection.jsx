import React, { useState, useEffect } from "react";
import { MapPin, Building, Tag, CheckCircle2, AlertCircle, Users, UserCheck, Clock, Layers } from "lucide-react";
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
            <div className="text-center mb-1">
                <h2 className="text-lg font-bold text-slate-800 mb-0">
                    Sélection du Centre
                </h2>
                <p className="text-xs text-slate-500">
                    Choisissez la région, la typologie et le centre pour la simulation
                </p>
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

                            {/* Consolidated Totals - Compact & Light Theme */}
                            {centreDetails.total_global > 0 && (
                                <div className="grid grid-cols-2 gap-2 bg-blue-50/50 p-2 rounded-xl border border-blue-100 shadow-sm mb-1 transform hover:scale-[1.01] transition-transform">
                                    <div className="flex items-center justify-between px-2 border-r border-blue-100 last:border-0">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                                            Statutaire
                                        </span>
                                        <span className="text-xs font-black text-[#005EA8]">
                                            {centreDetails.total_global}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between px-2">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                                            Effectif Total
                                        </span>
                                        <span className="text-xs font-black text-blue-700">
                                            {Number(centreDetails.total_global) + Number(centreDetails.aps || 0)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Breakdown Section */}
                            <div className="mt-2 pt-3 border-t border-slate-100/60">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                        Récapitulatif Effectif Actuel
                                    </h4>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-white border border-blue-100 rounded-xl p-2 text-center transition-all hover:border-blue-300 hover:shadow-sm">
                                        <div className="flex flex-col items-center">
                                            <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center mb-1">
                                                <Users className="w-3.5 h-3.5 text-blue-600" />
                                            </div>
                                            <span className="text-blue-900 font-bold text-[11px] leading-none mb-0.5">{centreDetails.mod_global || 0}</span>
                                            <span className="text-[8px] text-blue-500 font-bold uppercase tracking-tighter">MOD</span>
                                        </div>
                                    </div>
                                    <div className="bg-white border border-purple-100 rounded-xl p-2 text-center transition-all hover:border-purple-300 hover:shadow-sm">
                                        <div className="flex flex-col items-center">
                                            <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center mb-1">
                                                <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                                            </div>
                                            <span className="text-purple-900 font-bold text-[11px] leading-none mb-0.5">{centreDetails.moi_global || 0}</span>
                                            <span className="text-[8px] text-purple-500 font-bold uppercase tracking-tighter">MOI</span>
                                        </div>
                                    </div>
                                    <div className="bg-white border border-orange-100 rounded-xl p-2 text-center transition-all hover:border-orange-300 hover:shadow-sm">
                                        <div className="flex flex-col items-center">
                                            <div className="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center mb-1">
                                                <Clock className="w-3.5 h-3.5 text-orange-600" />
                                            </div>
                                            <span className="text-orange-900 font-bold text-[11px] leading-none mb-0.5">{centreDetails.aps || 0}</span>
                                            <span className="text-[8px] text-orange-500 font-bold uppercase tracking-tighter">APS</span>
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
