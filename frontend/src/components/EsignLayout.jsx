import React from "react";
import { useNavigate } from "react-router-dom";
import EsignSidebar from "./EsignSidebar";

const labelToPath = {
    "Tableau de Bord Global": "/app/vue-globale/v3",
    "Ratios": "/app/vue-globale/ratios",
    "Économies Budgétaires Estimées": "/app/vue-globale/economies-budgetaires",
    "Comparatif Positions": "/app/vue-globale/comparatif-positions",
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
    "Normes de dimensionnement recommandées": "/dimensionnement-recommande/capacite-nominale",
    "Capacité Nominale Recommandée": "/dimensionnement-recommande/capacite-nominale",
    "Comparatif Positions recommandée": "/dimensionnement-recommande/comparatif",
    "Schéma Process recommandé": "/dimensionnement-recommande/schema-process",
    "Chronogramme recommandé": "/dimensionnement-recommande/chronogramme/taches",
    "Référentiel recommandé": "/referentiel",
};

export default function EsignLayout({ activeKey, children, className }) {
    const navigate = useNavigate();

    const handleSelect = (label) => {
        const target = labelToPath[label];
        if (target) {
            navigate(target);
            return;
        }
        navigate("/esign");
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
            <EsignSidebar active={activeKey} onSelect={handleSelect} />
            <div className="flex-1 flex flex-col min-w-0">
                <main className={`flex-1 overflow-auto ${className || ""}`}>
                    {children}
                </main>
            </div>
        </div>
    );
}