"use client";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    AlertTriangle,
    AlertCircle,
    Info,
    CheckCheck,
    Trash2,
    Clock,
    Building2,
    Globe,
} from "lucide-react";
import { useAlerts, ALERT_TYPES } from "@/hooks/useAlerts";

// Onglets pour les niveaux
const LEVELS = {
    SIEGE: "siege",
    NATIONAL: "national",
};

const LEVEL_LABELS = {
    [LEVELS.SIEGE]: "Niveau Siège",
    [LEVELS.NATIONAL]: "Niveau National",
};

// Icône selon le type d'alerte (version simplifiée)
const AlertIcon = ({ type }) => {
    const config = {
        [ALERT_TYPES.CRITICAL]: {
            icon: AlertTriangle,
            className: "w-5 h-5 text-red-600",
        },
        [ALERT_TYPES.WARNING]: {
            icon: AlertCircle,
            className: "w-5 h-5 text-orange-600",
        },
        [ALERT_TYPES.INFO]: {
            icon: Info,
            className: "w-5 h-5 text-blue-600",
        },
    };

    const { icon: Icon, className } = config[type] || config[ALERT_TYPES.INFO];
    return <Icon className={className} />;
};

// Badge de sévérité
const SeverityBadge = ({ type }) => {
    const config = {
        [ALERT_TYPES.CRITICAL]: {
            label: "Critique",
            className: "bg-red-100 text-red-700 border-red-300",
        },
        [ALERT_TYPES.WARNING]: {
            label: "Attention",
            className: "bg-orange-100 text-orange-700 border-orange-300",
        },
        [ALERT_TYPES.INFO]: {
            label: "Info",
            className: "bg-blue-100 text-blue-700 border-blue-300",
        },
    };

    const { label, className } = config[type] || config[ALERT_TYPES.INFO];

    return (
        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border ${className}`}>
            {label}
        </span>
    );
};

// Carte d'alerte simplifiée et structurée
const AlertCard = ({ alert, onMarkAsRead, onRemove, onClick }) => {
    const bgColors = {
        [ALERT_TYPES.CRITICAL]: "bg-red-50/50 hover:bg-red-50 border-red-200",
        [ALERT_TYPES.WARNING]: "bg-orange-50/50 hover:bg-orange-50 border-orange-200",
        [ALERT_TYPES.INFO]: "bg-blue-50/50 hover:bg-blue-50 border-blue-200",
    };

    const handleClick = () => {
        if (!alert.read) {
            onMarkAsRead(alert.id);
        }
        if (onClick) {
            onClick(alert);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${bgColors[alert.type] || bgColors[ALERT_TYPES.INFO]
                } ${!alert.read ? "shadow-sm" : "opacity-75"}`}
            onClick={handleClick}
        >
            {/* Header de la carte */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Icône */}
                    <div className="shrink-0 mt-0.5">
                        <AlertIcon type={alert.type} />
                    </div>

                    {/* Titre */}
                    <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 mb-1 leading-tight">
                            {alert.title}
                        </h4>
                        {!alert.read && (
                            <span className="inline-block px-1.5 py-0.5 bg-blue-600 text-white text-[8px] font-bold rounded uppercase">
                                Nouveau
                            </span>
                        )}
                    </div>
                </div>

                {/* Badge de sévérité */}
                <SeverityBadge type={alert.type} />
            </div>

            {/* Description */}
            <p className="text-[10px] text-slate-700 leading-relaxed mb-3 ml-8">
                {alert.message}
            </p>

            {/* Zone impactée */}
            {alert.zone && (
                <div className="flex items-center gap-2 mb-3 ml-8">
                    <span className="text-[9px] font-medium text-slate-500">Zone:</span>
                    <span className="text-[9px] font-bold text-slate-800 px-2 py-0.5 bg-white/80 rounded border border-slate-200">
                        {alert.zone}
                    </span>
                </div>
            )}

            {/* Données chiffrées */}
            {alert.data && Object.keys(alert.data).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 ml-8">
                    {Object.entries(alert.data).map(([key, value]) => (
                        <div
                            key={key}
                            className="px-2 py-1 bg-white/60 rounded border border-slate-200/60 text-[9px]"
                        >
                            <span className="text-slate-600 font-medium">{key}: </span>
                            <span className="text-slate-900 font-bold">{value}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between ml-8 pt-2 border-t border-slate-200/60">
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    {new Date(alert.timestamp).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(alert.id);
                    }}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                    title="Supprimer"
                >
                    <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-600" />
                </button>
            </div>
        </motion.div>
    );
};

// Panneau principal réorganisé
export default function AlertsPanel() {
    const {
        alerts,
        isOpen,
        setIsOpen,
        markAsRead,
        markAllAsRead,
        removeAlert,
        clearAll,
        criticalCount,
        warningCount,
        infoCount,
    } = useAlerts();

    const [activeLevel, setActiveLevel] = useState(LEVELS.SIEGE);

    // Filtrer les alertes par niveau (pour l'instant, toutes sont au niveau Siège)
    // Vous pouvez ajouter une propriété 'level' aux alertes pour les distinguer
    const alertsByLevel = useMemo(() => {
        return {
            [LEVELS.SIEGE]: alerts,
            [LEVELS.NATIONAL]: [], // À implémenter selon vos besoins
        };
    }, [alerts]);

    const currentAlerts = alertsByLevel[activeLevel] || [];

    // Trier les alertes par priorité
    const sortedAlerts = useMemo(() => {
        const priority = {
            [ALERT_TYPES.CRITICAL]: 1,
            [ALERT_TYPES.WARNING]: 2,
            [ALERT_TYPES.INFO]: 3,
        };
        return [...currentAlerts].sort((a, b) => priority[a.type] - priority[b.type]);
    }, [currentAlerts]);

    const handleAlertClick = (alert) => {
        if (alert.targetId) {
            const element = document.getElementById(alert.targetId);
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
                element.classList.add("ring-2", "ring-blue-500", "ring-offset-2");
                setTimeout(() => {
                    element.classList.remove("ring-2", "ring-blue-500", "ring-offset-2");
                }, 2000);
            }
        }
    };

    return (
        <>
            {/* Overlay avec fermeture au clic */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-[9998] cursor-pointer"
                    />
                )}
            </AnimatePresence>

            {/* Panneau latéral droit - Drawer fixe */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-[9999] flex flex-col border-l-4 border-slate-300"
                    >
                        {/* === 1. TITRE + COMPTEUR === */}
                        <div className="shrink-0 bg-white">
                            {/* Indicateur visuel : Panneau temporaire */}
                            <div className="px-5 py-2 bg-blue-50 border-b border-blue-200 flex items-center justify-center gap-2">
                                <Info className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-[10px] text-blue-700 font-medium">
                                    Cliquez en dehors pour fermer
                                </span>
                            </div>

                            <div className="p-5 border-b border-slate-200">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h2 className="text-base font-bold text-slate-900 mb-1">
                                            Centre d'Alertes
                                        </h2>
                                        <p className="text-[11px] text-slate-600 font-medium">
                                            {alerts.length} alerte{alerts.length > 1 ? "s" : ""} détectée{alerts.length > 1 ? "s" : ""}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-slate-600" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* === 2. TABS NIVEAU (Siège / National) === */}
                        <div className="shrink-0 px-5 pt-4 pb-3 bg-white border-b border-slate-100">
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                                <button
                                    onClick={() => setActiveLevel(LEVELS.SIEGE)}
                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-[11px] font-bold transition-all ${activeLevel === LEVELS.SIEGE
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
                                        }`}
                                >
                                    <Building2 className="w-4 h-4" />
                                    {LEVEL_LABELS[LEVELS.SIEGE]}
                                </button>
                                <button
                                    onClick={() => setActiveLevel(LEVELS.NATIONAL)}
                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-[11px] font-bold transition-all ${activeLevel === LEVELS.NATIONAL
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-600 hover:text-slate-900"
                                        }`}
                                >
                                    <Globe className="w-4 h-4" />
                                    {LEVEL_LABELS[LEVELS.NATIONAL]}
                                </button>
                            </div>
                        </div>

                        {/* === 3. FILTRES DE SÉVÉRITÉ (Critiques / Attention / Info) === */}
                        <div className="shrink-0 px-5 py-4 bg-slate-50/50 border-b border-slate-200">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-2.5 text-center">
                                    <div className="text-xl font-bold text-red-700">{criticalCount}</div>
                                    <div className="text-[9px] text-red-600 font-semibold uppercase tracking-wide">Critiques</div>
                                </div>
                                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-2.5 text-center">
                                    <div className="text-xl font-bold text-orange-700">{warningCount}</div>
                                    <div className="text-[9px] text-orange-600 font-semibold uppercase tracking-wide">Attention</div>
                                </div>
                                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-2.5 text-center">
                                    <div className="text-xl font-bold text-blue-700">{infoCount}</div>
                                    <div className="text-[9px] text-blue-600 font-semibold uppercase tracking-wide">Info</div>
                                </div>
                            </div>
                        </div>

                        {/* === 4. LISTE DES ALERTES === */}
                        <div className="flex-1 overflow-y-auto p-4 bg-white space-y-3">
                            {sortedAlerts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                                    <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                                        <Info className="w-8 h-8 opacity-40" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-600 mb-1">
                                        Aucune alerte
                                    </p>
                                    <p className="text-[10px] text-center max-w-xs text-slate-500">
                                        Les alertes pour {LEVEL_LABELS[activeLevel]} apparaîtront ici
                                    </p>
                                </div>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {sortedAlerts.map((alert) => (
                                        <AlertCard
                                            key={alert.id}
                                            alert={alert}
                                            onMarkAsRead={markAsRead}
                                            onRemove={removeAlert}
                                            onClick={handleAlertClick}
                                        />
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>

                        {/* === 5. ACTIONS (FOOTER) === */}
                        {alerts.length > 0 && (
                            <div className="shrink-0 p-4 border-t-2 border-slate-200 bg-white">
                                <div className="flex gap-2">
                                    <button
                                        onClick={markAllAsRead}
                                        disabled={alerts.every((a) => a.read)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <CheckCheck className="w-4 h-4" />
                                        Tout marquer lu
                                    </button>
                                    <button
                                        onClick={clearAll}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[11px] font-bold transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Tout effacer
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
