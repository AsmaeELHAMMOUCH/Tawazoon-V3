import React from "react";
import { useNavigate } from "react-router-dom";
import {
    PieChart,
    BarChart2,
    TrendingUp,
    LayoutGrid,
    GitMerge,
    Workflow,
    Clock,
    BookOpen,
    DollarSign,
    Activity
} from "lucide-react";

const menuSections = [
    {
        title: "Vue globale des effectifs",
        items: [
            { label: "Tableau de Bord Global", icon: Activity },
            { label: "Ratios", icon: BarChart2 },
            { label: "Économies Budgétaires Estimées", icon: DollarSign },
            { label: "Comparatif Positions", icon: LayoutGrid },
        ],
    },
    {
        title: "Résultats simulation – Processus actuel",
        items: [
            { label: "Simulation par Position", icon: GitMerge },
            { label: "Simulation Globale", icon: LayoutGrid },
            { label: "Normes de dimensionnement", icon: Workflow },
            { label: "Schéma Process", icon: Workflow },
            { label: "Chronogramme de Traitement Unitaire", icon: Clock },
            { label: "Référentiel", icon: BookOpen },
        ],
    },
    {
        title: "Résultats simulation – Processus recommandé",
        items: [
            { label: "Simulation par Position recommandée", icon: GitMerge },
            { label: "Simulation Globale recommandée", icon: LayoutGrid },
            { label: "Normes de dimensionnement recommandées", icon: Workflow },
            { label: "Schéma Process recommandé", icon: Workflow },
            { label: "Chronogramme recommandé", icon: Clock },
            { label: "Référentiel recommandé", icon: BookOpen },
        ],
    },
];

const labelToPath = {
    "Tableau de Bord Global": "/app/vue-globale/v3",
    "Ratios": "/app/vue-globale/ratios",
    "Économies Budgétaires Estimées": "/app/vue-globale/economies-budgetaires",
    "Comparatif Positions": "/comparatif-effectifs",
    "Simulation par Position": "/app/effectifs-par-position3",
    "Simulation Globale": "/app/effectif-global",
    "Normes de dimensionnement": "/app/actuel/normes",
    "Capacité Nominale": "/app/actuel/capacite-nominale",
    "Schéma Process": "/schema-process",
    "Chronogramme de Traitement Unitaire": "/app/actuel/chronogramme/taches",
    "Chronogramme par Position": "/app/actuel/chronogramme/positions",
    "Référentiel": "/referentiel",
    "Simulation par Position recommandée": "/dimensionnement-recommande/position",
    "Simulation Globale recommandée": "/dimensionnement-recommande/global",
    "Normes de dimensionnement recommandées": "/dimensionnement-recommande/normes",
    "Capacité Nominale Recommandée": "/dimensionnement-recommande/capacite-nominale",
    "Comparatif Positions recommandée": "/dimensionnement-recommande/comparatif",
    "Schéma Process recommandé": "/dimensionnement-recommande/schema-process",
    "Chronogramme recommandé": "/dimensionnement-recommande/chronogramme/taches",
    "Référentiel recommandé": "/referentiel",
};

export default function SectionNavBar({ activeKey }) {
    const navigate = useNavigate();

    // Find the section containing the activeKey
    const currentSection = menuSections.find((section) =>
        section.items.some((item) => item.label === activeKey)
    );

    if (!currentSection) return null;

    return (
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
            <div className="w-full px-4 lg:px-6">
                <div className="flex items-center justify-center space-x-1 overflow-x-auto scrollbar-hide py-2">
                    {currentSection.items.map((item) => {
                        const isActive = activeKey === item.label;
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.label}
                                onClick={() => {
                                    const path = labelToPath[item.label];
                                    if (path) navigate(path);
                                }}
                                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap
                  ${isActive
                                        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200 shadow-sm"
                                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent hover:border-slate-200"
                                    }
                `}
                            >
                                <Icon size={14} className={isActive ? "text-blue-600" : "text-slate-400"} />
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
