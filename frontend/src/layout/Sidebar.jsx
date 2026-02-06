"use client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Zap,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ListChecks,
  BookText,
  Workflow,
  TimerReset,
  LayoutDashboard,
  BarChart3,
  PiggyBank,
  ArrowLeftRight,
  Tag,
  History,
  Building, // 🆕 Import
  Layers, // 🆕 Import
  UserRound, // 🆕 Import
  HelpCircle, // 🆕 Import
} from "lucide-react";
import { cn } from "@/lib/utils";
import tawazoonLogo from "@/assets/LOGO_Tawazoon_RH.png";
import logoBarid from "@/assets/BaridLogo.png";
import logoAlmav from "@/assets/AlmavLogo.png";

export default function Sidebar({
  onLogout,
  activeTab,
  collapsed = false,
  onToggle,
  isMobile = false, // New prop
}) {
  const navigate = useNavigate();

  const [openSections, setOpenSections] = useState({
    showActuel: true,
    showRecommande: true,
    showVueGlobale: true,
    showParametrage: false,
    showSimActuel: false,
    showSimRecommande: false,
  });

  const toggle = (key) =>
    setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  // Helper to handle navigation and auto-close on mobile
  const handleNav = (path) => {
    navigate(path);
    if (isMobile && onToggle) onToggle(); // Close sheet
  };

  const commonElements = [
    { label: "Capacité Nominale", icon: FileText, key: "capacite-nominale" },
    { label: "Normes", icon: ListChecks, key: "normes" },
    { label: "Référentiel", icon: BookText, key: "referentiel" },
    { label: "Schéma", icon: Workflow, key: "schema" },
    { label: "Chronogramme", icon: TimerReset, key: "chronogramme" },
    { label: "Catégorisation Des Centres", icon: Tag, key: "categorisation" },
  ];

  const simulationItems = [
    { label: "Par Intervenant", slug: "", flux: "poste" },
    { label: "Par Centre", slug: "centre", flux: "centre" },
    { label: "Par Région", slug: "direction", flux: "direction" },
    { label: "National", slug: "national", flux: "national" },
    { label: "Niveau Siège", slug: "region", flux: "siege" },
  ];

  const vueGlobaleSub = [
    {
      label: "Tableau de Bord Global",
      icon: LayoutDashboard,
      path: "/app/vue-globale/tableau",
    },
    { label: "Ratios", icon: BarChart3, path: "/app/vue-globale/ratios" },
    {
      label: "Économies budgétaires",
      icon: PiggyBank,
      path: "/app/vue-globale/economies-budgetaires",
    },
    {
      label: "Comparatif Positions",
      icon: ArrowLeftRight,
      path: "/app/vue-globale/comparatif",
    },
    {
      label: "Historique Simulations",
      icon: History,
      path: "/app/simulations/history",
    },
  ];

  const ItemButton = ({ onClick, children, className }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-2 px-2 " +
        "py-[clamp(2px,0.25vw,4px)] " +
        "text-[clamp(9px,0.75vw,11px)] font-medium text-gray-700 " +
        "hover:bg-slate-100 rounded-md leading-tight text-left transition",
        className
      )}
    >
      {children}
    </button>
  );

  const SectionHeader = ({
    title,
    showKey,
    variant,
    icon: Icon,
    collapsed,
    menuPath,
    noChevron = false,
  }) => {
    const styles = {
      actuel:
        "bg-[linear-gradient(90deg,#007BFF_0%,#00C6FF_100%)] text-white shadow-[0_2px_7px_rgba(0,150,255,0.32)] ring-1 ring-white/30 transition-all duration-300",
      recommande:
        "bg-[linear-gradient(90deg,#007BFF_0%,#00C6FF_100%)] text-white shadow-[0_2px_7px_rgba(0,150,255,0.32)] ring-1 ring-white/30 transition-all duration-300",
      globale:
        "bg-[linear-gradient(90deg,#007BFF_0%,#00C6FF_100%)] text-white shadow-[0_2px_7px_rgba(0,150,255,0.32)] ring-1 ring-white/30 transition-all duration-300",
    };

    return (
      <div className="relative mb-1">
        <button
          onClick={() => {
            if (menuPath) handleNav(menuPath);
            else if (showKey) toggle(showKey);
          }}
          className={cn(
            "w-full flex items-center justify-between rounded-lg overflow-hidden " +
            "px-2 py-[clamp(2px,0.28vw,5px)] " +
            "text-[clamp(9px,0.8vw,11px)] font-semibold",
            styles[variant],
            collapsed &&
            "justify-center px-0 py-1 aspect-square rounded-xl hover:scale-105 transition-transform duration-200"
          )}
          aria-expanded={showKey ? openSections[showKey] : undefined}
          title={collapsed ? title : undefined}
        >
          <div className={cn("flex items-center gap-1.5", collapsed && "gap-0")}>
            {Icon && (
              <div
                className={cn(
                  "flex items-center justify-center rounded-md transition-all duration-200",
                  collapsed ? "w-6 h-6 bg-white/20" : "w-4 h-4"
                )}
              >
                <Icon className="text-white w-3 h-3" />
              </div>
            )}
            {!collapsed && <span>{title}</span>}
          </div>

          {!collapsed && !noChevron && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (showKey) toggle(showKey);
              }}
              role="button"
              tabIndex={0}
              className="ml-1 p-[2px] rounded hover:bg-white/10"
            >
              {openSections[showKey] ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </span>
          )}
        </button>
      </div>
    );
  };

  const SimulationSubGroup = ({ basePath, openKey, mode }) => (
    <div className="mt-0.5">
      <button
        onClick={() => toggle(openKey)}
        className={
          "w-full flex items-center justify-between font-semibold text-slate-700 px-2 " +
          "py-[clamp(2px,0.25vw,4px)] " +
          "text-[clamp(9px,0.75vw,11px)] rounded-md hover:bg-slate-100 transition"
        }
      >
        <span className="inline-flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-[#0A6BBC]" />
          Simulation
        </span>
        {openSections[openKey] ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {openSections[openKey] && (
        <div className="relative ml-2 pl-2 mt-0.5">
          <div className="absolute left-2 top-1.5 bottom-1.5 w-px bg-slate-200/80" />
          {simulationItems.map((item) => (
            <ItemButton
              key={`${openKey}-${item.flux}`}
              onClick={() => {
                const path = item.slug ? `${basePath}/${item.slug}` : basePath;
                navigate(path, { state: { flux: item.flux, mode: mode } });
                if (isMobile && onToggle) onToggle();
              }}
              className="relative pl-6 items-start leading-tight text-left"
            >
              <span className="pointer-events-none absolute left-2 top-1.5 w-3 h-3 border-l border-t border-slate-200/80 rounded-tl" />
              <span className="block">{item.label}</span>
            </ItemButton>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <aside
      className={cn(
        "h-full text-slate-800 flex flex-col border-r border-slate-200 shadow-md",
        "bg-gradient-to-b from-white to-slate-50/70 backdrop-blur-sm transition-all duration-300",
        // Width classes only apply if NOT mobile (mobile handles width via Sheet)
        !isMobile && (collapsed ? "w-[72px]" : "w-[240px]"),
        isMobile && "w-full"
      )}
      style={!isMobile ? {
        width: collapsed ? 72 : 240,
        minWidth: collapsed ? 72 : 240,
        maxWidth: collapsed ? 72 : 240,
        flexShrink: 0,
      } : {}}
    >
      {/* HEADER SIDEBAR */}
      <div className="h-14 flex items-center justify-between px-2 
        bg-gradient-to-r from-[#005EA8]/30 to-[#0A6BBC]/60 
        text-white border-b border-white/40">

        <div className="flex items-center gap-2">
          <img
            src={tawazoonLogo}
            alt="Logo"
            className={cn("object-contain", collapsed ? "w-20 h-20" : "w-40 h-40")}
          />

        </div>

        {/* Hide collapse toggle on mobile */}
        {!isMobile && (
          <button onClick={onToggle} className="p-1 rounded-md hover:bg-white/10">
            <ChevronRight
              className={cn(
                "w-3 h-3 transition-transform",
                !collapsed && "rotate-180"
              )}
            />
          </button>
        )}
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-2">
        {/* 🔵 Processus Actuel */}
        <div>
          <SectionHeader
            variant="actuel"
            title="Processus Actuel"
            showKey="showActuel"
            icon={Workflow}
            collapsed={collapsed}
            menuPath="/app/actuel/menu"
          />

          {!collapsed && openSections.showActuel && (
            <div className="relative ml-2 pl-2">
              <div className="absolute left-2 top-1.5 bottom-1.5 w-px bg-slate-200/80" />

              <SimulationSubGroup
                basePath="/app/simulation"
                openKey="showSimActuel"
                mode="actuel"
              />

              {commonElements.map(({ label, key }) => (
                <ItemButton
                  key={`actuel-${key}`}
                  onClick={() => handleNav(`/app/actuel/${key}`)}
                  className="relative pl-6"
                >
                  <span className="pointer-events-none absolute left-2 top-1.5 w-3 h-3 border-l border-t border-slate-200/80 rounded-tl" />
                  {label}
                </ItemButton>
              ))}
            </div>
          )}
        </div>

        {/* 🟢 Processus Recommandé */}
        <div>
          <SectionHeader
            variant="recommande"
            title="Processus Recommandé"
            showKey="showRecommande"
            icon={BookText}
            collapsed={collapsed}
            menuPath="/app/recommande/menu"
          />

          {!collapsed && openSections.showRecommande && (
            <div className="relative ml-2 pl-2">
              <div className="absolute left-2 top-1.5 bottom-1.5 w-px bg-slate-200/80" />

              <SimulationSubGroup
                basePath="/app/simulation"
                openKey="showSimRecommande"
                mode="recommande"
              />

              {commonElements.map(({ label, key }) => (
                <ItemButton
                  key={`recommande-${key}`}
                  onClick={() => handleNav(`/app/recommande/${key}`)}
                  className="relative pl-6"
                >
                  <span className="pointer-events-none absolute left-2 top-1.5 w-3 h-3 border-l border-t border-slate-200/80 rounded-tl" />
                  {label}
                </ItemButton>
              ))}
            </div>
          )}
        </div>

        {/* 🌍 Vue Globale */}
        <div>
          <SectionHeader
            variant="globale"
            title="Vue Globale"
            showKey="showVueGlobale"
            icon={LayoutDashboard}
            collapsed={collapsed}
            menuPath="/app/vue-globale/menu"
          />

          {!collapsed && openSections.showVueGlobale && (
            <div className="relative ml-2 pl-2 mb-0.5">
              <div className="absolute left-2 top-1.5 bottom-1.5 w-px bg-slate-200/80" />

              {vueGlobaleSub.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNav(item.path)}
                  className={
                    "relative w-full text-left rounded-md hover:bg-slate-100 text-gray-700 " +
                    "pl-6 pr-2 py-[clamp(2px,0.25vw,4px)] " +
                    "text-[clamp(9px,0.75vw,11px)] transition"
                  }
                >
                  <span className="pointer-events-none absolute left-2 top-1.5 w-3 h-3 border-l border-t border-slate-200/80 rounded-tl" />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 🔧 Paramétrage */}
        <div>
          <SectionHeader
            variant="globale"
            title="Paramétrage"
            showKey="showParametrage"
            icon={Settings}
            collapsed={collapsed}
          />

          {!collapsed && openSections.showParametrage && (
            <div className="relative ml-2 pl-2 mb-0.5">
              <div className="absolute left-2 top-1.5 bottom-1.5 w-px bg-slate-200/80" />

              <button
                onClick={() => handleNav('/app/taches-manager')}
                className={
                  "relative w-full text-left rounded-md hover:bg-slate-100 text-gray-700 " +
                  "pl-6 pr-2 py-[clamp(2px,0.25vw,4px)] " +
                  "text-[clamp(9px,0.75vw,11px)] transition"
                }
              >
                <span className="pointer-events-none absolute left-2 top-1.5 w-3 h-3 border-l border-t border-slate-200/80 rounded-tl" />
                Gestion Tâches
              </button>

              <button
                onClick={() => handleNav('/app/builder')}
                className={
                  "relative w-full text-left rounded-md hover:bg-slate-100 text-gray-700 " +
                  "pl-6 pr-2 py-[clamp(2px,0.25vw,4px)] " +
                  "text-[clamp(9px,0.75vw,11px)] transition"
                }
              >
                <span className="pointer-events-none absolute left-2 top-1.5 w-3 h-3 border-l border-t border-slate-200/80 rounded-tl" />
                Ajout Tâche
              </button>

              <button
                onClick={() => handleNav('/app/postes-manager')}
                className={
                  "relative w-full text-left rounded-md hover:bg-slate-100 text-gray-700 " +
                  "pl-6 pr-2 py-[clamp(2px,0.25vw,4px)] " +
                  "text-[clamp(9px,0.75vw,11px)] transition"
                }
              >
                <span className="pointer-events-none absolute left-2 top-1.5 w-3 h-3 border-l border-t border-slate-200/80 rounded-tl" />
                Gestion Postes
              </button>
            </div>
          )}
        </div>

        {/* 🆕 Sections Administratives (Extracted) */}
        <div className="mt-2 space-y-1">
          <SectionHeader
            variant="globale"
            title="Simulation nouvelle création"
            icon={Building}
            collapsed={collapsed}
            menuPath="/app/creer-centre"
            noChevron
          />

        </div>
      </nav>

      {/* BAS DE BARRE */}
      <div className="border-t border-slate-200 p-1.5 mt-auto space-y-0.5">
        <button
          onClick={() => handleNav("/app/glossary")}
          className={cn(
            "w-full flex items-center gap-2 rounded-lg font-medium text-slate-700 hover:bg-slate-100 transition-all",
            "text-[clamp(9px,0.75vw,11px)]",
            collapsed ? "px-1.5 py-1 justify-center" : "px-2 py-1"
          )}
        >
          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
          {!collapsed && <span>Légende / Glossaire</span>}
        </button>

        <button
          className={cn(
            "w-full flex items-center gap-2 rounded-lg font-medium text-slate-700 hover:bg-slate-100 transition-all",
            "text-[clamp(9px,0.75vw,11px)]",
            collapsed ? "px-1.5 py-1 justify-center" : "px-2 py-1"
          )}
        >
          <Settings className="w-3.5 h-3.5" />
          {!collapsed && <span>Paramètres</span>}
        </button>

        <button
          onClick={onLogout}
          className={cn(
            "w-full flex items-center gap-2 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-all",
            "text-[clamp(9px,0.75vw,11px)]",
            collapsed ? "px-1.5 py-1 justify-center" : "px-2 py-1"
          )}
        >
          <LogOut className="w-3.5 h-3.5" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>

      {/* Logos bas */}
      <div className="px-2 pb-2 pt-1.5 border-t border-slate-200/60">
        <div
          className={cn(
            "flex items-center gap-2",
            collapsed ? "flex-col justify-center" : "justify-center"
          )}
        >
          <img
            src={logoBarid}
            alt="Barid Al-Maghrib"
            className={cn(
              "h-7 w-auto object-contain opacity-90 hover:opacity-100 transition-transform hover:scale-105",
              collapsed && "h-6"
            )}
          />
          <img
            src={logoAlmav}
            alt="Almav Group"
            className={cn(
              "h-7 w-auto object-contain opacity-90 hover:opacity-100 transition-transform hover:scale-105",
              collapsed && "h-6"
            )}
          />
        </div>
      </div>
    </aside>
  );
}
