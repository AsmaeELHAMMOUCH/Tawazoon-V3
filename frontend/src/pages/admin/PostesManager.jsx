// PostesManager.jsx - Page CRUD pour gérer les postes d'un centre
import React, { useState, useEffect } from 'react';
import {
    Building,
    UserRound,
    Plus,
    Pencil,
    Trash2,
    Save,
    X,
    AlertCircle,
    CheckCircle2,
    MapPin,
    Tag,
    Upload,
    Download,
    Search
} from 'lucide-react';
import { api } from '@/lib/api';

export default function PostesManager() {
    // États hiérarchiques (Région → Typologie → Centre)
    const [regions, setRegions] = useState([]);
    const [typologies, setTypologies] = useState([]);
    const [centres, setCentres] = useState([]);
    const [allCentres, setAllCentres] = useState([]); // Tous les centres (non filtrés)

    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedTypologie, setSelectedTypologie] = useState('');
    const [selectedCentre, setSelectedCentre] = useState('');

    const [postes, setPostes] = useState([]);
    const [availablePostes, setAvailablePostes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState(''); // État pour la recherche

    // États pour l'édition
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [apsValue, setApsValue] = useState(0);
    const [editingAps, setEditingAps] = useState(false);
    const [importing, setImporting] = useState(false);
    const [viewAll, setViewAll] = useState(false); // Nouvel état

    // États pour l'édition Référentiel
    const [editingRefId, setEditingRefId] = useState(null);
    const [editRefForm, setEditRefForm] = useState({});

    // États pour l'ajout
    const [showAddForm, setShowAddForm] = useState(false);
    const [addForm, setAddForm] = useState({
        poste_id: '',
        effectif_actuel: 0,
        effectif_aps: 0
    });

    // Import
    const fileInputRef = React.useRef(null);
    const fileInputCentreRef = React.useRef(null);

    // Charger les données au montage
    useEffect(() => {
        loadRegions();
        loadTypologies();
        loadAllCentres();
        loadAvailablePostes();
    }, []);

    // Filtrer les centres selon région et typologie
    useEffect(() => {
        filterCentres();
    }, [selectedRegion, selectedTypologie, allCentres]);

    // Charger les postes quand un centre est sélectionné
    useEffect(() => {
        if (selectedCentre && !viewAll) {
            loadPostes();
        } else if (!viewAll) {
            setPostes([]);
        }
    }, [selectedCentre]);

    // Recharger quand viewAll change
    useEffect(() => {
        if (viewAll) {
            loadPostes();
        } else {
            if (selectedCentre) loadPostes();
            else setPostes([]);
        }
    }, [viewAll]);

    const loadRegions = async () => {
        try {
            const data = await api.regions();
            setRegions(data || []);
        } catch (err) {
            console.error('Erreur chargement régions:', err);
        }
    };

    const loadTypologies = async () => {
        try {
            const data = await api.categories();
            setTypologies(data || []);
        } catch (err) {
            console.error('Erreur chargement typologies:', err);
        }
    };

    const loadAllCentres = async () => {
        try {
            const data = await api.centres();
            setAllCentres(data || []);
        } catch (err) {
            setError('Erreur lors du chargement des centres');
            console.error(err);
        }
    };

    const filterCentres = () => {
        let filtered = [...allCentres];

        if (selectedRegion) {
            filtered = filtered.filter(c => String(c.region_id) === String(selectedRegion));
        }

        if (selectedTypologie) {
            filtered = filtered.filter(c => String(c.categorie_id) === String(selectedTypologie));
        }

        setCentres(filtered);

        // Réinitialiser le centre sélectionné si plus dans la liste filtrée
        if (selectedCentre && !filtered.find(c => String(c.id) === String(selectedCentre))) {
            setSelectedCentre('');
        }
    };

    const loadAvailablePostes = async () => {
        try {
            const response = await fetch('http://localhost:8001/api/pm/postes/available');
            const data = await response.json();
            setAvailablePostes(data || []);
        } catch (err) {
            console.error('Erreur chargement postes disponibles:', err);
        }
    };

    const loadPostes = async () => {
        if (!selectedCentre && !viewAll) return;

        setLoading(true);
        setError('');

        try {
            const url = viewAll
                ? 'http://localhost:8001/api/pm/postes/available'
                : `http://localhost:8001/api/pm/centres/${selectedCentre}/postes`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Erreur chargement');
            const data = await response.json();
            setPostes(data);

            // APS
            if (data.length > 0 && !viewAll) {
                setApsValue(data[0].effectif_aps || 0);
            }
        } catch (err) {
            console.error(err);
            setError('Impossible de charger les postes');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (poste) => {
        setEditingId(poste.centre_poste_id);
        setEditForm({
            effectif_actuel: poste.effectif_actuel || 0,
            effectif_statutaire: poste.effectif_statutaire || 0,
            effectif_aps: poste.effectif_aps || 0
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSaveEdit = async (centrePosteId) => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`http://localhost:8001/api/pm/centre-postes/${centrePosteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });

            if (!response.ok) throw new Error('Erreur mise à jour');

            setSuccess('Effectifs mis à jour avec succès');
            setEditingId(null);
            setEditForm({});
            await loadPostes();

            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Erreur lors de la mise à jour');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAps = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`http://localhost:8001/api/pm/centres/${selectedCentre}/aps`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ effectif_aps: Number(apsValue) })
            });

            if (!response.ok) throw new Error('Erreur mise à jour APS');

            setSuccess('Effectif APS mis à jour avec succès');
            setEditingAps(false);
            await loadPostes(); // Recharger pour que tous les postes aient la nouvelle valeur

            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Erreur lors de la mise à jour de l\'effectif APS');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!addForm.poste_id) {
            setError('Veuillez sélectionner un poste');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`http://localhost:8001/api/pm/centres/${selectedCentre}/postes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addForm)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Erreur ajout');
            }

            setSuccess('Poste ajouté avec succès');
            setShowAddForm(false);
            setAddForm({
                poste_id: '',
                effectif_actuel: 0,
                effectif_aps: 0
            });
            await loadPostes();

            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Erreur lors de l\'ajout');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImporting(true);
        setSuccess('');
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:8001/api/pm/import-effectifs', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();

            if (data.success) {
                let msg = data.message || "Import réussi";
                if (data.errors && data.errors.length > 0) {
                    msg += ` (${data.errors.length} erreurs)`;
                    console.warn("Erreurs import:", data.errors);
                }
                setSuccess(msg);

                // Recharger les données si un centre est sélectionné
                if (selectedCentre || viewAll) {
                    await loadPostes();
                }
            } else {
                setError(data.message || "Erreur lors de l'import");
            }
        } catch (err) {
            console.error(err);
            setError("Erreur technique lors de l'import");
        } finally {
            setImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset input
            }
        }
    };

    const handleFileChangeCentre = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedCentre) return;

        setImporting(true);
        setSuccess('');
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`http://localhost:8001/api/pm/centres/${selectedCentre}/import-effectifs`, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();

            if (data.success) {
                setSuccess(data.message || "Import réussi pour le centre");
                await loadPostes();
            } else {
                setError(data.message || "Erreur lors de l'import");
            }
        } catch (err) {
            console.error(err);
            setError("Erreur technique lors de l'import");
        } finally {
            setImporting(false);
            if (fileInputCentreRef.current) {
                fileInputCentreRef.current.value = ''; // Reset input
            }
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await fetch('http://localhost:8001/api/pm/export-template');
            if (!response.ok) throw new Error('Erreur téléchargement');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "template_effectifs.xlsx";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error(err);
            setError("Erreur technique lors du téléchargement");
        }
    };

    const handleDownloadTemplateCentre = async () => {
        if (!selectedCentre) return;
        try {
            const response = await fetch(`http://localhost:8001/api/pm/centres/${selectedCentre}/export-template`);
            if (!response.ok) throw new Error('Erreur téléchargement');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `template_effectifs_${selectedCentreObj?.label || selectedCentre}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error(err);
            setError("Erreur technique lors du téléchargement du modèle centre");
        }
    };

    const handleDelete = async (centrePosteId, posteLabel) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer le poste "${posteLabel}" ?\n⚠️ Toutes les tâches associées seront également supprimées.`)) {
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`http://localhost:8001/api/pm/centre-postes/${centrePosteId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Erreur suppression');

            setSuccess('Poste supprimé avec succès');
            await loadPostes();

            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Erreur lors de la suppression');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- HANDLERS REFERENTIEL ---
    const handleEditRef = (poste) => {
        setEditingRefId(poste.id);
        setEditRefForm({
            label: poste.label,
            type_poste: poste.type_poste
        });
    };

    const handleCancelRefEdit = () => {
        setEditingRefId(null);
        setEditRefForm({});
    };

    const handleSaveRefEdit = async (posteId) => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`http://localhost:8001/api/pm/postes/${posteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editRefForm)
            });

            if (!response.ok) throw new Error('Erreur mise à jour référentiel');

            setSuccess('Poste mis à jour (Référentiel)');
            setEditingRefId(null);
            setEditRefForm({});
            await loadPostes();

            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Erreur lors de la mise à jour');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRef = async (posteId, posteLabel) => {
        if (!confirm(`ATTENTION : Suppression du poste référentiel "${posteLabel}".\n\nCela supprimera ce poste de TOUS les centres où il est présent, ainsi que toutes les tâches associées.\n\nÊtes-vous sûr ?`)) {
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`http://localhost:8001/api/pm/postes/${posteId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Erreur suppression référentiel');

            setSuccess('Poste supprimé du référentiel');
            await loadPostes();

            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Erreur lors de la suppression');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const selectedCentreObj = centres.find(c => c.id === Number(selectedCentre));

    // Filtrage des postes
    const filteredPostes = postes.filter(p => {
        const label = (p.label || p.poste_label || "").toLowerCase();
        return label.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-4 flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <UserRound className="w-5 h-5 text-blue-600" />
                            Gestion des Postes par Centre
                        </h1>
                        <p className="text-xs text-slate-600 mt-1">
                            Gérez les effectifs actuels pour chaque poste d'un centre
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Template
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".xlsx, .xls"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current.click()}
                            disabled={importing}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                            {importing ? (
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Upload className="w-3.5 h-3.5" />
                            )}
                            Import Masse
                        </button>
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-xs">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        {success}
                    </div>
                )}

                {/* Sélection hiérarchique : Région → Typologie → Centre */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-4">
                    <h2 className="text-sm font-semibold text-slate-900 mb-2">Filtres de sélection</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Région */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                <MapPin className="w-3 h-3 inline mr-1" />
                                Région
                            </label>
                            <select
                                value={selectedRegion}
                                onChange={(e) => {
                                    setSelectedRegion(e.target.value);
                                    setSelectedTypologie('');
                                    setSelectedCentre('');
                                }}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                disabled={viewAll}
                            >
                                <option value="">Toutes les régions</option>
                                {regions.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Typologie */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                <Tag className="w-3 h-3 inline mr-1" />
                                Typologie
                            </label>
                            <select
                                value={selectedTypologie}
                                onChange={(e) => {
                                    setSelectedTypologie(e.target.value);
                                    setSelectedCentre('');
                                }}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                disabled={viewAll}
                            >
                                <option value="">Toutes les typologies</option>
                                {typologies.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Centre */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                <Building className="w-3 h-3 inline mr-1" />
                                Centre
                            </label>
                            <select
                                value={selectedCentre}
                                onChange={(e) => setSelectedCentre(e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                disabled={centres.length === 0 || viewAll}
                            >
                                <option value="">-- Choisir un centre --</option>
                                {centres.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                            {centres.length === 0 && (selectedRegion || selectedTypologie) && (
                                <p className="mt-1 text-xs text-amber-600">
                                    Aucun centre ne correspond aux filtres sélectionnés
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end mt-3">
                        <button
                            onClick={() => {
                                setViewAll(!viewAll);
                                if (!viewAll) { // If switching to viewAll, clear filters
                                    setSelectedRegion('');
                                    setSelectedTypologie('');
                                    setSelectedCentre('');
                                }
                            }}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${viewAll
                                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                }`}
                        >
                            {viewAll ? "Vue Filtrée" : "Référentiel Postes (Tout)"}
                        </button>
                    </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                        {!viewAll && selectedCentre && (
                            <>
                                <input
                                    type="file"
                                    ref={fileInputCentreRef}
                                    onChange={handleFileChangeCentre}
                                    accept=".xlsx, .xls"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputCentreRef.current.click()}
                                    disabled={importing}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {importing ? (
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Upload className="w-3.5 h-3.5" />
                                    )}
                                    Import Centre
                                </button>

                                <button
                                    onClick={handleDownloadTemplateCentre}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white text-emerald-700 border border-emerald-300 text-xs font-semibold rounded-lg hover:bg-emerald-50 transition-colors shadow-sm"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Modèle Centre
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Liste des postes */}
                {(selectedCentre || viewAll) && (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-900">
                                {viewAll ? "Référentiel des Postes (Table Postes)" : `Postes du centre : ${selectedCentreObj?.label}`}
                            </h2>
                        </div>



                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        {viewAll ? (
                                            <>
                                                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-700 uppercase min-w-[200px]">
                                                    <div className="flex flex-col gap-1">
                                                        <span>Libellé Poste</span>
                                                        <div className="relative">
                                                            <Search className="absolute left-1.5 top-1.5 w-3 h-3 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                placeholder="Filtrer..."
                                                                value={searchTerm}
                                                                onChange={e => setSearchTerm(e.target.value)}
                                                                className="w-full pl-6 pr-2 py-0.5 text-xs bg-slate-100 border-none rounded focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400 font-normal normal-case"
                                                            />
                                                        </div>
                                                    </div>
                                                </th>
                                                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-700 uppercase">Type</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-700 uppercase min-w-[200px]">
                                                    <div className="flex flex-col gap-1">
                                                        <span>Poste</span>
                                                        <div className="relative">
                                                            <Search className="absolute left-1.5 top-1.5 w-3 h-3 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                placeholder="Filtrer..."
                                                                value={searchTerm}
                                                                onChange={e => setSearchTerm(e.target.value)}
                                                                className="w-full pl-6 pr-2 py-0.5 text-xs bg-slate-100 border-none rounded focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400 font-normal normal-case"
                                                            />
                                                        </div>
                                                    </div>
                                                </th>
                                                <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-700 uppercase">Type</th>
                                                <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-700 uppercase">Effectif Actuel</th>
                                                <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-700 uppercase">Effectif APS</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={viewAll ? 2 : 4} className="px-3 py-4 text-center text-slate-500 text-xs">Chargement...</td></tr>
                                    ) : filteredPostes.length === 0 ? (
                                        <tr><td colSpan={viewAll ? 2 : 4} className="px-3 py-4 text-center text-slate-500 text-xs">
                                            {postes.length > 0 ? "Aucun poste ne correspond à votre recherche" : "Aucun poste trouvé"}
                                        </td></tr>
                                    ) : (
                                        filteredPostes.map((poste, idx) => (
                                            <tr key={viewAll ? poste.id : poste.centre_poste_id} className="hover:bg-slate-50 transition-colors">
                                                {viewAll ? (
                                                    // VUE GLOBALE (Reference)
                                                    <>
                                                        <td className="px-3 py-2 text-xs font-semibold text-slate-900">
                                                            {editingRefId === poste.id ? (
                                                                <input
                                                                    type="text"
                                                                    value={editRefForm.label}
                                                                    onChange={(e) => setEditRefForm({ ...editRefForm, label: e.target.value })}
                                                                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                                                                />
                                                            ) : (
                                                                poste.label
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {editingRefId === poste.id ? (
                                                                <select
                                                                    value={editRefForm.type_poste}
                                                                    onChange={(e) => setEditRefForm({ ...editRefForm, type_poste: e.target.value })}
                                                                    className="px-2 py-1 border border-slate-300 rounded text-xs"
                                                                >
                                                                    <option value="MOD">MOD</option>
                                                                    <option value="MOI">MOI</option>
                                                                </select>
                                                            ) : (
                                                                <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${poste.type_poste === 'MOD'
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : 'bg-purple-100 text-purple-700'
                                                                    }`}>
                                                                    {poste.type_poste}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </>
                                                ) : (
                                                    // VUE CENTRE (Assignments)
                                                    <>
                                                        <td className="px-3 py-2 text-xs font-medium text-slate-900">
                                                            {poste.poste_label}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${poste.type_poste === 'MOD'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : 'bg-purple-100 text-purple-700'
                                                                }`}>
                                                                {poste.type_poste}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            {editingId === poste.centre_poste_id ? (
                                                                <input
                                                                    type="number"
                                                                    value={editForm.effectif_actuel}
                                                                    onChange={(e) => setEditForm({ ...editForm, effectif_actuel: Number(e.target.value) })}
                                                                    className="w-16 px-1 py-0.5 border border-slate-300 rounded text-center text-xs"
                                                                />
                                                            ) : (
                                                                <span className="text-xs font-semibold text-slate-900">{poste.effectif_actuel}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className="text-xs text-slate-400">-</span>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                    {/* Ligne TOTAL (seulement en mode Centre) */}
                                    {!viewAll && postes.length > 0 && (
                                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-200">
                                            <td colSpan={2} className="px-3 py-2 text-right text-slate-700 text-xs">
                                                TOTAL
                                            </td>
                                            <td className="px-3 py-2 text-center text-slate-900 text-xs">
                                                {postes.reduce((acc, p) => acc + (Number(p.effectif_actuel) || 0), 0)}
                                            </td>
                                            <td className="px-3 py-2 text-center text-slate-900 text-xs">
                                                {editingAps ? (
                                                    <div className="flex items-center justify-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={apsValue}
                                                            onChange={(e) => setApsValue(Number(e.target.value))}
                                                            className="w-16 px-1 py-0.5 border border-blue-300 rounded text-center text-xs focus:ring-1 focus:ring-blue-500"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={handleSaveAps}
                                                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                                                            title="Sauvegarder APS"
                                                        >
                                                            <Save className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingAps(false)}
                                                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                            title="Annuler"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="group flex items-center justify-center gap-2 cursor-pointer" onClick={() => setEditingAps(true)} title="Cliquez pour modifier l'APS global">
                                                        <span className="font-bold">{apsValue}</span>
                                                        <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                )}
                                            </td>
                                            <td></td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
