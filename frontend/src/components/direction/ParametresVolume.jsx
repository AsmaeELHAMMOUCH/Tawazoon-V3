import React from 'react';
import {
    Package,
    Mail,
    FileCheck,
    ArrowDownToLine,
    ArrowUpFromLine,
    Archive,
    Settings2,
    Info,
    LayoutGrid,
    Truck,
    Building2,
    Users
} from 'lucide-react';

/* ================= UI COMPONENTS ================= */

const Card = ({ title, subtitle, icon: Icon, children, className = "" }) => (
    <section className={`bg-white/80 backdrop-blur-xl rounded-xl border border-white/60 shadow-sm transition-all hover:shadow-md ${className}`}>
        <header className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-white/50 rounded-t-xl">
            <div className="flex items-center gap-2">
                {Icon && <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Icon size={16} /></div>}
                <div>
                    <h3 className="text-sm font-bold text-gray-800 leading-tight">{title}</h3>
                    {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
                </div>
            </div>
        </header>
        <div className="p-4">{children}</div>
    </section>
);

const SectionHeader = ({ title, icon: Icon, color = "blue" }) => (
    <div className={`flex items-center gap-2 p-2 rounded-lg bg-${color}-50 border border-${color}-100 mb-3`}>
        <Icon size={14} className={`text-${color}-600`} />
        <span className={`text-xs font-bold uppercase tracking-wider text-${color}-700`}>{title}</span>
    </div>
);

const Input = ({ value, onChange, disabled, placeholder, className = "" }) => (
    <input
        type="number"
        min="0"
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`
      h-8 w-full rounded-md border text-xs font-medium text-center transition-all duration-200
      placeholder:text-gray-300
      focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none
      ${disabled
                ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
            }
      ${className}
    `}
    />
);

const Label = ({ children, className = "" }) => (
    <span className={`text-[10px] font-semibold text-gray-500 uppercase tracking-wide truncate ${className}`}>
        {children}
    </span>
);

/* ================= MAIN COMPONENT ================= */

export default function ParametresVolume({ volumes = {}, onChange, disabled = false }) {

    // Safe handler helpers
    const handleChange = (path, value) => {
        if (onChange) onChange(path, value);
    };

    const FLUX_TYPES = [
        { id: 'amana', label: 'Amana', icon: Package, color: 'blue' },
        { id: 'co', label: 'CO', icon: Mail, color: 'slate' },
        { id: 'cr', label: 'CR', icon: FileCheck, color: 'orange' },
        { id: 'ebarkia', label: 'E-Barkia', icon: LayoutGrid, color: 'purple' },
        { id: 'lrh', label: 'LRH', icon: Settings2, color: 'emerald' },
    ];

    /* --- Renders --- */

    const renderRatioInput = (label, key, icon) => (
        <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-gray-50/50 border border-gray-100/50">
            <div className="flex items-center gap-1.5 mb-1">
                <div className="p-1 rounded bg-white shadow-sm text-gray-400">
                    {React.createElement(icon, { size: 12 })}
                </div>
                <Label>{label}</Label>
            </div>
            <Input
                value={volumes?.ratios?.[key]}
                onChange={(e) => handleChange(['ratios', key], e.target.value)}
                disabled={disabled}
                className="bg-white border-gray-200 shadow-sm"
            />
        </div>
    );

    const renderRowLabel = (flux) => (
        <div className="flex items-center gap-2 h-8">
            <div className={`p-1 rounded bg-${flux.color}-50 text-${flux.color}-600`}>
                <flux.icon size={12} />
            </div>
            <span className="text-[11px] font-bold text-gray-700 w-16 truncate" title={flux.label}>
                {flux.label}
            </span>
        </div>
    );

    // Colonnes: Global, Particulier, Pro-B2B, Dist, Axes
    const renderArriveeDepartRow = (flux, sectionKey) => {
        // Si Typologie inconnue => certains champs disabled
        const isUnknown = false; // Placeholder logic

        return (
            <div key={flux.id} className="grid grid-cols-[80px_repeat(5,minmax(0,1fr))] gap-2 items-center mb-1 last:mb-0">
                {renderRowLabel(flux)}

                {['global', 'particulier', 'pro', 'distribution', 'axes'].map((col) => (
                    <Input
                        key={col}
                        value={volumes?.[sectionKey]?.[flux.id]?.[col]}
                        onChange={(e) => handleChange([sectionKey, flux.id, col], e.target.value)}
                        disabled={disabled || (col !== 'global' && isUnknown)} // Exemple condition
                        placeholder="-"
                    />
                ))}
            </div>
        );
    };

    const renderDepotRow = (flux) => (
        <div key={flux.id} className="grid grid-cols-[80px_1fr_1fr] gap-2 items-center mb-1 last:mb-0">
            {renderRowLabel(flux)}
            {['depot', 'recup'].map((col) => (
                <Input
                    key={col}
                    value={volumes?.depot?.[flux.id]?.[col]}
                    onChange={(e) => handleChange(['depot', flux.id, col], e.target.value)}
                    disabled={disabled}
                    placeholder="-"
                />
            ))}
        </div>
    );

    return (
        <Card
            title="Paramètres de Volume"
            subtitle="Configuration détaillée des flux entrants et sortants"
            icon={Archive}
            className="w-full"
        >
            <div className="space-y-4">

                {/* === 1. TOP RATIOS === */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {renderRatioInput("Nbre colis / sac (AMANA)", "amana", Package)}
                    {renderRatioInput("Nbre CO / sac", "co", Mail)}
                    {renderRatioInput("Nbre CR / sac", "cr", FileCheck)}
                </div>

                {/* === 2. MAIN GRID === */}
                <div className="grid grid-cols-1 lg:grid-cols-1 xl:grid-cols-[1.4fr_0.8fr_1.4fr] gap-4">

                    {/* ARRIVÉE */}
                    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm overflow-x-auto">
                        <SectionHeader title="Arrivée" icon={ArrowDownToLine} color="blue" />

                        {/* Header Columns */}
                        <div className="grid grid-cols-[80px_repeat(5, minmax(60px, 1fr))] gap-2 mb-2 px-1 min-w-[400px]">
                            <span></span>
                            <Label className="text-center">Global</Label>
                            <Label className="text-center">Part.</Label>
                            <Label className="text-center text-blue-600">Pro</Label>
                            <Label className="text-center">Dist.</Label>
                            <Label className="text-center">Axes</Label>
                        </div>

                        {/* Rows */}
                        <div className="space-y-1 min-w-[400px]">
                            {FLUX_TYPES.map(flux => renderArriveeDepartRow(flux, 'arrivee'))}
                        </div>
                    </div>

                    {/* DÉPÔT / RÉCUP */}
                    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm overflow-x-auto">
                        <SectionHeader title="Dépôt / Récup." icon={Truck} color="orange" />

                        <div className="grid grid-cols-[80px_repeat(2, minmax(60px, 1fr))] gap-2 mb-2 px-1 min-w-[200px]">
                            <span></span>
                            <Label className="text-center">Dépôt</Label>
                            <Label className="text-center">Récup.</Label>
                        </div>

                        <div className="space-y-1 min-w-[200px]">
                            {FLUX_TYPES.map(renderDepotRow)}
                        </div>
                    </div>

                    {/* DÉPART */}
                    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm overflow-x-auto">
                        <SectionHeader title="Départ" icon={ArrowUpFromLine} color="emerald" />

                        <div className="grid grid-cols-[80px_repeat(5, minmax(60px, 1fr))] gap-2 mb-2 px-1 min-w-[400px]">
                            <span></span>
                            <Label className="text-center">Global</Label>
                            <Label className="text-center">Part.</Label>
                            <Label className="text-center text-emerald-600">Pro</Label>
                            <Label className="text-center">Dist.</Label>
                            <Label className="text-center">Axes</Label>
                        </div>

                        <div className="space-y-1 min-w-[400px]">
                            {FLUX_TYPES.map(flux => renderArriveeDepartRow(flux, 'depart'))}
                        </div>
                    </div>

                </div>

                {/* Footnote */}
                <div className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-500 text-[10px]">
                    <Info size={12} className="mt-0.5" />
                    <p>Certains champs sont non applicables pour la Typologie inconnue et sont donc désactivés. Les valeurs doivent être saisies en nombre d'objets ou sacs.</p>
                </div>

            </div>
        </Card>
    );
}
