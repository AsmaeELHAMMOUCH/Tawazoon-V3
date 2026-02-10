import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
    Layers, Upload, Trash2, Edit2, Check, X, Download
} from 'lucide-react';

export default function CentersTasksManager() {
    const [regions, setRegions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [directions, setDirections] = useState([]); // New
    const [centres, setCentres] = useState([]);
    const [postes, setPostes] = useState([]);

    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedCentre, setSelectedCentre] = useState('');
    const [selectedPoste, setSelectedPoste] = useState('');

    const [taches, setTaches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        nom: '', region_id: '', direction_id: '', categorie_id: ''
    });

    useEffect(() => {
        Promise.all([
            api.regions(),
            api.categories(),
            api.directions()
        ]).then(([regs, cats, dirs]) => {
            setRegions(regs);
            setCategories(cats);
            setDirections(dirs);
        });
    }, []);

    useEffect(() => {
        if (selectedRegion || selectedCategory) {
            setLoading(true);
            api.centres(selectedRegion, selectedCategory)
                .then(setCentres)
                .catch(e => setError(e.message))
                .finally(() => setLoading(false));
        } else {
            setCentres([]);
        }
    }, [selectedRegion, selectedCategory]);

    useEffect(() => {
        if (selectedCentre) {
            api.postes(selectedCentre).then(setPostes);
            setSelectedPoste('');
            loadTaches();
        } else {
            setPostes([]);
            setTaches([]);
        }
    }, [selectedCentre]);

    useEffect(() => {
        if (selectedCentre) {
            loadTaches();
        }
    }, [selectedPoste]); // Reload when poste changes

    const loadTaches = () => {
        setLoading(true);
        api.taches({ centreId: selectedCentre, posteId: selectedPoste })
            .then(setTaches)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    };

    const handleDownloadTemplate = async () => {
        try {
            const blob = await api.getImportTemplate();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "modele_taches_centre.xlsx";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            alert("Erreur téléchargement modèle: " + e.message);
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];

        if (!file || !selectedCentre) return;

        // No check for selectedPoste anymore (it's global for centre)
        if (!window.confirm("Cet import mettra à jour les tâches pour ce centre en utilisant le modèle Excel (colonnes Responsable 1/2). \nCela peut modifier les chronos et responsables existants. Continuer ?")) {
            e.target.value = null;
            return;
        }

        try {
            setLoading(true);
            const res = await api.importTasksFromTemplate(selectedCentre, file);
            alert(`Import Réussi :\n- ${res.updated_count} tâches mises à jour\n- ${res.duplicate_count} doublons gérés\n- ${res.not_found_count} non trouvées\n\n(Détails dans la console si erreurs)`);
            if (res.errors && res.errors.length > 0) {
                console.warn("Import Errors:", res.errors);
            }
            loadTaches();
        } catch (e) {
            alert("Erreur import: " + e.message);
        } finally {
            setLoading(false);
            e.target.value = null;
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Supprimer cette tâche ?")) return;
        try {
            await api.deleteTache(id);
            setTaches(prev => prev.filter(t => t.id !== id));
        } catch (e) {
            alert("Erreur: " + e.message);
        }
    };

    const handleEditClick = () => {
        const centre = centres.find(c => String(c.id) === String(selectedCentre));
        if (!centre) return;

        setEditFormData({
            nom: centre.label,
            region_id: centre.region_id || '',
            direction_id: centre.direction_id || '',
            categorie_id: centre.categorie_id || ''
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateCentre = async () => {
        try {
            await api.updateCentreDetail(selectedCentre, editFormData);

            // Refresh list keeping current filters
            setLoading(true);
            const updatedCentres = await api.centres(selectedRegion, selectedCategory);
            setCentres(updatedCentres);

            setIsEditModalOpen(false);
            // alert("Centre mis à jour !"); // Optional feedback
        } catch (e) {
            alert("Erreur mise à jour: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-slate-50 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50 to-slate-50 pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
            <div className="absolute top-1/4 -left-24 w-72 h-72 bg-indigo-100 rounded-full blur-3xl opacity-40 pointer-events-none" />

            <div className="relative max-w-7xl mx-auto p-6 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
                                <Layers className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
                                Gestion Centre & Tâches
                            </span>
                        </h1>
                        <p className="mt-2 text-slate-500 text-sm max-w-2xl">
                            Configurez les référentiels de tâches et gérez les informations du centre.
                        </p>
                    </div>
                </div>

                {/* Filters Card - Compact & Clean */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-0.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Région</label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 block p-1.5 h-8 outline-none hover:bg-white transition-colors"
                                value={selectedRegion}
                                onChange={e => setSelectedRegion(e.target.value)}
                            >
                                <option value="">-- Toutes les régions --</option>
                                {regions.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Typologie</label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 block p-1.5 h-8 outline-none hover:bg-white transition-colors"
                                value={selectedCategory}
                                onChange={e => setSelectedCategory(e.target.value)}
                            >
                                <option value="">-- Toutes --</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Centre</label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 block p-1.5 h-8 outline-none hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                value={selectedCentre}
                                onChange={e => setSelectedCentre(e.target.value)}
                                disabled={!selectedRegion && !selectedCategory}
                            >
                                <option value="">-- Sélectionner un centre --</option>
                                {centres.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Poste (Filtre)</label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 block p-1.5 h-8 outline-none hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                value={selectedPoste}
                                onChange={e => setSelectedPoste(e.target.value)}
                                disabled={!selectedCentre}
                            >
                                <option value="">-- Tous les postes --</option>
                                {postes.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                {selectedCentre ? (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
                        {/* Toolbar - Compact */}
                        <div className="p-3 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                Liste des Tâches
                                {selectedPoste && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-semibold tracking-wide">FILTRÉ</span>}
                            </h2>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
                                    title="Télécharger le modèle Excel"
                                >
                                    <Download className="w-3.5 h-3.5 text-green-600" />
                                    <span>Modèle</span>
                                </button>

                                <button
                                    onClick={handleEditClick}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
                                    title="Modifier les informations du centre"
                                >
                                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Centre</span>
                                </button>

                                <label className={`
                                    flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all shadow-sm border
                                    bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer hover:border-slate-300
                                `}>
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Import Global</span>
                                    <input
                                        type="file"
                                        accept=".xlsx"
                                        className="hidden"
                                        onChange={handleImport}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Table - Compact & Denser */}
                        {loading ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 animate-in fade-in">
                                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                                <span className="text-xs font-medium">Chargement...</span>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                                            <th className="px-3 py-2">Poste</th>
                                            <th className="px-3 py-2">Tâche</th>
                                            <th className="px-3 py-2">Famille</th>
                                            <th className="px-3 py-2">Unité</th>
                                            <th className="px-3 py-2 text-right">Moy. (min)</th>
                                            <th className="px-3 py-2">Produit</th>
                                            <th className="px-3 py-2 text-right">Base %</th>
                                            <th className="px-3 py-2 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                        {taches.length > 0 ? (taches.map((t, idx) => (
                                            <tr key={t.id || idx} className="hover:bg-blue-50/20 group transition-colors">
                                                <td className="px-3 py-2 font-medium text-slate-800 border-l-2 border-transparent group-hover:border-blue-500 transition-all">
                                                    {t.nom_poste || t.poste_label}
                                                </td>
                                                <td className="px-3 py-2 max-w-xs truncate" title={t.nom_tache || t.task}>
                                                    {t.nom_tache || t.task}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="text-slate-500">
                                                        {t.famille_uo || t.famille}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{t.unite_mesure || t.unit}</td>
                                                <td className="px-3 py-2 text-right font-mono font-medium text-slate-900">
                                                    {formatNumber(t.moyenne_min || (t.avg_sec / 60))}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border
                                                        ${t.produit === 'CO' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                            t.produit === 'CR' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                                'bg-slate-50 text-slate-600 border-slate-200'}
                                                     `}>
                                                        {t.produit}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-right font-mono text-slate-500">{t.base_calcul}%</td>
                                                <td className="px-3 py-2 text-center">
                                                    <button
                                                        onClick={() => handleDelete(t.id)}
                                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Supprimer la tâche"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))) : (
                                            <tr>
                                                <td colSpan="8" className="p-12 text-center">
                                                    <div className="flex flex-col items-center justify-center text-slate-400 max-w-sm mx-auto">
                                                        <Layers className="w-8 h-8 text-slate-200 mb-2" />
                                                        <p className="text-xs text-slate-400">
                                                            Aucune tâche.
                                                            {selectedPoste && " Importez un fichier."}
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Footer Status - Compact */}
                        <div className="bg-slate-50 p-2 border-t border-slate-200 text-[10px] text-slate-400 flex justify-between items-center px-4">
                            <span>Total: {taches.length} enregistrements</span>
                            <span>Synchronisé</span>
                        </div>
                    </div>
                ) : (
                    // Empty State for No Selection - Compact
                    <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-slate-400">
                        <Layers className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-xs text-slate-500">
                            Sélectionnez un centre ci-dessus pour gérer ses tâches ou modifier ses informations.
                        </p>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl border border-white/50 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Edit2 className="w-5 h-5 text-blue-600" />
                                Modifier le Centre
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nom du Centre</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editFormData.nom}
                                    onChange={e => setEditFormData({ ...editFormData, nom: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Région</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editFormData.region_id}
                                    onChange={e => setEditFormData({ ...editFormData, region_id: e.target.value })}
                                >
                                    <option value="">-- Sélectionner --</option>
                                    {regions.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Direction</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editFormData.direction_id}
                                    onChange={e => setEditFormData({ ...editFormData, direction_id: e.target.value })}
                                >
                                    <option value="">-- Sélectionner --</option>
                                    {directions.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Typologie</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={editFormData.categorie_id}
                                    onChange={e => setEditFormData({ ...editFormData, categorie_id: e.target.value })}
                                >
                                    <option value="">-- Sélectionner --</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleUpdateCentre}
                                className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" /> Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


// Petite fonction utilitaire pour le formatage propre
const formatNumber = (num) => {
    if (num === undefined || num === null) return "-";
    return Number(num).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
