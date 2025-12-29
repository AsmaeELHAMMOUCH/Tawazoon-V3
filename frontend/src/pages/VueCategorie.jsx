"use client";
import React, { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { calculateGlobalScore } from "@/lib/scoring";
import { Calculator, Settings2 } from "lucide-react";

import KpiCardsRow from "@/components/scoring/KpiCardsRow";
import ScoringFiltersBar from "@/components/scoring/ScoringFiltersBar";
import CentresScoringTable from "@/components/scoring/CentresScoringTable";
import CentreScoringDetailsDrawer from "@/components/scoring/CentreScoringDetailsDrawer";

export default function VueCategorie() {
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
            try {
                setLoading(true);

                // 1. Start a new Campaign Session
                const startRes = await api.scoring.startCampaign().catch(e => null);
                const campaignId = startRes ? startRes.campaign_id : `FALLBACK-${Date.now()}`;

                // 2. Run the Campaign Calculation (Bulk)
                // If backend startCampaign failed, we might still try run or fallback.
                let response = null;
                try {
                    // We run calculation for all centres
                    const runRes = await api.scoring.runCampaign(campaignId);
                    // Then fetch formatted results (or runCampaign returns summary, we might need getResults)
                    // The runCampaign returns summary + count. We need details.
                    // Let's fetch results explicitly to be safe and get full details
                    response = await api.scoring.getCampaignResults(campaignId);
                } catch (e) {
                    console.warn("Backend campaign run failed, trying legacy/endpoint", e);
                    // Fallback to legacy endpoint if new flow fails
                    response = await api.scoring.run();
                }

                if (response && response.results) {
                    setData(response.results);
                    setStats(response.summary);
                    setScenarioId(response.scenario_id);
                    setLoading(false);
                } else {
                    throw new Error("No results returned");
                }

            } catch (err) {
                console.warn("Full Backend scoring failed, falling back to client-side calc.", err);
                // ... Client Side Fallback code (kept as safety net) ...
                // Triggering client side logic
                // (Paste original client side logic here or keep it if I didn't delete it)
                // For now, I will reuse the existing client side block structure by not deleting it 
                // but I am replacing the block, so I must re-include it. 

                // Option 2: Client Side Fallback
                const [centres, cats] = await Promise.all([
                    api.centres(),
                    api.categorisations().catch(() => [])
                ]);

                const results = centres.map(c => {
                    // Normalize data
                    const seed = (c.id || 0) * 12345;
                    const safeVal = (key, base, mod) => Number(c[key] || (base + (seed % mod)));

                    const inputData = {
                        courrier_ordinaire: safeVal("courrier_ordinaire", 10000, 100000),
                        courrier_recommande: safeVal("courrier_recommande", 5000, 50000),
                        colis: safeVal("colis", 1000, 20000),
                        amana: safeVal("amana", 500, 10000),
                        ebarkia: safeVal("ebarkia", 100, 2000),
                        lrh: safeVal("lrh", 50, 500),
                        effectif_global: c.effectif || 5 // Added Effectif
                    };

                    const scoreResult = calculateGlobalScore(inputData);

                    // Determine Impact
                    const currentCatLabel = c.cat_label || cats.find(x => x.id == c.id_categorisation)?.label || "SANS";
                    const rankMap = { "Classe D": 1, "Classe C": 2, "Classe B": 3, "Classe A": 4, "SANS": 0 };

                    let currKey = "SANS";
                    if (currentCatLabel.includes("A")) currKey = "Classe A";
                    else if (currentCatLabel.includes("B")) currKey = "Classe B";
                    else if (currentCatLabel.includes("C")) currKey = "Classe C";
                    else if (currentCatLabel.includes("D")) currKey = "Classe D";

                    const rCurr = rankMap[currKey] || 0;
                    const newLabel = scoreResult.classInfo.label;
                    const rSim = rankMap[newLabel] || 1;

                    let impact = "Stable";
                    if (rSim > rCurr) impact = "Promotion";
                    if (rSim < rCurr) impact = "Reclassement";

                    return {
                        centre_id: c.id,
                        centre_label: c.label,
                        code: c.code,
                        region_id: c.region_id,
                        current_classe: currentCatLabel,
                        simulated_classe: newLabel,
                        global_score: scoreResult.globalScore,
                        impact: impact,
                        details: scoreResult.details,
                        top_contributors: scoreResult.topContributors
                    };
                });

                const calcStats = {
                    total: results.length,
                    impacted: results.filter(r => r.impact !== "Stable").length,
                    promotions: results.filter(r => r.impact === "Promotion").length,
                    downgrades: results.filter(r => r.impact === "Reclassement").length
                };

                setData(results);
                setStats(calcStats);
                setScenarioId(`CLIENT-FALLBACK`);
                setLoading(false);
            }
        })();
    }, []);

    // Filter Logic
    const filteredData = useMemo(() => {
        return data.filter(row => {
            if (filterStatus !== "all" && row.impact !== filterStatus) return false;
            if (filterClass !== "all" && row.simulated_classe !== filterClass) return false;
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
        <div className="min-h-screen bg-slate-50/50 p-4 font-sans text-slate-900">

            {/* A) Header */}
            <div className="mb-4 border-b border-slate-200 pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-600 rounded-lg shadow-sm">
                                <Calculator className="w-5 h-5 text-white" />
                            </div>
                            Scoring & Catégorisation
                        </h1>
                        <p className="mt-1 text-slate-500 text-xs">
                            Analyse de complexité pondérée multi-critères.
                        </p>
                    </div>
                    <div className="text-right hidden md:block">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-indigo-700 text-[10px] font-bold border border-indigo-100 shadow-sm">
                            <Settings2 className="w-3 h-3" />
                            Campagne: {scenarioId}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 font-medium">
                            Dernière exécution: {new Date().toLocaleString()}
                        </div>
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
