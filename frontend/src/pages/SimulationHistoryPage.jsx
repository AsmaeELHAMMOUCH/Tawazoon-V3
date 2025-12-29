"use client";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import {
    History,
    Play,
    Filter,
    Calendar,
    User,
    Building2,
    TrendingUp,
    Clock,
    RefreshCw,
    Eye,
    X
} from "lucide-react";

export default function SimulationHistoryPage() {
    const navigate = useNavigate();
    const [simulations, setSimulations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        centre_id: null,
        user_id: null,
        limit: 50,
        offset: 0
    });
    const [centres, setCentres] = useState([]);

    useEffect(() => {
        loadHistory();
        loadCentres();
    }, [filters]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const data = await api.getSimulationHistory(filters);
            setSimulations(data.simulations || []);
        } catch (error) {
            console.error("Erreur chargement historique:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadCentres = async () => {
        try {
            const data = await api.centres();
            setCentres(data || []);
        } catch (error) {
            console.error("Erreur chargement centres:", error);
        }
    };

    const handleReplay = async (simulationId) => {
        try {
            // Récupérer les données de la simulation
            const data = await api.getSimulationReplay(simulationId);
            console.log("Données de replay:", data);

            // Rediriger vers la page de simulation avec les paramètres
            // On passe les données via state pour pré-remplir le formulaire
            navigate('/app/simulation/centre', {
                state: {
                    flux: 'centre', // Force l'affichage de la vue Centre
                    replayData: {
                        centre_id: data.centre_id,
                        productivite: data.productivite,
                        volumes: data.volumes,
                        unites: data.unites,
                        commentaire: `Replay de simulation #${simulationId}${data.commentaire ? ' - ' + data.commentaire : ''}`,
                        isReplay: true,
                        originalSimulationId: simulationId
                    }
                }
            });
        } catch (error) {
            console.error("Erreur replay:", error);
            alert("❌ Erreur lors de la récupération des données de simulation");
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    const [selectedSim, setSelectedSim] = useState(null);

    const handleViewDetails = async (simulationId) => {
        try {
            setLoading(true);
            const data = await api.getSimulationReplay(simulationId);
            setSelectedSim(data);
        } catch (error) {
            console.error("Erreur chargement détails:", error);
            alert("Impossible de charger les détails");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/20 p-4">
            {/* ... (Header and Filters remain the same) ... */}

            {/* Header Premium Compact */}
            <div className="max-w-7xl mx-auto mb-4">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, type: "spring" }}
                    className="relative bg-white/80 backdrop-blur-2xl rounded-2xl border border-white/60 shadow-xl overflow-hidden"
                >
                    {/* Gradient animé de fond */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#007BFF]/5 via-[#00C6FF]/5 to-transparent opacity-50" />

                    {/* Orbe lumineux */}
                    <motion.div
                        className="absolute -right-16 -top-16 w-32 h-32 bg-gradient-to-br from-[#007BFF]/20 to-[#00C6FF]/20 rounded-full blur-3xl"
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.5, 0.3],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />

                    <div className="relative p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {/* Icône avec animation */}
                                <motion.div
                                    className="relative"
                                    whileHover={{ rotate: 360, scale: 1.1 }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#007BFF] to-[#00C6FF] rounded-xl blur-md opacity-50" />
                                    <div className="relative p-2 bg-gradient-to-br from-[#007BFF] to-[#00C6FF] rounded-xl shadow-md">
                                        <History className="w-5 h-5 text-white" />
                                    </div>
                                </motion.div>

                                <div>
                                    {/* Titre avec gradient */}
                                    <motion.h1
                                        className="text-xl font-extrabold flex items-center gap-2"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        <span className="bg-gradient-to-r from-[#005EA8] via-[#007BFF] to-[#00C6FF] bg-clip-text text-transparent">
                                            Historique des Simulations
                                        </span>
                                    </motion.h1>

                                    {/* Sous-titre */}
                                    <motion.p
                                        className="mt-1 text-slate-600 text-xs font-medium flex items-center gap-1.5"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <span className="w-1 h-1 rounded-full bg-gradient-to-r from-[#007BFF] to-[#00C6FF]" />
                                        Consultez et rejouez vos simulations passées
                                    </motion.p>
                                </div>
                            </div>

                            {/* Bouton Actualiser compact */}
                            <motion.button
                                onClick={loadHistory}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative group flex items-center gap-2 px-4 py-2 
                                    bg-gradient-to-r from-[#007BFF] to-[#00C6FF] 
                                    text-white rounded-lg text-sm font-semibold shadow-md
                                    hover:shadow-lg hover:shadow-cyan-500/30
                                    transition-all duration-300 overflow-hidden"
                            >
                                {/* Effet de brillance au hover */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                                    translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

                                <RefreshCw className="w-3.5 h-3.5 relative z-10" />
                                <span className="relative z-10">Actualiser</span>
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Filters */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/50 shadow-sm p-4">
                    <div className="flex items-center gap-4">
                        <Filter className="w-5 h-5 text-slate-500" />
                        <select
                            value={filters.centre_id || ''}
                            onChange={(e) => setFilters({ ...filters, centre_id: e.target.value ? Number(e.target.value) : null })}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="">Tous les centres</option>
                            {centres.map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </select>

                        <select
                            value={filters.limit}
                            onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value) })}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="25">25 résultats</option>
                            <option value="50">50 résultats</option>
                            <option value="100">100 résultats</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="max-w-7xl mx-auto">
                <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/50 shadow-sm overflow-hidden">
                    {loading && !selectedSim ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                        </div>
                    ) : simulations.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>Aucune simulation trouvée</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            ID
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            <Building2 className="w-4 h-4 inline mr-1" />
                                            Centre
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            <Calendar className="w-4 h-4 inline mr-1" />
                                            Date
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            <TrendingUp className="w-4 h-4 inline mr-1" />
                                            Productivité
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Résultats
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Commentaire
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {simulations.map((sim) => (
                                        <tr key={sim.simulation_id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3 text-sm font-mono text-slate-700">
                                                #{sim.simulation_id}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">
                                                <div className="font-medium">{sim.centre_label || `Centre ${sim.centre_id}`}</div>
                                                <div className="text-xs text-slate-500">ID: {sim.centre_id}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                {formatDate(sim.launched_at)}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                                                    {sim.productivite}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {sim.etp_calcule !== null ? (
                                                    <div className="space-y-1">
                                                        <div className="text-xs text-slate-500">ETP: <span className="font-semibold text-slate-700">{sim.etp_calcule?.toFixed(2)}</span></div>
                                                        <div className="text-xs text-slate-500">Heures: <span className="font-semibold text-slate-700">{sim.heures_necessaires?.toFixed(2)}</span></div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                                                {sim.commentaire || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleViewDetails(sim.simulation_id)}
                                                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="Voir détails"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReplay(sim.simulation_id)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-medium shadow-sm"
                                                        title="Rejouer cette simulation"
                                                    >
                                                        <Play className="w-3.5 h-3.5" />
                                                        Rejouer
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Footer */}
            <div className="max-w-7xl mx-auto mt-6">
                <div className="bg-white/50 backdrop-blur-sm rounded-lg border border-white/50 px-4 py-3 text-center text-sm text-slate-600">
                    <Clock className="w-4 h-4 inline mr-2" />
                    {simulations.length} simulation{simulations.length > 1 ? 's' : ''} affichée{simulations.length > 1 ? 's' : ''}
                </div>
            </div>

            {/* Modal Détails */}
            {selectedSim && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
                    >
                        {/* Header Modal */}
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Détails Simulation #{selectedSim.simulation_id}</h3>
                                <p className="text-xs text-slate-500">
                                    {formatDate(selectedSim.launched_at)} • {selectedSim.centre_id}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedSim(null)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body Modal */}
                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="text-xs text-blue-600 uppercase font-semibold mb-1">Productivité</div>
                                    <div className="text-xl font-bold text-blue-900">{selectedSim.productivite}%</div>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                    <div className="text-xs text-emerald-600 uppercase font-semibold mb-1">ETP Calculé</div>
                                    <div className="text-xl font-bold text-emerald-900">
                                        {/* Fallback si Result pas loadé dans replayData mais souvent c'est dans simulation list... 
                                            L'API replay retourne les inputs. On va afficher les volumes. */}
                                        ---
                                    </div>
                                    <div className="text-[10px] text-emerald-600 mt-1">
                                        (Voir liste pour résultats)
                                    </div>
                                </div>
                            </div>

                            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 border-b border-slate-100 pb-2">
                                Volumes Saisis
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {Object.entries(selectedSim.volumes || {}).map(([key, val]) => (
                                    <div key={key} className="p-2 border border-slate-100 rounded bg-slate-50">
                                        <div className="text-[10px] text-slate-500 uppercase truncate" title={key}>{key}</div>
                                        <div className="text-sm font-mono font-semibold text-slate-800">
                                            {typeof val === 'number' ? val.toLocaleString('fr-FR') : val}
                                            <span className="text-[10px] text-slate-400 ml-1 font-normal">
                                                {selectedSim.unites?.[key] || ''}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {selectedSim.commentaire && (
                                <div className="mt-6">
                                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2 border-b border-slate-100 pb-2">
                                        Commentaire
                                    </h4>
                                    <p className="text-sm text-slate-600 bg-yellow-50 p-3 rounded border border-yellow-100 italic">
                                        "{selectedSim.commentaire}"
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer Modal */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedSim(null)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                            >
                                Fermer
                            </button>
                            <button
                                onClick={() => {
                                    handleReplay(selectedSim.simulation_id || selectedSim.originalSimulationId); // Fallback ID
                                }}
                                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2"
                            >
                                <Play className="w-4 h-4" />
                                Rejouer cette simulation
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
