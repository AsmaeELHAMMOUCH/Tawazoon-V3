"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { Calculator, Settings2 } from "lucide-react";

import KpiCardsRow from "@/components/scoring/KpiCardsRow";
import ScoringFiltersBar from "@/components/scoring/ScoringFiltersBar";
import CentresScoringTable from "@/components/scoring/CentresScoringTable";
import CentreScoringDetailsDrawer from "@/components/scoring/CentreScoringDetailsDrawer";
import CampaignBadge from "@/components/scoring/CampaignBadge";

export default function ScoringCategorisationPage() {
    const location = useLocation();
    const [data, setData] = useState([]);
    const [stats, setStats] = useState(null);
    const [scenarioId, setScenarioId] = useState("");
    const [loading, setLoading] = useState(true);

    // Selection state
    const [selectedCentre, setSelectedCentre] = useState(null);

    // Filter states
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterClass, setFilterClass] = useState("all");
    const [globalFilter, setGlobalFilter] = useState("");

    // Load Data
    useEffect(() => {
        (async () => {
            // 1) Priorité : données envoyées par la page Intervenant / navigation state
            const incoming = location.state?.scoring || location.state?.scoringData;
            if (incoming) {
                setData(incoming.results || []);
                setStats(incoming.summary || {});
                setScenarioId(incoming.scenario_id || `DRAFT-${Date.now()}`);
                setLoading(false);
                return;
            }

            // 2) Sinon, fallback API
            try {
                setLoading(true);
                const response = await api.scoring.run();
                if (response) {
                    setData(response.results || []);
                    setStats(response.summary || {});
                    setScenarioId(response.scenario_id || `DRAFT-${Date.now()}`);
                }
            } catch (err) {
                console.error("Failed to fetch scoring data", err);
            } finally {
                setLoading(false);
            }
        })();
    }, [location.state]);

    // Filter Logic
    const filteredData = useMemo(() => {
        return data.filter(row => {
            // Status/Impact Filter
            if (filterStatus !== "all" && row.impact !== filterStatus) return false;

            // Class Filter
            if (filterClass !== "all" && row.simulated_classe !== filterClass) return false;

            // Text Search
            if (globalFilter) {
                const search = globalFilter.toLowerCase();
                const matchName = String(row.centre_label).toLowerCase().includes(search);
                const matchCode = String(row.code || "").toLowerCase().includes(search);
                if (!matchName && !matchCode) return false;
            }

            return true;
        });
    }, [data, filterStatus, filterClass, globalFilter]);


    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                <div className="text-sm text-slate-500 animate-pulse">Calcul de la complexité en cours...</div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 font-sans text-slate-900">

            {/* A) Header */}
            <div className="mb-8 border-b border-slate-200 pb-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-lg shadow-sm">
                                <Calculator className="w-6 h-6 text-white" />
                            </div>
                            Scoring & Catégorisation
                        </h1>
                        <p className="mt-2 text-slate-500 text-sm">
                            Analyse de complexité pondérée multi-critères.
                        </p>
                    </div>
                    <div className="text-right hidden md:block">
                        <CampaignBadge />
                    </div>
                </div>
            </div>

            {/* B) KPI Cards */}
            <KpiCardsRow stats={stats} />

            {/* C) Filters & Search */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                <ScoringFiltersBar
                    filterStatus={filterStatus} setFilterStatus={setFilterStatus}
                    filterClass={filterClass} setFilterClass={setFilterClass}
                    globalFilter={globalFilter} setGlobalFilter={setGlobalFilter}
                />

                {/* D) Table */}
                <CentresScoringTable
                    data={filteredData}
                    onSelectCentre={setSelectedCentre}
                />
            </div>

            {/* E) Details Modal */}
            <CentreScoringDetailsDrawer
                center={selectedCentre}
                onClose={() => setSelectedCentre(null)}
            />

        </div>
    );
}
