import React from 'react';
import { Input } from "@/components/ui/input";

// Improved Input Styling
const baseInputClass = "text-[11px] text-center w-full h-7 rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition-all placeholder:text-slate-300 hover:border-blue-400 hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none disabled:opacity-50 disabled:bg-slate-100";

// Grid settings - Flexible width
// 13 columns: 1 Label (80px) + 12 Data columns (equal width)
const gridColsClass = "grid-cols-[80px_repeat(12,minmax(0,1fr))]";

// Helper Components
const HeaderCell = ({ children, className = "", colSpan = 1 }) => (
    <div
        className={`flex items-center justify-center bg-slate-50/50 text-[10px] font-bold text-slate-700 uppercase tracking-wider py-1 border-b border-r border-slate-100 last:border-r-0 ${className}`}
        style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }}
    >
        {children}
    </div>
);

const SubHeaderCell = ({ children, className = "", colSpan = 1 }) => (
    <div
        className={`flex items-center justify-center bg-slate-50/30 text-[10px] font-semibold text-slate-600 py-1 border-b border-r border-slate-100 last:border-r-0 ${className}`}
        style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }}
    >
        {children}
    </div>
);

const LabelCell = ({ children, className = "" }) => (
    <div className={`flex items-center px-2 text-[11px] font-bold text-slate-700 h-8 border-b border-slate-100 ${className}`}>
        {children}
    </div>
);

// Wrapper for the input to give it breathing room
const InputCell = ({ value, onChange, className = "" }) => {

    const formatDisplay = (val) => {
        if (val === "" || val === null || val === undefined) return "";
        const num = parseFloat(String(val).replace(',', '.'));
        if (isNaN(num)) return "";
        return Math.round(num).toLocaleString("fr-FR");
    };

    const handleChange = (e) => {
        const raw = e.target.value;
        if (/^[\d\s,.]*$/.test(raw)) {
            const clean = raw.replace(/[\s\u00A0\u202F]/g, '').replace(',', '.');
            if ((clean.match(/\./g) || []).length > 1) return; // Prevent double dots
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
            />
        </div>
    );
};

const EmptyCell = ({ colSpan = 1, className = "" }) => (
    <div
        className={`h-8 border-b border-r border-slate-100 last:border-r-0 ${className}`}
        style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }}
    />
);

export default function BandoengGrid({ gridValues, handleGridChange }) {

    return (
            <div className="flex gap-4">
                {/* COLUMN 1: LABELS */}
                <div className="w-[80px] flex-shrink-0 pt-[88px] flex flex-col">
                    <LabelCell>Amana</LabelCell>
                    <LabelCell>CR</LabelCell>
                    <LabelCell>CO</LabelCell>
                    <LabelCell>El Barkia</LabelCell>
                    <LabelCell>LRH</LabelCell>
                </div>

                {/* COLUMN 2: DEPART BLOCK */}
                <div className="flex-1 bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
                    <div className="bg-slate-100 py-1 text-center text-xs font-bold text-slate-700 border-b border-slate-200">Départ</div>

                    <div className="grid grid-cols-6">
                        {/* Sub Headers GC / Part */}
                        <SubHeaderCell colSpan={3}>GC</SubHeaderCell>
                        <SubHeaderCell colSpan={3}>Particuliers</SubHeaderCell>

                        {/* Col Headers */}
                        <SubHeaderCell>Global</SubHeaderCell>
                        <SubHeaderCell>Local</SubHeaderCell>
                        <SubHeaderCell>Axes</SubHeaderCell>
                        <SubHeaderCell>Global</SubHeaderCell>
                        <SubHeaderCell>Local</SubHeaderCell>
                        <SubHeaderCell>Axes</SubHeaderCell>

                        {/* AMANA */}
                        <InputCell value={gridValues.amana.depot.gc.global} onChange={(e) => handleGridChange(["amana", "depot", "gc", "global"], e.target.value)} />
                        <InputCell value={gridValues.amana.depot.gc.local} onChange={(e) => handleGridChange(["amana", "depot", "gc", "local"], e.target.value)} />
                        <InputCell value={gridValues.amana.depot.gc.axes} onChange={(e) => handleGridChange(["amana", "depot", "gc", "axes"], e.target.value)} />
                        <InputCell value={gridValues.amana.depot.part.global} onChange={(e) => handleGridChange(["amana", "depot", "part", "global"], e.target.value)} />
                        <InputCell value={gridValues.amana.depot.part.local} onChange={(e) => handleGridChange(["amana", "depot", "part", "local"], e.target.value)} />
                        <InputCell value={gridValues.amana.depot.part.axes} onChange={(e) => handleGridChange(["amana", "depot", "part", "axes"], e.target.value)} />

                        {/* CR */}
                        <InputCell value={gridValues.cr.med.global} onChange={(e) => handleGridChange(["cr", "med", "global"], e.target.value)} />
                        <InputCell value={gridValues.cr.med.local} onChange={(e) => handleGridChange(["cr", "med", "local"], e.target.value)} />
                        <InputCell value={gridValues.cr.med.axes} onChange={(e) => handleGridChange(["cr", "med", "axes"], e.target.value)} />
                        <EmptyCell colSpan={3} />

                        {/* CO */}
                        <InputCell value={gridValues.co.med.global} onChange={(e) => handleGridChange(["co", "med", "global"], e.target.value)} />
                        <InputCell value={gridValues.co.med.local} onChange={(e) => handleGridChange(["co", "med", "local"], e.target.value)} />
                        <InputCell value={gridValues.co.med.axes} onChange={(e) => handleGridChange(["co", "med", "axes"], e.target.value)} />
                        <EmptyCell colSpan={3} />

                        {/* El Barkia */}
                        <InputCell value={gridValues.ebarkia?.med || ""} onChange={(e) => handleGridChange(["ebarkia", "med"], e.target.value)} />
                        <EmptyCell colSpan={5} />

                        {/* LRH */}
                        <InputCell value={gridValues.lrh?.med || ""} onChange={(e) => handleGridChange(["lrh", "med"], e.target.value)} />
                        <EmptyCell colSpan={5} />
                    </div>
                </div>

                {/* COLUMN 3: ARRIVE BLOCK */}
                <div className="flex-1 bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
                    <div className="bg-slate-100 py-1 text-center text-xs font-bold text-slate-700 border-b border-slate-200">Arrivé</div>

                    <div className="grid grid-cols-6">
                        {/* Sub Headers GC / Part */}
                        <SubHeaderCell colSpan={3}>GC</SubHeaderCell>
                        <SubHeaderCell colSpan={3}>Particuliers</SubHeaderCell>

                        {/* Col Headers */}
                        <SubHeaderCell>Global</SubHeaderCell>
                        <SubHeaderCell>Local</SubHeaderCell>
                        <SubHeaderCell>Axes</SubHeaderCell>
                        <SubHeaderCell>Global</SubHeaderCell>
                        <SubHeaderCell>Local</SubHeaderCell>
                        <SubHeaderCell>Axes</SubHeaderCell>

                        {/* AMANA */}
                        <InputCell value={gridValues.amana.recu.gc.global} onChange={(e) => handleGridChange(["amana", "recu", "gc", "global"], e.target.value)} />
                        <InputCell value={gridValues.amana.recu.gc.local} onChange={(e) => handleGridChange(["amana", "recu", "gc", "local"], e.target.value)} />
                        <InputCell value={gridValues.amana.recu.gc.axes} onChange={(e) => handleGridChange(["amana", "recu", "gc", "axes"], e.target.value)} />
                        <InputCell value={gridValues.amana.recu.part.global} onChange={(e) => handleGridChange(["amana", "recu", "part", "global"], e.target.value)} />
                        <InputCell value={gridValues.amana.recu.part.local} onChange={(e) => handleGridChange(["amana", "recu", "part", "local"], e.target.value)} />
                        <InputCell value={gridValues.amana.recu.part.axes} onChange={(e) => handleGridChange(["amana", "recu", "part", "axes"], e.target.value)} />

                        {/* CR */}
                        <InputCell value={gridValues.cr.arrive.global} onChange={(e) => handleGridChange(["cr", "arrive", "global"], e.target.value)} />
                        <InputCell value={gridValues.cr.arrive.local} onChange={(e) => handleGridChange(["cr", "arrive", "local"], e.target.value)} />
                        <InputCell value={gridValues.cr.arrive.axes} onChange={(e) => handleGridChange(["cr", "arrive", "axes"], e.target.value)} />
                        <EmptyCell colSpan={3} />

                        {/* CO */}
                        <InputCell value={gridValues.co.arrive.global} onChange={(e) => handleGridChange(["co", "arrive", "global"], e.target.value)} />
                        <InputCell value={gridValues.co.arrive.local} onChange={(e) => handleGridChange(["co", "arrive", "local"], e.target.value)} />
                        <InputCell value={gridValues.co.arrive.axes} onChange={(e) => handleGridChange(["co", "arrive", "axes"], e.target.value)} />
                        <EmptyCell colSpan={3} />

                        {/* El Barkia */}
                        <InputCell value={gridValues.ebarkia?.arrive || ""} onChange={(e) => handleGridChange(["ebarkia", "arrive"], e.target.value)} />
                        <EmptyCell colSpan={5} />

                        {/* LRH */}
                        <InputCell value={gridValues.lrh?.arrive || ""} onChange={(e) => handleGridChange(["lrh", "arrive"], e.target.value)} />
                        <EmptyCell colSpan={5} />
                    </div>
                </div>
            </div>
    );
}
