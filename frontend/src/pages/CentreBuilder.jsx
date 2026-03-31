import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { builderService } from '../services/builderService';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
    Building2, MapPin, Users, Tag, Layers, Sparkles,
    ArrowLeft, AlertCircle, Loader2, FlaskConical, ChevronRight, Map
} from 'lucide-react';

export default function CentreBuilder() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [refsLoading, setRefsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [regions, setRegions] = useState([]);
    const [villes, setVilles] = useState([]);
    const [refCategories, setRefCategories] = useState([]);

    const [identity, setIdentity] = useState({
        nom: '',
        region_id: '',
        ville_code: '',
        direction_id: '',
        categorie_id: ''
    });

    useEffect(() => {
        const loadRefs = async () => {
            setRefsLoading(true);
            setError(null);
            try {
                const results = await Promise.allSettled([
                    builderService.getRegions(),
                    builderService.getRefCategories(),
                    builderService.getVilles()
                ]);

                if (results[0].status === 'fulfilled') setRegions(results[0].value || []);
                if (results[1].status === 'fulfilled') setRefCategories(results[1].value || []);
                if (results[2].status === 'fulfilled') setVilles(results[2].value || []);

                const failures = results.filter(r => r.status === 'rejected');
                if (failures.length > 0) {
                    setError(`${failures.length} ressource(s) introuvable(s). Vérifiez la connexion.`);
                }
            } catch (err) {
                setError("Erreur critique de chargement : " + err.message);
            } finally {
                setRefsLoading(false);
            }
        };
        loadRefs();
    }, []);

    const handleSimulationTest = async () => {
        if (!identity.categorie_id) return;
        const selectedVille = villes.find(v => String(v.code) === String(identity.ville_code));
        if (!selectedVille) return;

        const selectedCat = refCategories.find(c => String(c.value) === String(identity.categorie_id));
        const catLabel = selectedCat ? selectedCat.label : "Standard";

        window.localStorage.removeItem("sim_is_test");
        window.localStorage.removeItem("sim_centre");

        navigate(
            `/app/simulation/wizard?mode=test` +
            `&typology=${encodeURIComponent(catLabel)}` +
            `&catId=${encodeURIComponent(identity.categorie_id)}` +
            `&name=${encodeURIComponent(identity.nom || 'CENTRE TEST')}` +
            `&coeffGeo=${encodeURIComponent(String(selectedVille.geographie ?? 0))}` +
            `&coeffCirc=${encodeURIComponent(String(selectedVille.circulation ?? 0))}` +
            `&dureeTrajet=${encodeURIComponent(String(selectedVille.trajet ?? 0))}`
        );
    };

    const canSubmit = identity.categorie_id && identity.ville_code && !loading;

    const fields = [
        {
            id: 'nom',
            label: 'Nom du Centre',
            icon: Building2,
            iconBg: 'bg-blue-50',
            iconColor: 'text-[#005EA8]',
            type: 'text',
            placeholder: 'Ex : Centre de Tri Principal',
            required: false,
        },
        {
            id: 'region_id',
            label: 'Région',
            icon: Map,
            iconBg: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            type: 'select',
            options: regions.map(r => ({ value: String(r.id), label: r.label || r.nom || String(r.id) })),
            placeholder: 'Sélectionner une région',
            emptyMessage: 'Aucune région trouvée',
        },
        {
            id: 'ville_code',
            label: 'Ville',
            icon: MapPin,
            iconBg: 'bg-cyan-50',
            iconColor: 'text-cyan-600',
            type: 'select',
            options: villes.map(v => ({ value: String(v.code), label: v.label || String(v.code) })),
            placeholder: 'Sélectionner une ville',
            emptyMessage: 'Aucune ville trouvée',
            required: true,
        },
        {
            id: 'categorie_id',
            label: 'Typologie',
            icon: Tag,
            iconBg: 'bg-purple-50',
            iconColor: 'text-purple-600',
            type: 'select',
            options: refCategories.map(c => ({ value: String(c.value), label: c.label || String(c.value) })),
            placeholder: 'Sélectionner une typologie',
            emptyMessage: 'Aucune typologie trouvée',
            required: true,
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#eef6ff] via-white to-[#f4f9ff] flex flex-col">

            {/* Header */}
            <div className="bg-white border-b border-blue-100 shadow-sm">
                <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#005EA8] to-[#48cae4] flex items-center justify-center shadow-md shadow-blue-200">
                            <FlaskConical className="w-4.5 h-4.5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-[#0b3f6f] leading-none">Simulation Test</h1>
                            <p className="text-[11px] text-slate-400 mt-0.5">Configurer un centre virtuel pour tester</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 flex items-start justify-center px-4 py-10">
                <div className="w-full max-w-lg space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-400">

                    {/* Error Banner */}
                    {error && (
                        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    {/* Form Card */}
                    <div className="bg-white rounded-2xl border border-blue-100 shadow-md shadow-blue-50 overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
                            <Building2 className="w-4 h-4 text-[#005EA8]" />
                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                Identité du Centre
                            </span>
                        </div>

                        <div className="p-5 space-y-4">
                            {refsLoading ? (
                                <div className="flex flex-col items-center gap-3 py-8 text-slate-400">
                                    <Loader2 className="w-6 h-6 animate-spin text-[#005EA8]" />
                                    <span className="text-xs font-medium">Chargement des références…</span>
                                </div>
                            ) : (
                                fields.map(field => {
                                    const Icon = field.icon;
                                    return (
                                        <div key={field.id} className="group">
                                            <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                                {field.label}
                                                {field.required && <span className="text-red-400">*</span>}
                                            </label>
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-9 h-9 rounded-lg ${field.iconBg} ${field.iconColor} flex items-center justify-center shrink-0 border border-white shadow-sm`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1">
                                                    {field.type === 'text' ? (
                                                        <input
                                                            type="text"
                                                            value={identity[field.id]}
                                                            onChange={e => setIdentity({ ...identity, [field.id]: e.target.value })}
                                                            placeholder={field.placeholder}
                                                            className="w-full h-9 px-3 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all placeholder:text-slate-300"
                                                        />
                                                    ) : (
                                                        <SearchableSelect
                                                            options={field.options}
                                                            value={identity[field.id]}
                                                            onChange={val => setIdentity({ ...identity, [field.id]: val })}
                                                            placeholder={field.placeholder}
                                                            emptyMessage={field.emptyMessage}
                                                            disabled={field.options.length === 0}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Info hint */}
                    {identity.ville_code && (() => {
                        const v = villes.find(v => String(v.code) === String(identity.ville_code));
                        if (!v) return null;
                        return (
                            <div className="flex items-center gap-3 px-4 py-3 bg-cyan-50 border border-cyan-100 rounded-xl text-[11px] text-cyan-700">
                                <MapPin className="w-3.5 h-3.5 shrink-0 text-cyan-500" />
                                <span>
                                    <span className="font-black">Coefficients détectés :</span>{" "}
                                    Géographie <span className="font-bold">{v.geographie ?? 0}</span> · Circulation <span className="font-bold">{v.circulation ?? 0}</span> · Trajet <span className="font-bold">{v.trajet ?? 0} min</span>
                                </span>
                            </div>
                        );
                    })()}

                    {/* CTA */}
                    <button
                        onClick={handleSimulationTest}
                        disabled={!canSubmit}
                        className="w-full flex items-center justify-center gap-2.5 h-12 rounded-xl bg-gradient-to-r from-[#0077b6] to-[#48cae4] text-white text-sm font-black shadow-lg shadow-blue-300/40 hover:shadow-blue-400/50 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4" />
                        )}
                        Lancer la Simulation Test
                        {!loading && <ChevronRight className="w-4 h-4 opacity-70" />}
                    </button>

                    <p className="text-center text-[10px] text-slate-400">
                        La ville et la typologie sont obligatoires pour lancer la simulation.
                    </p>
                </div>
            </div>
        </div>
    );
}
