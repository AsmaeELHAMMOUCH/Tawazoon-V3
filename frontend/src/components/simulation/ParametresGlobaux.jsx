
import React, { useEffect, useState, useRef } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { api } from '../../lib/api';
import { Settings2, AlertCircle, Activity, Loader2 } from 'lucide-react';

// --- Sub-component: Input Field with Unit Badge ---
const GlobalField = ({
    label,
    value,
    unit,
    onChange,
    readOnly = false,
    loading = false,
    min,
    max
}) => {
    // Micro-interaction: flash effect on value change for read-only fields
    const [flash, setFlash] = useState(false);
    const prevValue = useRef(value);

    useEffect(() => {
        if (readOnly && prevValue.current !== value) {
            setFlash(true);
            const t = setTimeout(() => setFlash(false), 300); // 300ms flash
            prevValue.current = value;
            return () => clearTimeout(t);
        }
    }, [value, readOnly]);

    return (
        <div className="flex flex-col gap-1.5 w-full group">
            <label className="text-[11px] uppercase font-bold tracking-wider text-slate-400 ml-1 transition-colors group-hover:text-[#005EA8]">
                {label}
            </label>

            <div className={`
                relative flex items-center w-full h-11 rounded-xl border transition-all duration-200 overflow-hidden
                ${readOnly
                    ? 'bg-slate-50/50 border-slate-200 cursor-default'
                    : 'bg-white/80 border-slate-300 hover:border-[#005EA8]/50 focus-within:ring-2 focus-within:ring-[#005EA8]/20 focus-within:border-[#005EA8]'
                }
                ${flash ? 'ring-2 ring-emerald-400/50 border-emerald-400' : ''}
            `}>
                <input
                    type="number"
                    min={min}
                    max={max}
                    value={value === 0 ? '' : value}
                    onChange={(e) => !readOnly && onChange && onChange(e.target.value)}
                    readOnly={readOnly}
                    disabled={readOnly}
                    className={`
                        w-full h-full pl-3 pr-12 text-sm outline-none bg-transparent text-right transition-colors font-mono
                        ${readOnly ? 'text-slate-500 font-medium' : 'text-slate-800 font-bold'}
                    `}
                    placeholder="-"
                />

                {/* Unit Badge */}
                <div className="absolute right-2 flex items-center justify-center h-7 min-w-[32px] px-1.5 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500 select-none">
                    {loading ? <Loader2 size={12} className="animate-spin text-[#005EA8]" /> : unit}
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---
export default function ParametresGlobaux() {
    const {
        productivite, setProductivite,
        heuresParJour, setHeuresParJour,
        tempsMort, setTempsMort,
    } = useSimulation();

    // Local state for smooth typing
    const [localProd, setLocalProd] = useState(productivite);
    const [localTempsMort, setLocalTempsMort] = useState(tempsMort);

    // Backend results state
    const [calcHeuresJour, setCalcHeuresJour] = useState(heuresParJour);
    const [calcHeuresNet, setCalcHeuresNet] = useState(0);

    // Status state
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState(null);

    // Initial load sync
    useEffect(() => {
        setLocalProd(productivite);
        setLocalTempsMort(tempsMort);
        // We trigger a calc once to ensure consistency if needed
        triggerCalculation(productivite, tempsMort);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Core Calculation Logic
    const triggerCalculation = async (p, tm) => {
        console.log("triggerCalculation", p, tm);
        setIsSyncing(true);
        setError(null);
        try {
            const res = await api.globalParams({
                productivite: p,
                temps_mort_min: tm
            });
            console.log("API Response:", res);

            if (res) {
                setCalcHeuresJour(res.heures_jour);
                setCalcHeuresNet(res.heures_nettes_jour);

                // Update Global Context to propagate to other views
                setProductivite(res.productivite);
                setHeuresParJour(res.heures_jour);
                setTempsMort(res.temps_mort_min);
            }
        } catch (e) {
            console.error("Calculation error", e);
            setError("Erreur calcul");
        } finally {
            setIsSyncing(false);
        }
    };

    // 500ms Debounce on User Input
    useEffect(() => {
        console.log("useEffect Debounce", localProd, localTempsMort);
        // if (localProd === productivite && localTempsMort === tempsMort) return;

        const timer = setTimeout(() => {
            triggerCalculation(localProd, localTempsMort);
        }, 500);

        return () => clearTimeout(timer);
    }, [localProd, localTempsMort]);


    // Handlers
    const handleProdChange = (val) => {
        let v = parseFloat(val);
        if (isNaN(v)) v = 0;
        if (v < 0) v = 0;
        if (v > 200) v = 200;
        setLocalProd(v);
    };

    const handleTmChange = (val) => {
        let v = parseFloat(val);
        if (isNaN(v)) v = 0;
        if (v < 0) v = 0;
        setLocalTempsMort(v);
    };

    return (
        <div className="w-full max-w-4xl mx-auto mb-8 px-1">
            {/* Card Wrapper with Premium Glassmorphism */}
            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white/50 overflow-hidden">

                {/* Optional Decorative Top Border */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#005EA8]/40 via-[#005EA8] to-[#005EA8]/40 opacity-50"></div>

                <div className="p-5 md:p-6">
                    {/* Header Details */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100/50 shadow-sm">
                                <Settings2 className="text-[#005EA8] w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Paramètres de Simulation</h3>
                                <p className="text-[11px] text-slate-400 font-medium">Définissez les contraintes globales</p>
                            </div>
                        </div>

                        {/* Status / Error Badge */}
                        <div className="flex items-center gap-2">
                            {isSyncing && (
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#005EA8] text-[10px] font-bold animate-pulse border border-blue-100">
                                    <Activity size={12} /> Calcul...
                                </div>
                            )}
                            {error && (
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-100">
                                    <AlertCircle size={12} /> {error}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 4-Columns Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6 md:divide-x md:divide-slate-100">
                        {/* 1. Productivité */}
                        <div className="md:pr-2">
                            <GlobalField
                                label="Productivité"
                                value={localProd}
                                unit="%"
                                onChange={handleProdChange}
                                min={0}
                                max={100}
                            />
                        </div>

                        {/* 2. Heures / Jour (Auto) */}
                        <div className="md:px-2">
                            <GlobalField
                                label="Heures / Jour"
                                value={calcHeuresJour}
                                unit="h"
                                readOnly={true}
                                loading={isSyncing}
                            />
                        </div>

                        {/* 3. Temps Mort */}
                        <div className="md:px-2">
                            <GlobalField
                                label="Temps Mort"
                                value={localTempsMort}
                                unit="min"
                                onChange={handleTmChange}
                                min={0}
                            />
                        </div>

                        {/* 4. Heures Nettes (Auto) */}
                        <div className="md:pl-2">
                            <GlobalField
                                label="Heures Nettes / Jour"
                                value={calcHeuresNet}
                                unit="h"
                                readOnly={true}
                                loading={isSyncing}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

