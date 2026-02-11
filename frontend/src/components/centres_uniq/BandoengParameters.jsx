import React from "react";
import {
    Clock,
    Gauge,
    Sliders,
    Package,
    Mail,
    Box,
    Percent,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function BandoengParameters({ params, handleParamChange, className = "", netCapacity }) {
    // Helper for safe number handling
    const safeNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));

    // Sync handlers for ED% vs %Sac
    const handleEdChange = (val) => {
        const ed = safeNum(val);
        const sac = Math.max(0, 100 - ed);
        handleParamChange("ed_percent", ed);
        handleParamChange("pct_sac", sac);
    };

    const handleSacChange = (val) => {
        const sac = safeNum(val);
        const ed = Math.max(0, 100 - sac);
        handleParamChange("pct_sac", sac);
        handleParamChange("ed_percent", ed);
    };

    return (
        <div className={`bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg px-2 py-1 ${className}`}>
            <div className="flex flex-wrap items-center gap-2">
                {/* Shift Parameter */}
                <div className="flex items-center gap-1.5 min-w-[60px] flex-1">
                    <div className="w-5 h-5 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                    </div>
                    <div className="flex flex-col w-full">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider text-center">
                            Shift
                        </label>
                        <div className="relative">
                            <Select
                                value={String(params.shift || 1)}
                                onValueChange={(val) => handleParamChange("shift", val)}
                            >
                                <SelectTrigger className="h-4 text-xs font-semibold border-none bg-transparent p-0 w-full flex justify-center text-center focus:ring-0 [&>span]:w-full [&>span]:text-center">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1" className="justify-center">1</SelectItem>
                                    <SelectItem value="2" className="justify-center">2</SelectItem>
                                    <SelectItem value="3" className="justify-center">3</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="w-px h-5 bg-slate-200 hidden md:block" />

                {/* Productivité */}
                <div className="flex items-center gap-1.5 min-w-[70px] flex-1">
                    <div className="w-5 h-5 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                        <Gauge className="w-2.5 h-2.5" />
                    </div>
                    <div className="flex flex-col w-full">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider text-center">
                            Productivité
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min={0}
                                max={200}
                                value={params.productivite ?? 100}
                                placeholder="100"
                                onChange={(e) => handleParamChange("productivite", e.target.value)}
                                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full pr-3 text-center"
                            />
                            <span className="absolute right-0 top-0 text-[8px] text-slate-400 font-bold pointer-events-none">
                                %
                            </span>
                        </div>
                    </div>
                </div>

                <div className="w-px h-5 bg-slate-200 hidden md:block" />

                {/* Temps mort */}
                <div className="flex items-center gap-1.5 min-w-[80px] flex-1">
                    <div className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                    </div>
                    <div className="flex flex-col w-full">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider text-center">
                            Temps mort
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min={0}
                                value={params.idle_minutes ?? 0}
                                onChange={(e) => handleParamChange("idle_minutes", e.target.value)}
                                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none w-full pr-5 text-center"
                            />
                            <span className="absolute right-0 top-0 text-[8px] text-slate-400 font-bold pointer-events-none">
                                min
                            </span>
                        </div>
                    </div>
                </div>
                <div className="w-px h-5 bg-slate-200 hidden md:block" />
                {/* Optional Net Capacity Display */}
                {netCapacity && (
                    <>
                        <div className="w-px h-5 bg-slate-200 hidden md:block" />
                        <div className="flex items-center gap-1.5 min-w-[80px] flex-1 bg-white/50 rounded-lg border border-slate-200/60 px-2 py-0.5 shadow-sm">
                            <div className="w-5 h-5 rounded-full bg-blue-50 text-[#005EA8] flex items-center justify-center shrink-0">
                                <Clock className="w-2.5 h-2.5" />
                            </div>
                            <div className="flex flex-col w-full">
                                <label className="text-[8px] font-bold text-[#005EA8] uppercase tracking-wider text-center">
                                    Capacité
                                </label>
                                <div className="text-xs font-extrabold text-slate-800 text-center leading-none">
                                    {netCapacity}
                                </div>
                            </div>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}
