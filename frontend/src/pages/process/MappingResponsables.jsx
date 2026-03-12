import React, { useState, useEffect } from 'react';
import {
    ArrowRightLeft,
    Plus,
    Trash2,
    Save,
    Search,
    AlertCircle,
    CheckCircle2,
    Users,
    Building,
    FileUp,
    Download,
    FileWarning
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { Button } from '@/components/button';
import { api } from '@/lib/api';
import Select from 'react-select';

export default function MappingResponsables() {
    const [mappings, setMappings] = useState([]);
    const [postes, setPostes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');

    // Formatter pour react-select
    const posteOptions = postes.map(p => ({
        value: p.id,
        label: `${p.label} (${p.Code})`
    }));

    // New mapping state
    const [newMapping, setNewMapping] = useState({
        poste_source_id: '',
        poste_cible_id: '',
        centre_id: null
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch available postes
            const postesData = await api.getAvailablePostes();
            setPostes(postesData || []);

            // Fetch current mappings
            const mappingsData = await api.getMappings();
            setMappings(mappingsData || []);
        } catch (err) {
            console.error('Erreur chargement données:', err);
            setError('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMapping = async () => {
        if (!newMapping.poste_source_id || !newMapping.poste_cible_id) {
            toast.error("Veuillez sélectionner les deux postes");
            return;
        }

        try {
            await api.createMapping({
                poste_source_id: parseInt(newMapping.poste_source_id),
                poste_cible_id: parseInt(newMapping.poste_cible_id),
                centre_id: newMapping.centre_id
            });
            toast.success("Mapping enregistré");
            setNewMapping({ poste_source_id: '', poste_cible_id: '', centre_id: null });
            loadData();
        } catch (err) {
            toast.error("Échec de l'enregistrement");
        }
    };

    const handleDeleteMapping = async (id) => {
        if (!window.confirm("Supprimer ce mapping ?")) return;

        try {
            await api.deleteMapping(id);
            toast.success("Mapping supprimé");
            loadData();
        } catch (err) {
            toast.error("Échec de la suppression");
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            await api.downloadMappingTemplate();
            toast.success("Modèle téléchargé");
        } catch (err) {
            toast.error("Erreur lors du téléchargement");
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            const res = await api.importMappings(file);
            let msg = `${res.created} créés, ${res.updated} mis à jour`;

            if (res.hasErrors) {
                msg += `. ${res.errorsCount} rejets téléchargés sous forme d'Excel.`;
                toast.success(msg, { duration: 6000 });
            } else {
                toast.success(msg);
            }
            loadData();
        } catch (err) {
            toast.error("Échec de l'importation");
        } finally {
            setImporting(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleDownloadUnmappedReport = async () => {
        try {
            await api.downloadUnmappedReport();
            toast.success("Rapport généré");
        } catch (err) {
            toast.error("Erreur lors de la génération du rapport");
        }
    };

    // Style personnalisé pour react-select pour matcher Tailwind
    const customStyles = {
        control: (base) => ({
            ...base,
            borderRadius: '0.375rem',
            borderColor: '#cbd5e1', // slate-300
            padding: '1px',
            fontSize: '0.875rem',
            '&:hover': {
                borderColor: '#94a3b8' // slate-400
            }
        })
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <Toaster />
            <div className="max-w-5xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ArrowRightLeft className="w-6 h-6 text-blue-600" />
                        Mapping des Responsables (Processus Consolidé)
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                        <Button
                            onClick={handleDownloadTemplate}
                            variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Modèle Import
                        </Button>

                        <div className="relative">
                            <input
                                type="file"
                                id="import-mapping"
                                className="hidden"
                                accept=".xlsx, .xls"
                                onChange={handleImport}
                                disabled={importing}
                            />
                            <Button
                                onClick={() => document.getElementById('import-mapping').click()}
                                variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50"
                                disabled={importing}
                            >
                                <FileUp className="w-4 h-4 mr-2" />
                                {importing ? "Importation..." : "Importer Excel"}
                            </Button>
                        </div>

                        <Button
                            onClick={handleDownloadUnmappedReport}
                            variant="outline"
                            className="text-amber-600 border-amber-200 hover:bg-amber-50"
                        >
                            <FileWarning className="w-4 h-4 mr-2" />
                            Postes non mappés
                        </Button>
                    </div>
                    <p className="text-slate-600 mt-3">
                        Définissez les correspondances entre les postes actuels et les postes recommandés pour la simulation.
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {/* Formulaire d'ajout */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-green-600" />
                        Ajouter une correspondance
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Poste Actuel (Source)</label>
                            <Select
                                options={posteOptions}
                                placeholder="Rechercher un poste..."
                                styles={customStyles}
                                value={posteOptions.find(o => o.value === newMapping.poste_source_id)}
                                onChange={(option) => setNewMapping({ ...newMapping, poste_source_id: option ? option.value : '' })}
                                isClearable
                            />
                        </div>

                        <div className="flex justify-center pb-2">
                            <ArrowRightLeft className="w-6 h-6 text-slate-400" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Poste Consolidé (Cible)</label>
                            <Select
                                options={posteOptions}
                                placeholder="Rechercher un poste..."
                                styles={customStyles}
                                value={posteOptions.find(o => o.value === newMapping.poste_cible_id)}
                                onChange={(option) => setNewMapping({ ...newMapping, poste_cible_id: option ? option.value : '' })}
                                isClearable
                            />
                        </div>

                        <div className="lg:col-span-3 flex justify-end">
                            <Button onClick={handleCreateMapping} className="bg-blue-600 hover:bg-blue-700 text-white">
                                <Save className="w-4 h-4 mr-2" />
                                Enregistrer le mapping
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Liste des mappings */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            Mappings Actifs
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 text-slate-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Poste Source</th>
                                    <th className="px-6 py-3 text-center"></th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Poste Cible</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {mappings.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-slate-500 italic">
                                            Aucun mapping défini pour le moment.
                                        </td>
                                    </tr>
                                ) : (
                                    mappings.map((m) => (
                                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{m.poste_source_label}</div>
                                                <div className="text-xs text-slate-500">{m.poste_source_code}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <ArrowRightLeft className="w-4 h-4 text-slate-400 mx-auto" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{m.poste_cible_label}</div>
                                                <div className="text-xs text-slate-500">{m.poste_cible_code}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDeleteMapping(m.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
