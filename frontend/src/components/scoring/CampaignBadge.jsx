import React, { useState, useEffect } from 'react';
import { Settings2, CheckCircle2, Clock, AlertCircle, User, MapPin } from 'lucide-react';
import { api } from '../../lib/api';

const CampaignBadge = ({ className = "" }) => {
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadActiveCampaign();
    }, []);

    const loadActiveCampaign = async () => {
        try {
            const data = await api.scoring.getActiveCampaign();
            setCampaign(data);
        } catch (error) {
            console.error("Erreur chargement campagne:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-400 text-xs font-medium ${className}`}>
                <Clock className="w-3.5 h-3.5 animate-spin" />
                Chargement...
            </div>
        );
    }

    if (!campaign || !campaign.campaign_id) {
        return (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-medium ${className}`}>
                <AlertCircle className="w-3.5 h-3.5" />
                Aucune campagne
            </div>
        );
    }

    const statusConfig = {
        completed: {
            icon: CheckCircle2,
            bgColor: 'bg-emerald-50',
            textColor: 'text-emerald-700',
            borderColor: 'border-emerald-200',
            label: 'Complétée'
        },
        pending: {
            icon: Clock,
            bgColor: 'bg-amber-50',
            textColor: 'text-amber-700',
            borderColor: 'border-amber-200',
            label: 'En attente'
        }
    };

    const config = statusConfig[campaign.status] || statusConfig.pending;
    const Icon = config.icon;

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
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

    return (
        <div className={className}>
            <div className={`inline-flex flex-col gap-1.5 px-3 py-2 rounded-lg ${config.bgColor} border ${config.borderColor} shadow-sm min-w-[280px]`}>
                {/* Ligne 1: ID Campagne + Statut */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${config.textColor}`} />
                        <span className={`text-xs font-bold ${config.textColor}`}>{campaign.campaign_id}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
                        {config.label}
                    </span>
                </div>

                {/* Ligne 2: Utilisateur */}
                {campaign.launched_by_username && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                        <User className="w-3 h-3 opacity-60" />
                        <span className="font-medium">{campaign.launched_by_username}</span>
                    </div>
                )}

                {/* Ligne 3: Périmètre */}
                {campaign.scope_label && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                        <MapPin className="w-3 h-3 opacity-60" />
                        <span className="font-medium">{campaign.scope_label}</span>
                    </div>
                )}

                {/* Ligne 4: Date/Heure */}
                {campaign.created_at && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <Clock className="w-3 h-3 opacity-60" />
                        <span className="font-medium">{formatDate(campaign.created_at)}</span>
                    </div>
                )}

                {/* Ligne 5: Statistiques */}
                {campaign.stats && campaign.stats.total > 0 && (
                    <div className="flex items-center gap-3 pt-1.5 mt-1.5 border-t border-slate-200/50">
                        <span className="inline-flex items-center gap-1 text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span className="font-semibold text-emerald-700">{campaign.stats.promotions}</span>
                            <span className="text-slate-500">↑</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            <span className="font-semibold text-rose-700">{campaign.stats.downgrades}</span>
                            <span className="text-slate-500">↓</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span className="font-semibold text-slate-600">{campaign.stats.stable}</span>
                            <span className="text-slate-500">=</span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CampaignBadge;
