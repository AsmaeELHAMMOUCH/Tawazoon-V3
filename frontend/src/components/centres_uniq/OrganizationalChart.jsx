import React from 'react';
import { Users, User, Briefcase, TrendingUp, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import Tooltip from '../ui/Tooltip';

const OrgCard = ({ role, name, count, type = 'leaf', icon: Icon, color = 'blue' }) => {
    // Style configurations based on type and color
    // Style configurations based on type and color
    const styles = {
        root: {
            container: "bg-white border-2 border-slate-600 shadow-lg",
            iconBg: "bg-slate-100 text-slate-700",
            name: "text-slate-900 font-bold",
            role: "text-slate-500",
            badge: "bg-blue-100 text-blue-700 font-bold"
        },
        mod: {
            container: "bg-blue-50 border-2 border-blue-200 shadow-md",
            iconBg: "bg-white text-[#005EA8]",
            name: "text-[#005EA8] font-bold",
            role: "text-blue-600",
            badge: "bg-blue-100 text-blue-700 font-bold"
        },
        moi: {
            container: "bg-fuchsia-50 border-2 border-fuchsia-200 shadow-md",
            iconBg: "bg-white text-fuchsia-700",
            name: "text-fuchsia-800 font-bold",
            role: "text-fuchsia-600",
            badge: "bg-blue-100 text-blue-700 font-bold"
        },
        category: { // Fallback/Generic
            container: "bg-white border-2 border-blue-200 shadow-md",
            iconBg: "bg-blue-100 text-blue-600",
            name: "text-slate-800 font-bold",
            role: "text-slate-500",
            badge: "bg-blue-100 text-blue-700 font-bold"
        },
        leaf: {
            container: "bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-blue-300",
            iconBg: "bg-slate-200 text-slate-500",
            name: "text-slate-700 font-medium",
            role: "text-slate-400",
            badge: "bg-blue-100 text-blue-700 font-bold"
        }
    };

    const currentStyle = styles[type] || styles.leaf;

    // Unified sizing for all cards to allow text wrapping
    const containerClass = "w-auto min-w-[150px] max-w-[200px] h-auto min-h-[48px]";

    return (
        <div className={`relative z-10 flex items-center p-1.5 rounded-lg shadow-sm hover:shadow-md transition-all ${containerClass} ${currentStyle.container}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-2 ${currentStyle.iconBg}`}>
                {Icon && <Icon className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
                <div className={`text-[8px] uppercase tracking-wider mb-0.5 ${currentStyle.role}`}>{role}</div>
                <Tooltip content={name || "Non défini"} className="block w-full">
                    <div className={`text-[10px] font-semibold whitespace-normal break-words leading-tight ${currentStyle.name}`}>
                        {name || "Non défini"}
                    </div>
                </Tooltip>
            </div>
            {count !== undefined && (
                <div className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${currentStyle.badge}`}>
                    {count}
                </div>
            )}
        </div>
    );
};

const TreeNode = ({ children, className = "" }) => {
    return (
        <div className={`flex flex-col items-center relative ${className}`}>
            {children}
        </div>
    );
};

const TreeBranch = ({ children }) => {
    return (
        <div className="flex justify-center gap-4 relative mt-6">
            {children}
        </div>
    );
};

const CATEGORY_ORDER = [
    "OPERATION CTD",
    "OPERATION ADMIN",
    "TERRAIN",
    "BACK OFFICE",
    "CHAUFFEUR / COURSIER",
    "GUICHET",
    "MANUTENTION",
    "Contrôle Operation CTD",
    "Contrôle Operation Admin",
    "MOI"
];

const StaffGroupRenderer = ({ staffList }) => {
    // 1. Group Staff by Category
    const groups = {};

    staffList.forEach(staff => {
        const cat = staff.category || "Autres";
        if (!groups[cat]) {
            groups[cat] = {
                name: cat,
                count: 0,
                staff: []
            };
        }
        groups[cat].staff.push(staff);
        groups[cat].count += (staff.effectif || 0);
    });

    // 2. Sort by predefined order, then by name
    const sortedCategories = Object.values(groups).sort((a, b) => {
        const indexA = CATEGORY_ORDER.indexOf(a.name);
        const indexB = CATEGORY_ORDER.indexOf(b.name);

        // Items in the list come first
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;

        // Fallback to alphabetical
        return a.name.localeCompare(b.name);
    });

    if (sortedCategories.length === 0) {
        return <div className="text-sm text-slate-400 italic mt-8">Aucun effectif à afficher</div>;
    }

    return (
        <div className="relative pt-6 w-full">
            {/* Common Horizontal Connector Bar */}
            {/* Common Horizontal Connector Bar Removed - replaced by individual segments */}

            <div className="flex flex-row flex-nowrap justify-center gap-3 items-start relative">
                {sortedCategories.map((group, groupIdx) => (
                    <div key={groupIdx} className="flex flex-col items-center min-w-[160px] relative">
                        {/* Horizontal Connectors (Constrained) */}
                        {groupIdx > 0 && <div className="absolute -top-6 left-0 right-1/2 h-0.5 bg-slate-300"></div>}
                        {groupIdx < sortedCategories.length - 1 && <div className="absolute -top-6 left-1/2 right-0 h-0.5 bg-slate-300"></div>}

                        {/* Vertical Connector from horizontal bar to group box */}
                        <div className="absolute -top-6 h-6 w-0.5 bg-slate-300"></div>

                        {/* Visual Enclosure Box */}
                        <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3 flex flex-col items-center w-full relative shadow-sm">

                            {/* Category Label */}
                            <div className="bg-white px-3 py-1 rounded-full text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-3 border border-slate-200 shadow-sm relative z-10">
                                {group.name}
                                {/* Vertical Connector Down from Category */}
                                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0.5 h-3 bg-slate-300"></div>
                            </div>

                            {/* Leaf Nodes Grid */}
                            <div className="flex flex-col gap-0 w-full items-center relative">
                                {/* Bus Line Removed */}

                                {/* Wrapper for cards - Vertical Stack */}
                                <div className="flex flex-col items-center gap-4 w-full relative pt-2">
                                    {group.staff.map((staff, idx) => (
                                        <div key={idx} className="relative">
                                            {/* Vertical Connectors (Chain) */}
                                            {/* Line from previous item (or top) to this item */}
                                            <div className="absolute left-1/2 -translate-x-1/2 -top-4 h-4 w-0.5 bg-slate-300"></div>

                                            <OrgCard
                                                type="leaf"
                                                role=""
                                                name={staff.name}
                                                count={staff.displayEffectif || staff.effectif || 0}
                                                icon={User}
                                            />

                                            {/* Line to next item if exists */}
                                            {/* Actually, the 'top' connector of the NEXT item handles the space between. 
                                                But we need to ensure the gap is covered. 
                                                Gap is 4 (1rem = 16px). h-4 covers it perfectly.
                                                We just need the top connector on every item.
                                            */}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const OrganizationalChart = ({ chefCentre, moiStaff = [], modStaff = [] }) => {
    // Helper to check if staff is Chef
    const isChef = (s) => {
        const name = (s.name || "").toUpperCase();
        const role = (s.role || s.poste?.label || "").toUpperCase();

        // Handle chefCentre as object or string
        const chefLabelRaw = typeof chefCentre === 'object' ? (chefCentre.name || "Chef de Centre") : chefCentre;
        const chefLabel = (chefLabelRaw || "Chef de Centre").toUpperCase();

        const keywords = ["CHEF DE CENTRE", "DIRECTEUR DE CENTRE", "RESPONSABLE DE CENTRE"];
        const matchesKeyword = keywords.some(k => name.includes(k) || role.includes(k));

        return matchesKeyword || name === chefLabel;
    };

    const filteredMOI = moiStaff.filter(s => !isChef(s));
    const filteredMOD = modStaff.filter(s => !isChef(s));

    // Calculate totals
    const totalMOI = filteredMOI.reduce((sum, staff) => sum + (staff.effectif || 0), 0);
    const totalMOD = filteredMOD.reduce((sum, staff) => sum + (staff.effectif || 0), 0);
    const totalEffectif = totalMOI + totalMOD;

    // Determine Chef Name and Effectif
    const chefName = typeof chefCentre === 'object' ? (chefCentre.name || "Chef de Centre") : (chefCentre || "Chef de Centre");
    const chefEffectif = typeof chefCentre === 'object' ? (chefCentre.effectif || 1) : 1;

    // Total Global (MOI + MOD + Chef)
    const totalGlobal = totalEffectif + chefEffectif;

    // Zoom State
    const [zoom, setZoom] = React.useState(0.8);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.5));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
    const handleReset = () => setZoom(1);

    return (
        <div className="w-full h-full relative bg-slate-50/30 rounded-xl border border-slate-200 overflow-hidden">
            {/* Zoom Controls */}
            <div className="absolute top-2 right-2 z-50 flex flex-col gap-2 bg-white/90 p-1 rounded-lg shadow-md border border-slate-200 backdrop-blur-sm">
                <button onClick={handleZoomIn} className="p-1 hover:bg-slate-100 rounded-md text-slate-600 transition-colors" title="Zoom In">
                    <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={handleZoomOut} className="p-1 hover:bg-slate-100 rounded-md text-slate-600 transition-colors" title="Zoom Out">
                    <ZoomOut className="w-4 h-4" />
                </button>
                <button onClick={handleReset} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 transition-colors" title="Reset">
                    <RotateCcw className="w-4 h-4" />
                </button>
                <div className="text-[9px] text-center font-bold text-slate-400 border-t border-slate-100 pt-1 mt-0.5">
                    {Math.round(zoom * 100)}%
                </div>
            </div>

            {/* Scrollable Area */}
            <div className="w-full h-full overflow-auto p-1 custom-scrollbar">
                {/* Scalable Container */}
                <div
                    className="min-w-max flex flex-col items-center"
                    style={{ zoom: zoom }}
                >


                    {/* Level 0: Root */}
                    <TreeNode className="">
                        <OrgCard
                            type="root"
                            role=""
                            name={chefName}
                            count={`${chefEffectif}`}
                            icon={Briefcase}
                        />
                        {/* Vertical Line Down */}
                        <div className="w-0.5 h-8 bg-slate-300"></div>
                    </TreeNode>

                    {/* Level 1: Categories Container */}
                    <div className="grid grid-cols-2 gap-0 relative w-full mx-auto align-top">
                        {/* Connector Bridge Logic */}
                        <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-slate-300 -mt-[1px]"></div>
                        <div className="absolute top-0 left-1/4 w-0.5 h-6 bg-slate-300 -mt-[1px] -ml-[0px]"></div>
                        <div className="absolute top-0 right-1/4 w-0.5 h-6 bg-slate-300 -mt-[1px] -mr-[0px]"></div>

                        {/* Branch 2: MOD */}
                        <div className="flex flex-col items-center">
                            <div className="mt-2 mb-4 relative">
                                <OrgCard
                                    type="mod"
                                    role=""
                                    name="MOD (Direct)"
                                    count={Math.round(totalMOD)}
                                    icon={Users}
                                />
                                {/* Connector to children */}
                                {filteredMOD.length > 0 && (
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0.5 h-4 bg-slate-300"></div>
                                )}
                            </div>

                            {/* Grouped Content for MOD */}
                            <StaffGroupRenderer staffList={filteredMOD} />
                        </div>

                        {/* Branch 1: MOI */}
                        <div className="flex flex-col items-center">
                            <div className="mt-2 mb-4 relative">
                                <OrgCard
                                    type="moi"
                                    role=""
                                    name="MOI (Indirect)"
                                    count={Math.round(totalMOI)}
                                    icon={Users}
                                />
                                {/* Connector to children */}
                                {filteredMOI.length > 0 && (
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0.5 h-4 bg-slate-300"></div>
                                )}
                            </div>

                            {/* Grouped Content for MOI */}
                            <StaffGroupRenderer staffList={filteredMOI} />
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizationalChart;
