import React from 'react';
import { Input } from "@/components/ui/input";

// Improved Input Styling
const baseInputClass = "text-[11px] text-center w-full h-7 rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition-all placeholder:text-slate-300 hover:border-blue-400 hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none disabled:opacity-50 disabled:bg-slate-100";

// Grid settings - Using fixed widths for consistent input sizes
// 13 columns: 1 Label (80px) + 12 Data columns (90px each)
const gridColsClass = "grid-cols-[80px_repeat(12,90px)]";

// Helper Components - Borders Removed from Headers
const HeaderCell = ({ children, className = "", colSpan = 1 }) => (
    <div
        className={`flex items-center justify-center bg-slate-50/50 text-[10px] font-bold text-slate-700 uppercase tracking-wider py-1 ${className}`}
        style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }}
    >
        {children}
    </div>
);

const SubHeaderCell = ({ children, className = "", colSpan = 1 }) => (
    <div
        className={`flex items-center justify-center bg-slate-50/30 text-[10px] font-semibold text-slate-600 py-1 ${className}`}
        style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }}
    >
        {children}
    </div>
);

const LabelCell = ({ children, className = "" }) => (
    <div className={`flex items-center px-2 text-[11px] font-bold text-slate-700 ${className}`}>
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
        <div className={`flex items-center justify-center p-0.5 ${className}`}>
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
        className={`${className}`}
        style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }}
    />
);

export default function BandoengGrid({ gridValues, handleGridChange }) {

    return (
        <div className="flex flex-col gap-4">

            {/* AMANA BLOCK */}
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg p-1">
                {/* GRID CONTAINER - Removed bg-slate-200 and gap-y-px to remove grid lines */}
                <div className={`grid ${gridColsClass} gap-1`}>

                    {/* ROW 1: DEPOT / RECU */}
                    <EmptyCell />
                    <HeaderCell colSpan={6} className="bg-slate-100 rounded-t-md mx-0.5">Dépôt</HeaderCell>
                    <HeaderCell colSpan={6} className="bg-slate-100 rounded-t-md mx-0.5">Reçu</HeaderCell>

                    {/* ROW 2: GC / PART */}
                    <EmptyCell />
                    <SubHeaderCell colSpan={3} className="bg-slate-50 mx-0.5">GC</SubHeaderCell>
                    <SubHeaderCell colSpan={3} className="bg-slate-50 mx-0.5">Particuliers</SubHeaderCell>
                    <SubHeaderCell colSpan={3} className="bg-slate-50 mx-0.5">GC</SubHeaderCell>
                    <SubHeaderCell colSpan={3} className="bg-slate-50 mx-0.5">Particuliers</SubHeaderCell>

                    {/* ROW 3: FLUX / GLOBAL / LOCAL / AXES... */}
                    <HeaderCell className="text-left px-2 justify-start">Flux</HeaderCell>
                    {/* Headers for Depot GC */}
                    <SubHeaderCell className="text-slate-400">Global</SubHeaderCell>
                    <SubHeaderCell className="text-slate-400">Local</SubHeaderCell>
                    <SubHeaderCell className="text-slate-400">Axes</SubHeaderCell>
                    {/* Headers for Depot Part */}
                    <SubHeaderCell className="text-slate-400">Global</SubHeaderCell>
                    <SubHeaderCell className="text-slate-400">Local</SubHeaderCell>
                    <SubHeaderCell className="text-slate-400">Axes</SubHeaderCell>
                    {/* Headers for Recu GC */}
                    <SubHeaderCell className="text-slate-400">Global</SubHeaderCell>
                    <SubHeaderCell className="text-slate-400">Local</SubHeaderCell>
                    <SubHeaderCell className="text-slate-400">Axes</SubHeaderCell>
                    {/* Headers for Recu Part */}
                    <SubHeaderCell className="text-slate-400">Global</SubHeaderCell>
                    <SubHeaderCell className="text-slate-400">Local</SubHeaderCell>
                    <SubHeaderCell className="text-slate-400">Axes</SubHeaderCell>

                    {/* ROW 4: DATA AMANA */}
                    <LabelCell>Amana</LabelCell>
                    {/* Depot GC */}
                    <InputCell value={gridValues.amana.depot.gc.global} onChange={(e) => handleGridChange(["amana", "depot", "gc", "global"], e.target.value)} />
                    <InputCell value={gridValues.amana.depot.gc.local} onChange={(e) => handleGridChange(["amana", "depot", "gc", "local"], e.target.value)} />
                    <InputCell value={gridValues.amana.depot.gc.axes} onChange={(e) => handleGridChange(["amana", "depot", "gc", "axes"], e.target.value)} />
                    {/* Depot Part */}
                    <InputCell value={gridValues.amana.depot.part.global} onChange={(e) => handleGridChange(["amana", "depot", "part", "global"], e.target.value)} />
                    <InputCell value={gridValues.amana.depot.part.local} onChange={(e) => handleGridChange(["amana", "depot", "part", "local"], e.target.value)} />
                    <InputCell value={gridValues.amana.depot.part.axes} onChange={(e) => handleGridChange(["amana", "depot", "part", "axes"], e.target.value)} />
                    {/* Recu GC */}
                    <InputCell value={gridValues.amana.recu.gc.global} onChange={(e) => handleGridChange(["amana", "recu", "gc", "global"], e.target.value)} />
                    <InputCell value={gridValues.amana.recu.gc.local} onChange={(e) => handleGridChange(["amana", "recu", "gc", "local"], e.target.value)} />
                    <InputCell value={gridValues.amana.recu.gc.axes} onChange={(e) => handleGridChange(["amana", "recu", "gc", "axes"], e.target.value)} />
                    {/* Recu Part */}
                    <InputCell value={gridValues.amana.recu.part.global} onChange={(e) => handleGridChange(["amana", "recu", "part", "global"], e.target.value)} />
                    <InputCell value={gridValues.amana.recu.part.local} onChange={(e) => handleGridChange(["amana", "recu", "part", "local"], e.target.value)} />
                    <InputCell value={gridValues.amana.recu.part.axes} onChange={(e) => handleGridChange(["amana", "recu", "part", "axes"], e.target.value)} />

                </div>
            </div>

            {/* CO, CR, ELBARKIA ET LRH BLOCK */}
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg p-1">

                <div className={`grid ${gridColsClass} gap-1`}>

                    {/* ROW 1: MED / ARRIVE */}
                    <EmptyCell />
                    <HeaderCell colSpan={3} className="bg-slate-100 rounded-t-md mx-0.5">MED</HeaderCell>
                    <HeaderCell colSpan={3} className="bg-slate-100 rounded-t-md mx-0.5">Arrivé</HeaderCell>
                    <EmptyCell colSpan={6} />

                    {/* ROW 2: HEADERS Global/Local/Axes */}
                    <HeaderCell className="text-left px-2 justify-start"></HeaderCell>
                    {/* MED */}
                    <SubHeaderCell className="text-slate-400">Global</SubHeaderCell>
                    <SubHeaderCell className="text-slate-400">Local</SubHeaderCell>
                    <SubHeaderCell className="text-slate-400">Axes</SubHeaderCell>
                    {/* Arrivé */}
                    <SubHeaderCell className="text-slate-400">Global</SubHeaderCell>
                    <SubHeaderCell className="text-slate-400">Local</SubHeaderCell>
                    <SubHeaderCell className="text-slate-400">Axes</SubHeaderCell>
                    <EmptyCell colSpan={6} />

                    {/* ROW 3: CR */}
                    <LabelCell>CR</LabelCell>
                    {/* MED */}
                    <InputCell value={gridValues.cr.med.global} onChange={(e) => handleGridChange(["cr", "med", "global"], e.target.value)} />
                    <InputCell value={gridValues.cr.med.local} onChange={(e) => handleGridChange(["cr", "med", "local"], e.target.value)} />
                    <InputCell value={gridValues.cr.med.axes} onChange={(e) => handleGridChange(["cr", "med", "axes"], e.target.value)} />
                    {/* Arrivé */}
                    <InputCell value={gridValues.cr.arrive.global} onChange={(e) => handleGridChange(["cr", "arrive", "global"], e.target.value)} />
                    <InputCell value={gridValues.cr.arrive.local} onChange={(e) => handleGridChange(["cr", "arrive", "local"], e.target.value)} />
                    <InputCell value={gridValues.cr.arrive.axes} onChange={(e) => handleGridChange(["cr", "arrive", "axes"], e.target.value)} />
                    <EmptyCell colSpan={6} />

                    {/* ROW 4: CO */}
                    <LabelCell>CO</LabelCell>
                    {/* MED */}
                    <InputCell value={gridValues.co.med.global} onChange={(e) => handleGridChange(["co", "med", "global"], e.target.value)} />
                    <InputCell value={gridValues.co.med.local} onChange={(e) => handleGridChange(["co", "med", "local"], e.target.value)} />
                    <InputCell value={gridValues.co.med.axes} onChange={(e) => handleGridChange(["co", "med", "axes"], e.target.value)} />
                    {/* Arrivé */}
                    <InputCell value={gridValues.co.arrive.global} onChange={(e) => handleGridChange(["co", "arrive", "global"], e.target.value)} />
                    <InputCell value={gridValues.co.arrive.local} onChange={(e) => handleGridChange(["co", "arrive", "local"], e.target.value)} />
                    <InputCell value={gridValues.co.arrive.axes} onChange={(e) => handleGridChange(["co", "arrive", "axes"], e.target.value)} />
                    <EmptyCell colSpan={6} />

                    {/* ROW 5: El Barkia */}
                    <LabelCell>El Barkia</LabelCell>
                    {/* MED */}
                    <InputCell value={gridValues.ebarkia?.med || ""} onChange={(e) => handleGridChange(["ebarkia", "med"], e.target.value)} />
                    <EmptyCell colSpan={2} />
                    {/* Arrivé */}
                    <InputCell value={gridValues.ebarkia?.arrive || ""} onChange={(e) => handleGridChange(["ebarkia", "arrive"], e.target.value)} />
                    <EmptyCell colSpan={8} />

                    {/* ROW 6: LRH */}
                    <LabelCell>LRH</LabelCell>
                    {/* MED */}
                    <InputCell value={gridValues.lrh?.med || ""} onChange={(e) => handleGridChange(["lrh", "med"], e.target.value)} />
                    <EmptyCell colSpan={2} />
                    {/* Arrivé */}
                    <InputCell value={gridValues.lrh?.arrive || ""} onChange={(e) => handleGridChange(["lrh", "arrive"], e.target.value)} />
                    <EmptyCell colSpan={8} />


                </div>
            </div>
        </div>
    );
}
