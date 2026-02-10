import React, { useState, useEffect } from "react";
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

    // Récupérer les données passées via le state (comme IndexAdequation)
    const simulationResults = location.state?.simulationResults;
    const volumes = location.state?.volumes;

    const [data, setData] = useState(null);
    const [showChartModal, setShowChartModal] = useState(null); // 'mois', 'jour', 'heure'

    // Process data similar to IndexAdequation but focused on volumes
    useEffect(() => {
        if (simulationResults?.postes && Array.isArray(simulationResults.postes)) {
            const positions = simulationResults.postes.map((poste) => {
                // VOLUMES PAR POSTE (Page Intervenant)
                // On récupère les volumes spécifiques calculés pour ce poste
                const dossiers_mois = volumes?.[poste.poste_id]?.mensuel || 0;
                const dossiers_par_jour = volumes?.[poste.poste_id]?.journalier || 0;
                const volume_heure = volumes?.[poste.poste_id]?.horaire || 0;

                return {
                    poste: poste.poste_label || poste.label || `Poste ${poste.poste_id}`,
                    dossiers_mois,
                    dossiers_par_jour,
                    volume_activites_par_heure_total: volume_heure,

                    // Effectifs
                    effectif_actuel: poste.effectif_actuel || poste.actuel || 0,
                    effectif_calcule: poste.effectif_calcule || poste.calcule || 0,
                    effectif_recommande: poste.effectif_recommande || poste.recommande || 0,
                };
            });

            setData({
                centre_label: centreLabel,
                positions,
            });
        }
    }, [simulationResults, volumes, centreLabel]);

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
        <div className="min-h-screen bg-slate-50/50 p-6 font-sans">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            Capacité Nominale
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Analyse des volumes : {centreLabel}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Retour
                    </button>
                </div>

                {/* Content: The Chart Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <button
                        onClick={() => setShowChartModal("mois")}
                        className="p-6 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 transition-all shadow-sm hover:shadow-md text-left flex flex-col items-center justify-center gap-4 h-48"
                    >
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                            <BarChart3 className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-lg text-slate-800">Volume Moyen / Mois</h3>
                            <p className="text-sm text-slate-500 mt-1">Analyse Mensuelle</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setShowChartModal("jour")}
                        className="p-6 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 transition-all shadow-sm hover:shadow-md text-left flex flex-col items-center justify-center gap-4 h-48"
                    >
                        <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
                            <BarChart3 className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-lg text-slate-800">Volume Moyen / Jour</h3>
                            <p className="text-sm text-slate-500 mt-1">Analyse Journalière</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setShowChartModal("heure")}
                        className="p-6 rounded-xl border border-amber-200 bg-white hover:bg-amber-50 transition-all shadow-sm hover:shadow-md text-left flex flex-col items-center justify-center gap-4 h-48"
                    >
                        <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                            <BarChart3 className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-lg text-slate-800">Volume Moyen / Heure</h3>
                            <p className="text-sm text-slate-500 mt-1">Analyse Horaire</p>
                        </div>
                    </button>
                </div>

                {/* Tableau Détaillé */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-slate-700 border-r border-slate-200 w-32">Centre</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700 border-r border-slate-200 min-w-[150px]">Intervenant</th>
                                    <th className="px-4 py-3 font-semibold text-slate-700 border-r border-slate-200 text-center w-20">Nature</th>
                                    <th className="px-4 py-3 font-semibold text-red-700 bg-red-50/30 border-r border-slate-200 text-right w-28">Vol Mensuel</th>

                                    {/* Groupe Jour */}
                                    <th colSpan="4" className="px-2 py-2 font-bold text-center text-slate-800 bg-slate-100/50 border-r border-slate-200 border-b border-slate-200">
                                        Volume Moyen / Jour
                                    </th>

                                    {/* Groupe Heure */}
                                    <th colSpan="4" className="px-2 py-2 font-bold text-center text-slate-800 bg-slate-100/50 border-b border-slate-200">
                                        Volume Moyen / Heure
                                    </th>
                                </tr>
                                <tr className="text-xs bg-slate-50/50">
                                    <th colSpan="4" className="border-r border-slate-200"></th>

                                    {/* Sub-headers Jour */}
                                    <th className="px-2 py-1.5 font-semibold text-red-600 text-center border-r border-slate-200 w-20">Actuel</th>
                                    <th className="px-2 py-1.5 font-semibold text-red-600 text-center border-r border-slate-200 w-20">Calculé</th>
                                    <th className="px-2 py-1.5 font-semibold text-red-600 text-center border-r border-slate-200 w-20">Recommandé</th>
                                    <th className="px-2 py-1.5 font-semibold text-red-600 text-center border-r border-slate-200 w-20">Optimisé</th>

                                    {/* Sub-headers Heure */}
                                    <th className="px-2 py-1.5 font-semibold text-red-600 text-center border-r border-slate-200 w-20">Actuel</th>
                                    <th className="px-2 py-1.5 font-semibold text-red-600 text-center border-r border-slate-200 w-20">Calculé</th>
                                    <th className="px-2 py-1.5 font-semibold text-red-600 text-center border-r border-slate-200 w-20">Recommandé</th>
                                    <th className="px-2 py-1.5 font-semibold text-red-600 text-center w-20">Optimisé</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data?.positions?.map((pos, idx) => {
                                    const label = (pos.poste || "").toUpperCase();
                                    const isMOI = label.includes("CHEF") ||
                                        label.includes("RESPONSABLE") ||
                                        label.includes("ADJOINT") ||
                                        label.includes("SUPPORT") ||
                                        label.includes("RH") ||
                                        label.includes("ASSISTANT") ||
                                        label.includes("SECRETAIRE") ||
                                        label.includes("ADMIN");
                                    const nature = isMOI ? "MOI" : "MOD";

                                    const volMois = pos.dossiers_mois || 0;
                                    const volJour = pos.dossiers_par_jour || 0;
                                    const volHeure = pos.volume_activites_par_heure_total || 0;

                                    const effActuel = pos.effectif_actuel || 1;
                                    const effCalc = pos.effectif_calcule || 1;
                                    const effReco = pos.effectif_recommande || 1;

                                    // Calcul Cadences (Volume / Effectif)
                                    const calc = (v, e) => e > 0 ? Math.round(v / e) : 0;

                                    const jAct = calc(volJour, effActuel);
                                    const jCal = calc(volJour, effCalc);
                                    const jRec = calc(volJour, effReco);
                                    const jOpt = Math.round(jRec * 1.1);

                                    const hAct = calc(volHeure, effActuel);
                                    const hCal = calc(volHeure, effCalc);
                                    const hRec = calc(volHeure, effReco);
                                    const hOpt = Math.round(hRec * 1.1);

                                    const fmt = (n) => n.toLocaleString('fr-FR');

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-2 font-medium text-slate-900 border-r border-slate-100 whitespace-nowrap">{data.centre_label}</td>
                                            <td className="px-4 py-2 text-slate-700 border-r border-slate-100">{pos.poste}</td>
                                            <td className="px-4 py-2 text-center text-slate-600 border-r border-slate-100">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${nature === 'MOD' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {nature}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-right font-mono font-bold text-red-700 bg-red-50/10 border-r border-slate-100">
                                                {fmt(volMois)}
                                            </td>

                                            <td className="px-2 py-2 text-center font-mono text-slate-600 border-r border-slate-100">{fmt(jAct)}</td>
                                            <td className="px-2 py-2 text-center font-mono text-slate-600 border-r border-slate-100">{fmt(jCal)}</td>
                                            <td className="px-2 py-2 text-center font-mono text-slate-600 border-r border-slate-100">{fmt(jRec)}</td>
                                            <td className="px-2 py-2 text-center font-mono text-emerald-600 font-bold border-r border-slate-100">{fmt(jOpt)}</td>

                                            <td className="px-2 py-2 text-center font-mono text-slate-600 border-r border-slate-100">{fmt(hAct)}</td>
                                            <td className="px-2 py-2 text-center font-mono text-slate-600 border-r border-slate-100">{fmt(hCal)}</td>
                                            <td className="px-2 py-2 text-center font-mono text-slate-600 border-r border-slate-100">{fmt(hRec)}</td>
                                            <td className="px-2 py-2 text-center font-mono text-emerald-600 font-bold">{fmt(hOpt)}</td>
                                        </tr>
                                    );
                                })}
                                {/* Total Row */}
                                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                                    <td colSpan="3" className="px-4 py-2 text-right uppercase text-xs tracking-wider">Total</td>
                                    <td className="px-4 py-2 text-right font-mono border-r border-slate-300">
                                        {(data?.positions?.reduce((acc, curr) => acc + (curr.dossiers_mois || 0), 0) || 0).toLocaleString('fr-FR')}
                                    </td>
                                    <td colSpan="8"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modals */}
                {showChartModal && data?.positions && (
                    <ChartModal
                        type={showChartModal}
                        positions={data.positions}
                        onClose={() => setShowChartModal(null)}
                    />
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
