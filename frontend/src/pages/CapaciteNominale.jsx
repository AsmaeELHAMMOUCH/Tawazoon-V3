import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    BarChart3,
    X,
} from "lucide-react";
import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import api from "../lib/api";
import CapaciteNominaleTable from "../components/tables/CapaciteNominaleTable";
import { computeCapaciteNominalePositions } from "../utils/capaciteNominale";

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function CapaciteNominale() {
    const location = useLocation();
    const navigate = useNavigate();
    const centreLabel = location.state?.centreLabel || "Centre non sélectionné";
    const centreId = location.state?.centreId;
    const resultatsTasks = location.state?.resultatsTasks || [];

    // Récupérer les données passées via le state (comme IndexAdequation)
    const simulationResults = location.state?.simulationResults;
    const volumes = location.state?.volumes;
    const simulationParams = location.state?.simulationParams;

    const calculateTaskVolume = (task, globalVolumes, params) => {
        if (!task || !globalVolumes) return 0;

        const {
            colisAmanaParSac = 5, courriersParSac = 4500, colisParCollecte = 1,
            edPercent = 60, joursOuvres = 264
        } = params || {};

        const uRaw = String(task.unit || task.unite || "").trim().toLowerCase();
        const typeFlux = String(task.type_flux || "").toLowerCase();
        const nom = String(task.task || task.nom_tache || "").toLowerCase();

        // Volumes Annuels
        const annualCO = Number(globalVolumes.cOrd || 0);
        const annualCR = Number(globalVolumes.cReco || 0);
        const annualEB = Number(globalVolumes.eBarkia || 0);
        const annualLRH = Number(globalVolumes.lrh || 0);
        const annualAmana = Number(globalVolumes.amana || 0);

        // Volumes Journaliers
        const dailyColis = Number(globalVolumes.colis || 0);
        const dailySacs = Number(globalVolumes.sacs || 0);

        const dailyAmanaColis = annualAmana / joursOuvres;
        const dailyAmanaSacs = dailyAmanaColis / colisAmanaParSac;

        // 1. Collecte Colis
        if (nom.includes("collecte") && nom.includes("colis")) {
            if (dailyColis <= 0) return 0;
            const ratio = Math.max(1, Number(task.colis_par_collecte || colisParCollecte || 1));
            return dailyColis / ratio;
        }

        // 2. Colis / Amana
        if (uRaw.includes("colis") || uRaw === "amana") {
            if (dailyAmanaColis > 0 && (nom.includes("amana") || typeFlux === "amana")) return dailyAmanaColis;
            return dailyColis;
        }

        // 3. Sacs
        if (uRaw.includes("sac")) {
            const isAmana = nom.includes("amana") || typeFlux === "amana" || uRaw.includes("amana");
            if (isAmana) return dailyAmanaSacs;

            if (uRaw.includes("courrier")) {
                let vol = 0;
                if (typeFlux.includes("ordinaire")) vol = annualCO;
                else if (typeFlux.includes("recommande")) vol = annualCR;
                else if (typeFlux.includes("ebarkia")) vol = annualEB;
                else if (typeFlux.includes("lrh")) vol = annualLRH;
                else vol = annualCO + annualCR + annualEB + annualLRH;

                return vol / joursOuvres / courriersParSac;
            }

            if (dailySacs > 0) return dailySacs;

            const tauxSac = edPercent / 100;
            return (dailyColis * tauxSac) / colisAmanaParSac;
        }

        // 4. Courrier
        if (uRaw.includes("courrier") || uRaw.includes("lettre") || uRaw.includes("pli") || typeFlux.includes("ordinaire") || typeFlux.includes("recommande")) {
            let vol = 0;
            if (typeFlux.includes("ordinaire")) vol = annualCO;
            else if (typeFlux.includes("recommande")) vol = annualCR;
            else if (typeFlux.includes("ebarkia")) vol = annualEB;
            else if (typeFlux.includes("lrh")) vol = annualLRH;
            else vol = annualCO + annualCR;

            return vol / joursOuvres;
        }

        return 0;
    };

    const [data, setData] = useState(null);
    const [showChartModal, setShowChartModal] = useState(null); // 'mois', 'jour', 'heure'
    const [filterProduit, setFilterProduit] = useState(""); // (gardé si besoin pour modales)

    // Normalisation effectif (même logique que VueIntervenant)
    const getEff = (p) => Number(
        p?.effectif_actuel ??
        p?.effectif_Actuel ??
        p?.effectifActuel ??
        p?.effectif_statutaire ??
        p?.effectifStatutaire ??
        p?.effectif_total ??
        p?.effectif ??
        p?.etp_actuel ??
        p?.etpActuel ??
        p?.fte_actuel ??
        p?.fteActuel ??
        p?.etp ??
        p?.fte ??
        p?.actuel ??
        p?.eff_actuel ??
        p?.eff ??
        0
    );

    const gridValuesState = location.state?.gridValues || volumes || {};
    const postesOptionsState = location.state?.postesOptions || simulationResults?.postes || [];
    const resultatsTasksState = location.state?.resultatsTasks || resultatsTasks || [];
    const simulationParamsState = location.state?.simulationParams || simulationParams || {};

    const positionsFromState = location.state?.positions;

    const positionsMemo = useMemo(() => {
        if (Array.isArray(positionsFromState) && positionsFromState.length) {
            return positionsFromState;
        }
        const hasSim = !!(postesOptionsState && postesOptionsState.length);
        return computeCapaciteNominalePositions({
            hasSimulated: hasSim,
            postesOptions: postesOptionsState,
            poste: null,
            idleMinutes: simulationParamsState?.idleMinutes ?? 0,
            productivite: simulationParamsState?.productivite ?? 100,
            mergedResults: resultatsTasksState,
            backendResults: resultatsTasksState,
            gridValues: gridValuesState,
            getGroupeProduit: (p) => p || "AUTRE",
            getEff,
            heuresNet: simulationParamsState?.heuresNet ?? 0,
        });
    }, [positionsFromState, postesOptionsState, resultatsTasksState, gridValuesState, simulationParamsState]);

    useEffect(() => {
        if (positionsMemo && positionsMemo.length > 0) {
            setData({
                centre_label: centreLabel,
                positions: positionsMemo,
            });
        }
    }, [positionsMemo, centreLabel]);

    // Si pas de données, afficher un message
    if (!data && !location.state) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-slate-700 mb-4">Capacité Nominale</h2>
                <p className="text-slate-500 mb-6">Aucune donnée de simulation disponible. Veuillez d'abord lancer une simulation.</p>
                <button
                    onClick={() => navigate('/app/actuel/menu')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Retour au menu
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 font-sans">
            <div className="max-w-7xl mx-auto space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            Capacité Nominale
                        </h1>
                        <p className="text-slate-500 text-xs mt-0.5">
                            Analyse des volumes : {centreLabel}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Retour
                    </button>
                </div>

                {/* Content: The Chart Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                        onClick={() => setShowChartModal("mois")}
                        className="p-4 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 transition-all shadow-sm hover:shadow-md text-left flex flex-col items-center justify-center gap-2 h-28"
                    >
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-sm text-slate-800">Volume Moyen / Mois</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Analyse Mensuelle</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setShowChartModal("jour")}
                        className="p-4 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 transition-all shadow-sm hover:shadow-md text-left flex flex-col items-center justify-center gap-2 h-28"
                    >
                        <div className="p-2 rounded-full bg-emerald-100 text-emerald-600">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-sm text-slate-800">Volume Moyen / Jour</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Analyse Journalière</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setShowChartModal("heure")}
                        className="p-4 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 transition-all shadow-sm hover:shadow-md text-left flex flex-col items-center justify-center gap-2 h-28"
                    >
                        <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-sm text-slate-800">Volume Moyen / Heure</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Analyse Horaire</p>
                        </div>
                    </button>
                </div>

                
                {showChartModal && data?.positions && (
                    <ChartModal
                        type={showChartModal}
                        positions={data.positions.filter(pos => !filterProduit || (pos.produit && pos.produit.includes(filterProduit)))}
                        onClose={() => setShowChartModal(null)}
                    />
                )}

                {/* Tableau CapacitÃ© Nominale (version commune) */}
                {data?.positions && (
                    <div className="mt-6">
                        <CapaciteNominaleTable positions={data.positions} centreLabel={centreLabel} />
                    </div>
                )}
            </div>
        </div>
    );
}

// ========== COMPONENTS ==========

function ChartModal({ type, positions, onClose }) {
    // Prepare chart data
    const labels = positions.map((p) => p.poste);

    let datasetLabel = "";
    let dataKey = "";
    let color = "";

    if (type === "mois") {
        datasetLabel = "Volume Moyen / Mois";
        dataKey = "dossiers_mois";
        color = "rgb(37, 99, 235)"; // Blue
    } else if (type === "jour") {
        datasetLabel = "Volume Moyen / Jour";
        dataKey = "dossiers_par_jour";
        color = "rgb(16, 185, 129)"; // Emerald
    } else {
        datasetLabel = "Volume Moyen / Heure";
        dataKey = "volume_activites_par_heure_total";
        color = "rgb(245, 158, 11)"; // Amber
    }

    const chartData = {
        labels,
        datasets: [
            {
                label: datasetLabel,
                data: positions.map((p) => p[dataKey]),
                backgroundColor: color,
                borderRadius: 4,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "top",
            },
            title: {
                display: true,
                text: `Analyse des Volumes: ${datasetLabel}`,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-800">
                        {datasetLabel}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
                <div className="flex-1 p-6 min-h-[400px]">
                    <Bar data={chartData} options={options} />
                </div>
            </div>
        </div>
    );
}




