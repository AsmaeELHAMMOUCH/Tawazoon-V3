import React, { useState } from "react";
import {
  PieChart,
  BarChart2,
  TrendingUp,
  Menu,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Settings,
  Zap
} from "lucide-react";
import tawazoonLogo from "../assets/LOGO_Tawazoon_RH.png";
import logoBarid from "../assets/BaridLogo.png";
import logoAlmav from "../assets/AlmavLogo.png";

const menuSections = [
  {
    title: "Processus Actuel",
    icon: BarChart2,
    items: [
      "Simulation par Position",
      "Simulation Globale",
      "Capacité Nominale",
      "Schéma Process",
      "Chronogramme de Traitement Unitaire",
    ],
  },
  {
    title: "Processus Recommandé",
    icon: TrendingUp,
    items: [
      "Simulation par Position recommandée",
      "Simulation Globale recommandée",
      "Capacité Nominale Recommandée",
      "Schéma Process recommandé",
      "Chronogramme recommandé",
    ],
  },
  {
    title: "Vue Globale",
    icon: LayoutDashboard,
    items: [
      "Tableau de Bord Global",
      "Ratios",
      "Économies Budgétaires Estimées",
      "Comparatif Positions",
    ],
  },
  {
    title: "Paramétrage",
    icon: Settings,
    items: [
      "Utilisateurs",
      "Paramètres Généraux",
    ],
  },
];

export default function EsignSidebar({ active, onSelect }) {
  const [openSections, setOpenSections] = useState({
    "Processus Actuel": true,
    "Processus Recommandé": true,
    "Vue Globale": true,
    "Paramétrage": false,
  });

  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSection = (title) => {
    if (isCollapsed) return;
    setOpenSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <aside
      className={`hidden lg:flex lg:flex-col bg-white border-r border-slate-200/80 shadow-[4px_0_24px_rgba(0,0,0,0.02)] overflow-hidden sticky top-0 z-40 transition-all duration-500 ease-in-out ${isCollapsed ? "lg:w-[72px]" : "lg:w-64 xl:w-72"}`}
      style={{ height: "100vh" }}
    >
      {/* Header Section */}
      <div className={`flex flex-col ${isCollapsed ? "items-center pt-2 px-2 pb-2" : "pt-1 px-3 pb-1"}`}>
        <div className={`flex items-center ${isCollapsed ? "justify-center mb-4" : "justify-between mb-1"}`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={`flex-shrink-0 transition-all duration-500 ${isCollapsed ? "w-10" : "w-32"}`}>
              <img
                src={tawazoonLogo}
                alt="Tawazoon RH"
                className="w-full h-auto object-contain"
              />
            </div>
            {!isCollapsed && (
              <span className="text-[10px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded shadow-sm tracking-tighter animate-in fade-in slide-in-from-left-2 duration-500">
                E-SIGN
              </span>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100"
            >
              <ChevronRight size={14} className="rotate-180" />
            </button>
          )}
        </div>

        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="mb-6 p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-slate-100 shadow-sm"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <div className={`flex-1 overflow-y-auto ${isCollapsed ? "px-2" : "px-4"} py-2 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent`}>
        {menuSections.map((section, idx) => {
          const Icon = section.icon;
          const isOpen = isCollapsed ? false : openSections[section.title];

          return (
            <div key={section.title} className="space-y-1">
              {!isCollapsed ? (
                <button
                  onClick={() => toggleSection(section.title)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-all duration-300 group shadow-sm
                    bg-[linear-gradient(90deg,#007BFF_0%,#00C6FF_100%)] text-white ring-1 ring-white/20
                    ${isOpen ? "shadow-[0_4px_12px_rgba(0,123,255,0.3)] scale-[1.02]" : "opacity-95 hover:opacity-100 hover:scale-[1.01]"}
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1 rounded-md bg-white/20 text-white">
                      <Icon size={13} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider truncate">
                      {section.title}
                    </h3>
                  </div>
                  <ChevronDown size={14} className={`flex-shrink-0 transition-transform duration-300 ${isOpen ? "rotate-0" : "-rotate-90 text-white/70"}`} />
                </button>
              ) : (
                <div className="flex justify-center group relative py-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 text-slate-500 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-200 transition-all cursor-pointer">
                    <Icon size={18} strokeWidth={1.5} />
                  </div>
                  <div className="fixed left-20 ml-2 bg-slate-900 text-white text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-all translate-x-1 group-hover:translate-x-0 shadow-xl font-medium">
                    {section.title}
                  </div>
                </div>
              )}

              {/* Items List */}
              {(!isCollapsed && isOpen) && (
                <div className="ml-4 pl-3.5 border-l border-slate-200/80 space-y-0.5 mt-1 animate-in fade-in slide-in-from-top-1 duration-300">
                  {section.items.map((label) => {
                    const isActive = active === label;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => onSelect?.(label)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] transition-all duration-200
                          ${isActive
                            ? "bg-blue-50 text-blue-700 font-bold border border-blue-100/50 shadow-sm"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium"
                          }`}
                      >
                        <span className="truncate leading-tight">{label}</span>
                        {isActive && <div className="w-1 h-1 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer / User Profile */}
      <div className="mt-auto border-t border-slate-100 bg-slate-50/30 p-4 space-y-4">
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-1"} group cursor-pointer`}>
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-200 ring-2 ring-white">
              RH
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-slate-900 truncate">
                Session RH
              </p>
              <p className="text-[9px] text-slate-500 font-medium uppercase tracking-tighter">
                Administrateur
              </p>
            </div>
          )}
        </div>

        {/* Partner Logos */}
        <div className={`pt-3 border-t border-slate-200/50 flex items-center gap-4 transition-all duration-300 ${isCollapsed ? "flex-col justify-center" : "justify-center"}`}>
          <img
            src={logoBarid}
            alt="Barid Al-Maghrib"
            className={`object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 hover:scale-105 ${isCollapsed ? "h-6" : "h-7"}`}
          />
          <img
            src={logoAlmav}
            alt="Almav Group"
            className={`object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 hover:scale-105 ${isCollapsed ? "h-6" : "h-7"}`}
          />
        </div>
      </div>
    </aside>
  );
}
