import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Mail, Box, RefreshCw, MapPin as MapIcon, Undo2, Briefcase, Move, MapPin, Globe } from "lucide-react";

// 🔥 CRITICAL: Define components OUTSIDE to prevent recreation on each render (fixes focus loss)
const ParamField = ({ icon: Icon, label, value, onChange, suffix, iconColor = "text-blue-600", iconBg = "bg-blue-50" }) => {
    const handleChange = (e) => {
        const raw = e.target.value;
        if (/^[\d\s,.]*$/.test(raw)) {
            const clean = raw.replace(/[\s\u00A0\u202F]/g, '').replace(',', '.');
            if ((clean.match(/\./g) || []).length > 1) return;
            const num = parseFloat(clean);
            onChange(isNaN(num) ? 0 : num);
        }
    };

    const formatDisplay = (val) => {
        if (val === "" || val === null || val === undefined) return "";
        const num = parseFloat(String(val).replace(',', '.'));
        if (isNaN(num)) return "";
        return num.toLocaleString("fr-FR", {
            minimumFractionDigits: (num % 1 !== 0) ? 1 : 0,
            maximumFractionDigits: 2
        });
    };

    return (
        <div className="flex flex-col gap-1 flex-1">
            <label className="text-[9px] uppercase text-slate-500 font-bold text-center">{label}</label>
            <div className="flex items-center gap-1">
                <div className={`w-5 h-5 rounded-full ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
                    <Icon className="w-3 h-3" />
                </div>
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={formatDisplay(value)}
                        onChange={handleChange}
                        className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full pr-6 text-center border border-transparent rounded-sm hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all"
                    />
                    {suffix && (
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold pointer-events-none">
                            {suffix}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const SelectField = ({ icon: Icon, label, value, onChange, options, iconColor = "text-blue-600", iconBg = "bg-blue-50" }) => (
    <div className="flex flex-col gap-1 flex-1">
        <label className="text-[9px] uppercase text-slate-500 font-bold text-center">{label}</label>
        <div className="flex items-center gap-1">
            <div className={`w-5 h-5 rounded-full ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
                <Icon className="w-3 h-3" />
            </div>
            <Select value={String(value || 1)} onValueChange={(val) => onChange(Number(val))}>
                <SelectTrigger className="h-5 text-xs font-semibold border-none bg-transparent p-0 w-full flex justify-center text-center focus:ring-0 [&>span]:w-full [&>span]:text-center">
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
        </div>
    </div>
);

export default function BandoengAdditionalParams({
    colisAmanaParCanvaSac,
    setColisAmanaParCanvaSac,
    nbrCoSac,
    setNbrCoSac,
    nbrCrSac,
    setNbrCrSac,
    pctCollecte,
    setPctCollecte,
    pctRetour,
    setPctRetour,
    tauxComplexite,
    setTauxComplexite,
    natureGeo,
    setNatureGeo,
    pctAxesArrivee,
    setPctAxesArrivee,
    pctAxesDepart,
    setPctAxesDepart,
    pctMarcheOrdinaire,
    setPctMarcheOrdinaire,
    pctInternational,
    setPctInternational,
    pctNational = 100,
    setPctNational,
    edPercent,
    setEdPercent,
    className = ""
}) {

    return (
        <div className={`bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg ${className}`}>
            <div className="px-2 py-1">
                <div className="flex items-center gap-4 w-full">
                    {/* Groupe 1: Sacs & Contenants */}
                    <div className="flex gap-1 border-r border-slate-200 pr-1 flex-[3]">
                        <ParamField
                            icon={Package}
                            label="Colis/Sac"
                            value={colisAmanaParCanvaSac}
                            onChange={setColisAmanaParCanvaSac}
                            iconColor="text-[#005EA8]"
                            iconBg="bg-blue-50"
                        />
                        <ParamField
                            icon={Mail}
                            label="Co/Sac"
                            value={nbrCoSac}
                            onChange={setNbrCoSac}
                            iconColor="text-sky-600"
                            iconBg="bg-sky-50"
                        />
                        <ParamField
                            icon={Box}
                            label="CR/Caisson"
                            value={nbrCrSac}
                            onChange={setNbrCrSac}
                            iconColor="text-indigo-600"
                            iconBg="bg-indigo-50"
                        />
                    </div>

                    {/* Groupe 2: Coefficients */}
                    <div className="flex gap-1 border-r border-slate-200 pr-1 flex-[2]">
                        <SelectField
                            icon={RefreshCw}
                            label="Coeff Circ"
                            value={tauxComplexite}
                            onChange={setTauxComplexite}
                            options={[
                                { value: 0.5, label: "0,5" },
                                { value: 1, label: "1" },
                                { value: 1.25, label: "1,25" },
                                { value: 1.5, label: "1,5" }
                            ]}
                            iconColor="text-violet-600"
                            iconBg="bg-violet-50"
                        />
                        <SelectField
                            icon={MapIcon}
                            label="Coeff GEO"
                            value={natureGeo}
                            onChange={setNatureGeo}
                            options={[
                                { value: 0.5, label: "0,5" },
                                { value: 1, label: "1" },
                                { value: 1.25, label: "1,25" },
                                { value: 1.5, label: "1,5" }
                            ]}
                            iconColor="text-pink-600"
                            iconBg="bg-pink-50"
                        />
                    </div>

                    {/* Groupe 3: Pourcentages */}
                    <div className="flex gap-1 flex-[6]">
                        <ParamField
                            icon={Undo2}
                            label="% Retour"
                            value={pctRetour}
                            onChange={setPctRetour}
                            suffix="%"
                            iconColor="text-amber-600"
                            iconBg="bg-amber-50"
                        />
                        <ParamField
                            icon={Briefcase}
                            label="% Collecte"
                            value={pctCollecte}
                            onChange={setPctCollecte}
                            suffix="%"
                            iconColor="text-emerald-600"
                            iconBg="bg-emerald-50"
                        />
                        <ParamField
                            icon={Move}
                            label="% Axes"
                            value={pctAxesArrivee}
                            onChange={setPctAxesArrivee}
                            suffix="%"
                            iconColor="text-orange-600"
                            iconBg="bg-orange-50"
                        />
                        <ParamField
                            icon={MapPin}
                            label="% Local"
                            value={pctAxesDepart}
                            onChange={setPctAxesDepart}
                            suffix="%"
                            iconColor="text-[#005EA8]"
                            iconBg="bg-blue-50"
                        />
                        <ParamField
                            icon={Box}
                            label="% March Ord"
                            value={pctMarcheOrdinaire}
                            onChange={setPctMarcheOrdinaire}
                            suffix="%"
                            iconColor="text-slate-600"
                            iconBg="bg-slate-50"
                        />
                        <ParamField
                            icon={Globe}
                            label="% Inter"
                            value={pctInternational}
                            onChange={setPctInternational}
                            suffix="%"
                            iconColor="text-indigo-600"
                            iconBg="bg-indigo-50"
                        />
                        <ParamField
                            icon={Box}
                            label="% ED"
                            value={edPercent}
                            onChange={setEdPercent}
                            suffix="%"
                            iconColor="text-slate-600"
                            iconBg="bg-slate-50"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
