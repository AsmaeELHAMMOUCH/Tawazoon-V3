import React from 'react';
import { Input } from "@/components/ui/input";

// Improved Input Styling
const baseInputClass = "text-[11px] font-semibold text-center w-full h-7 rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition-all placeholder:text-slate-300 hover:border-blue-400 hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none disabled:opacity-100 disabled:bg-slate-100 disabled:text-slate-700";

// Helper Components
const HeaderCell = ({ children, className = "", colSpan = 1 }) => (
    <div
        className={`flex items-center justify-center bg-slate-50/50 text-[10px] font-bold text-slate-700 uppercase tracking-wider h-6 border-b border-r border-slate-100 last:border-r-0 ${className}`}
        style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }}
    >
        {children}
    </div>
);

const SubHeaderCell = ({ children, className = "", colSpan = 1 }) => (
    <div
        className={`flex items-center justify-center bg-slate-50/30 text-[10px] font-semibold text-slate-600 h-6 border-b border-r border-slate-100 last:border-r-0 ${className}`}
        style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }}
    >
        {children}
    </div>
);

const LabelCell = ({ children, className = "" }) => (
    <div className={`flex items-center px-4 text-[11px] font-bold text-slate-700 h-8 border-b border-r border-slate-100 last:border-r-0 ${className}`}>
        {children}
    </div>
);

const InputCell = ({ value, onChange, className = "", disabled = false }) => {
    const isDisabled = disabled || !onChange;
    const formatDisplay = (val) => {
        if (val === "" || val === null || val === undefined) return "";
        const num = parseFloat(String(val).replace(',', '.'));
        if (isNaN(num)) return "";
        return Math.round(num).toLocaleString("fr-FR");
    };

    const handleChange = (e) => {
        if (!onChange) return;
        const raw = e.target.value;
        if (/^[\d\s,.]*$/.test(raw)) {
            const clean = raw.replace(/[\s\u00A0\u202F]/g, '').replace(',', '.');
            if ((clean.match(/\./g) || []).length > 1) return;
            onChange({ target: { value: clean } });
        }
    };

    return (
        <div className={`flex items-center justify-center p-0.5 h-8 border-b border-r border-slate-100 last:border-r-0 ${className}`}>
            <Input
                type="text"
                className={baseInputClass}
                placeholder="-"
                value={formatDisplay(value)}
                onChange={handleChange}
                disabled={isDisabled}
            />
        </div>
    );
};

// --- HORIZONTAL VENTILATION SCHEMA ---
const HorizontalVentilation = ({ details, colorClass = "blue" }) => {
    const detailTypes = [
        { key: "guichet", label: "Gui." },
        { key: "collecte", label: "Col." },
        { key: "marche", label: "Mar." }
    ];

    const lineColor = colorClass === "blue" ? "text-blue-300" : "text-indigo-300";

    const formatDisplay = (val) => {
        if (val === "" || val === null || val === undefined) return "";
        const num = parseFloat(String(val).replace(',', '.'));
        if (isNaN(num)) return "";
        return Math.round(num).toLocaleString("fr-FR");
    };

    return (
        <div className="flex flex-col items-center w-full">
            {/* SVG Fork connecting DOWN from the row above */}
            <svg width="180" height="20" className={`mb-1.5 ${lineColor} stroke-current opacity-80`} fill="none" strokeWidth="2">
                {/* Vertical Trunk coming from Local Cell above */}
                <path d="M 90 0 L 90 10" />
                {/* Horizontal Bar */}
                <path d="M 30 10 L 150 10" />
                {/* Three Vertical Ends going to inputs */}
                <path d="M 30 10 L 30 20" />
                <path d="M 90 10 L 90 20" />
                <path d="M 150 10 L 150 20" />
            </svg>

            {/* 3 Inputs side by side */}
            <div className="flex items-center justify-center gap-[6px] w-full px-2">
                {detailTypes.map((type) => (
                    <div key={type.key} className="flex flex-col items-center w-[54px]">
                        <Input
                            value={formatDisplay(details?.[type.key])}
                            disabled={true}
                            className="h-8 w-full text-[11px] font-bold text-center p-1 rounded-md border-slate-200 bg-slate-50/50 text-slate-500 shadow-sm"
                            placeholder="-"
                        />
                        <span className="text-[9px] font-black text-slate-500 mt-1 uppercase leading-none tracking-wider">{type.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- SECTION AMANA (PRO + Particuliers) ---
export const AmanaVolumeGrid = ({ gridValues, handleGridChange }) => {
    const getDetails = (flow, group) => {
        const key = `${flow}_${group}`;
        return gridValues.amana?.localDetails?.[key] || {};
    };

    return (
        <div className="flex bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            {/* Labels Column */}
            <div className="w-[80px] shrink-0 pt-[68px] bg-slate-50/50 border-r border-slate-200 flex flex-col">
                <LabelCell className="justify-center text-center border-t border-slate-100 shrink-0 h-8">AMANA</LabelCell>
                <div className="flex-1 flex items-center justify-center p-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-r border-slate-100 bg-slate-50/30">
                    <span className="opacity-60 text-center leading-relaxed">Ventilation<br />Local</span>
                </div>
            </div>

            {/* Depart Block */}
            <div className="flex-1 border-r border-slate-200 flex flex-col">
                <div className="bg-blue-50/50 h-5 flex items-center justify-center text-[10px] font-black text-blue-700 border-b border-slate-200 uppercase tracking-widest leading-none shrink-0">Départ</div>

                {/* Table Data */}
                <div className="grid grid-cols-7 shrink-0 z-10">
                    <div className="row-span-2 flex items-center justify-center bg-blue-50/80 text-[10px] font-black text-blue-800 border-b border-r border-slate-200 uppercase">Total Dép.</div>
                    <SubHeaderCell colSpan={3} className="bg-slate-50/80 border-b border-slate-200">PRO</SubHeaderCell>
                    <SubHeaderCell colSpan={3} className="bg-slate-50/80 border-b border-slate-200">Particuliers</SubHeaderCell>
                    <SubHeaderCell className="text-[9px]">Total Pro</SubHeaderCell>
                    <SubHeaderCell className="text-[9px]">Loc.</SubHeaderCell>
                    <SubHeaderCell className="text-[9px]">Ax.</SubHeaderCell>
                    <SubHeaderCell className="text-[9px]">Total Part.</SubHeaderCell>
                    <SubHeaderCell className="text-[9px]">Loc.</SubHeaderCell>
                    <SubHeaderCell className="text-[9px]">Ax.</SubHeaderCell>

                    {/* Main AMANA Row */}
                    <InputCell
                        value={(parseFloat(gridValues.amana.depot.gc.global) || 0) + (parseFloat(gridValues.amana.depot.part.global) || 0)}
                        disabled={true}
                        className="bg-blue-100/40 text-slate-700 border-b-0"
                    />
                    <InputCell value={gridValues.amana.depot.gc.global} onChange={(e) => handleGridChange(["amana", "depot", "gc", "global"], e.target.value)} />
                    <InputCell value={gridValues.amana.depot.gc.local} disabled={true} className="bg-blue-50/40 border-b-0 opacity-80" />
                    <InputCell value={gridValues.amana.depot.gc.axes} disabled={true} className="opacity-70 bg-slate-50/30" />
                    <InputCell value={gridValues.amana.depot.part.global} onChange={(e) => handleGridChange(["amana", "depot", "part", "global"], e.target.value)} />
                    <InputCell value={gridValues.amana.depot.part.local} disabled={true} className="bg-blue-50/40 border-b-0 opacity-80" />
                    <InputCell value={gridValues.amana.depot.part.axes} disabled={true} className="opacity-70 bg-slate-50/30" />
                </div>

                {/* Horizontal Schema Sub-row */}
                <div className="flex-1 grid grid-cols-[1fr_3fr_3fr] bg-slate-50/20 border-b border-slate-100">
                    <div className="border-r border-slate-100 bg-blue-50/10" /> {/* Space under Total column */}
                    <div className="border-r border-slate-100 flex justify-center py-2 relative">
                        {/* Background connecting block to fill border gap */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[calc(100%/3)] h-1 bg-blue-50/40 opacity-80" />
                        <div className="w-full flex justify-center z-10">
                            <HorizontalVentilation
                                colorClass="blue"
                                details={getDetails("depot", "gc")}
                            />
                        </div>
                    </div>
                    <div className="flex justify-center py-2 relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[calc(100%/3)] h-1 bg-blue-50/40 opacity-80" />
                        <div className="w-full flex justify-center z-10">
                            <HorizontalVentilation
                                colorClass="blue"
                                details={getDetails("depot", "part")}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Arrive Block */}
            <div className="flex-1 flex flex-col">
                <div className="bg-indigo-50/50 h-5 flex items-center justify-center text-[10px] font-black text-indigo-700 border-b border-slate-200 uppercase tracking-widest leading-none shrink-0">Arrivé</div>

                {/* Table Data */}
                <div className="grid grid-cols-7 shrink-0 z-10">
                    <div className="row-span-2 flex items-center justify-center bg-indigo-50/80 text-[10px] font-black text-indigo-800 border-b border-r border-slate-200 uppercase">Total Arr.</div>
                    <SubHeaderCell colSpan={3} className="bg-slate-50/80 border-b border-slate-200">PRO</SubHeaderCell>
                    <SubHeaderCell colSpan={3} className="bg-slate-50/80 border-b border-slate-200">Particuliers</SubHeaderCell>
                    <SubHeaderCell className="text-[9px]">Total PRO</SubHeaderCell>
                    <SubHeaderCell className="text-[9px]">Loc.</SubHeaderCell>
                    <SubHeaderCell className="text-[9px]">Ax.</SubHeaderCell>
                    <SubHeaderCell className="text-[9px]">Total Part.</SubHeaderCell>
                    <SubHeaderCell className="text-[9px]">Loc.</SubHeaderCell>
                    <SubHeaderCell className="text-[9px]">Ax.</SubHeaderCell>

                    {/* Main AMANA Row */}
                    <InputCell
                        value={(parseFloat(gridValues.amana.recu.gc.global) || 0) + (parseFloat(gridValues.amana.recu.part.global) || 0)}
                        disabled={true}
                        className="bg-indigo-100/40 text-slate-700 border-b-0"
                    />
                    <InputCell value={gridValues.amana.recu.gc.global} onChange={(e) => handleGridChange(["amana", "recu", "gc", "global"], e.target.value)} />
                    <InputCell value={gridValues.amana.recu.gc.local} disabled={true} className="bg-indigo-50/40 border-b-0 opacity-80" />
                    <InputCell value={gridValues.amana.recu.gc.axes} disabled={true} className="opacity-70 bg-slate-50/30" />
                    <InputCell value={gridValues.amana.recu.part.global} onChange={(e) => handleGridChange(["amana", "recu", "part", "global"], e.target.value)} />
                    <InputCell value={gridValues.amana.recu.part.local} disabled={true} className="bg-indigo-50/40 border-b-0 opacity-80" />
                    <InputCell value={gridValues.amana.recu.part.axes} disabled={true} className="opacity-70 bg-slate-50/30" />
                </div>

                {/* Horizontal Schema Sub-row */}
                <div className="flex-1 grid grid-cols-[1fr_3fr_3fr] bg-slate-50/20 border-b border-slate-100">
                    <div className="border-r border-slate-100 bg-indigo-50/10" /> {/* Space under Total column */}
                    <div className="border-r border-slate-100 flex justify-center py-2 relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[calc(100%/3)] h-1 bg-indigo-50/40 opacity-80" />
                        <div className="w-full flex justify-center z-10">
                            <HorizontalVentilation
                                colorClass="indigo"
                                details={getDetails("recu", "gc")}
                            />
                        </div>
                    </div>
                    <div className="flex justify-center py-2 relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[calc(100%/3)] h-1 bg-indigo-50/40 opacity-80" />
                        <div className="w-full flex justify-center z-10">
                            <HorizontalVentilation
                                colorClass="indigo"
                                details={getDetails("recu", "part")}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- SECTION STANDARD (Uniquement PRO) ---
export const StandardVolumeGrid = ({ gridValues, handleGridChange }) => {
    const services = [
        { id: 'cr', label: 'CR' },
        { id: 'co', label: 'CO' },
        { id: 'ebarkia', label: 'El Barkia' },
        { id: 'lrh', label: 'LRH' }
    ];

    const getDetails = (serviceId, flow) => {
        return gridValues[serviceId]?.localDetails?.[flow] || {};
    };

    return (
        <div className="flex bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            {/* Labels Column */}
            <div className="w-[80px] shrink-0 pt-[44px] bg-slate-50/50 border-r border-slate-200 flex flex-col">
                {services.map((s, idx) => (
                    <div key={s.id} className="flex flex-col shrink-0">
                        <LabelCell className={idx === 0 ? "border-t border-slate-100" : ""}>{s.label}</LabelCell>
                        {['cr', 'co'].includes(s.id) && (
                            <div className="h-20 flex items-center justify-center text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/20 border-b border-slate-100">
                                <span className="opacity-60 text-center">Ventil.</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Depart Block */}
            <div className="flex-1 border-r border-slate-200">
                <div className="bg-blue-50/50 h-5 flex items-center justify-center text-[10px] font-black text-blue-700 border-b border-slate-200 uppercase tracking-widest leading-none">Départ</div>
                <div className="flex flex-col">
                    {/* Header */}
                    <div className="grid grid-cols-7 shrink-0">
                        <SubHeaderCell className="text-[9px]">Total Dép.</SubHeaderCell>
                        <SubHeaderCell className="text-[9px]">Loc.</SubHeaderCell>
                        <SubHeaderCell className="text-[9px]">Ax.</SubHeaderCell>
                        <div className="col-span-4 h-6 bg-slate-50/20 border-b border-slate-100" />
                    </div>

                    {/* Service Rows */}
                    {services.map(s => (
                        <div key={s.id} className="flex flex-col shrink-0">
                            {['cr', 'co'].includes(s.id) ? (
                                <>
                                    <div className="grid grid-cols-7">
                                        <InputCell 
                                            value={gridValues[s.id].med.global} 
                                            onChange={(e) => handleGridChange([s.id, "med", "global"], e.target.value)} 
                                            className="bg-blue-50/20"
                                        />
                                        <InputCell value={gridValues[s.id].med.local} disabled={true} className="bg-blue-50/40 opacity-80" />
                                        <InputCell value={gridValues[s.id].med.axes} disabled={true} className="opacity-70 bg-slate-50/30" />
                                        <div className="col-span-4 h-8 border-b border-slate-100 bg-slate-50/10" />
                                    </div>
                                    <div className="grid grid-cols-7 bg-slate-50/5 border-b border-slate-100 h-20">
                                        <div className="col-start-1 col-end-4 flex items-start justify-center pt-2 border-r border-slate-100/50">
                                            <div className="w-[180px]">
                                                <HorizontalVentilation
                                                    colorClass="blue"
                                                    details={getDetails(s.id, "med")}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-4" /> {/* Rest of columns */}
                                    </div>
                                </>
                            ) : (
                                <div className="grid grid-cols-7">
                                    <InputCell 
                                        value={gridValues[s.id]?.med || ""} 
                                        onChange={(e) => handleGridChange([s.id, "med"], e.target.value)} 
                                        className="bg-blue-50/10"
                                    />
                                    <div className="h-8 border-b border-r border-slate-100 bg-slate-50/30" />
                                    <div className="h-8 border-b border-r border-slate-100 bg-slate-50/30" />
                                    <div className="col-span-4 h-8 border-b border-slate-100 bg-slate-50/10" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Arrive Block */}
            <div className="flex-1">
                <div className="bg-indigo-50/50 h-5 flex items-center justify-center text-[10px] font-black text-indigo-700 border-b border-slate-200 uppercase tracking-widest leading-none">Arrivé</div>
                <div className="flex flex-col">
                    {/* Header */}
                    <div className="grid grid-cols-7 shrink-0">
                        <SubHeaderCell className="text-[9px]">Total Arr.</SubHeaderCell>
                        <SubHeaderCell className="text-[9px]">Loc.</SubHeaderCell>
                        <SubHeaderCell className="text-[9px]">Ax.</SubHeaderCell>
                        <div className="col-span-4 h-6 bg-slate-50/20 border-b border-slate-100" />
                    </div>

                    {/* Service Rows */}
                    {services.map(s => (
                        <div key={s.id} className="flex flex-col shrink-0">
                            {['cr', 'co'].includes(s.id) ? (
                                <>
                                    <div className="grid grid-cols-7">
                                        <InputCell 
                                            value={gridValues[s.id].arrive.global} 
                                            onChange={(e) => handleGridChange([s.id, "arrive", "global"], e.target.value)} 
                                            className="bg-indigo-50/20"
                                        />
                                        <InputCell value={gridValues[s.id].arrive.local} disabled={true} className="bg-indigo-50/40 opacity-80" />
                                        <InputCell value={gridValues[s.id].arrive.axes} disabled={true} className="opacity-70 bg-slate-50/30" />
                                        <div className="col-span-4 h-8 border-b border-slate-100 bg-slate-50/10" />
                                    </div>
                                    <div className="grid grid-cols-7 bg-slate-50/5 border-b border-slate-100 h-20">
                                        <div className="col-start-1 col-end-4 flex items-start justify-center pt-2 border-r border-slate-100/50">
                                            <div className="w-[180px]">
                                                <HorizontalVentilation
                                                    colorClass="indigo"
                                                    details={getDetails(s.id, "arrive")}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-4" /> {/* Rest of columns */}
                                    </div>
                                </>
                            ) : (
                                <div className="grid grid-cols-7">
                                    <InputCell 
                                        value={gridValues[s.id]?.arrive || ""} 
                                        onChange={(e) => handleGridChange([s.id, "arrive"], e.target.value)} 
                                        className="bg-indigo-50/10"
                                    />
                                    <div className="h-8 border-b border-r border-slate-100 bg-slate-50/30" />
                                    <div className="h-8 border-b border-r border-slate-100 bg-slate-50/30" />
                                    <div className="col-span-4 h-8 border-b border-slate-100 bg-slate-50/10" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Default export as wrapper for backward compatibility or simple usage
export default function BandoengGrid({ gridValues, handleGridChange }) {
    return (
        <div className="space-y-6">
            <AmanaVolumeGrid gridValues={gridValues} handleGridChange={handleGridChange} />
            <StandardVolumeGrid gridValues={gridValues} handleGridChange={handleGridChange} />
        </div>
    );
}
