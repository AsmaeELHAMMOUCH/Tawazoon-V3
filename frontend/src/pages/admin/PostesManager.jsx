// PostesManager.jsx - Page de consultation des postes et effectifs d'un centre (Lecture seule)
import React, { useState, useEffect } from 'react';
import {
    Building,
    UserRound,
    AlertCircle,
    CheckCircle2,
    MapPin,
    Tag,
    Search,
    FileSpreadsheet,
    Pencil,
    Save,
    X,
    Users,
    Trash2
} from 'lucide-react';
import { api } from '@/lib/api';
import { clearEffectifs, updateCentrePoste } from '@/services/api';
import EffectifUpdateDialog from '@/components/common/EffectifUpdateDialog';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Button } from '@/components/button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

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
    const [viewAll, setViewAll] = useState(false); // Nouvel état

    // États pour la mise à jour des APS
    const [showEffectifDialog, setShowEffectifDialog] = useState(false);
    const [showConfirmClear, setShowConfirmClear] = useState(false);
    // États pour l'édition en ligne des APS par poste
    const [editingCpId, setEditingCpId] = useState(null);
    const [editingField, setEditingField] = useState(null); // 'aps' ou 'effectif'
    const [tempAps, setTempAps] = useState(0);
    const [tempEffectif, setTempEffectif] = useState(0);

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
    }, [selectedCentre, centres]);

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
        } catch (err) {
            console.error(err);
            setError('Impossible de charger les postes');
        } finally {
            setLoading(false);
        }
    };


    const handleSavePosteAps = async (cpId) => {
        try {
            await updateCentrePoste(cpId, { effectif_aps: Number(tempAps) });
            toast.success("APS du poste mis à jour");
            setEditingCpId(null);
            setEditingField(null);
            await loadPostes();
        } catch (err) {
            toast.error("Erreur mise à jour APS du poste");
        }
    };

    const handleSavePosteEffectif = async (cpId) => {
        try {
            await updateCentrePoste(cpId, { effectif_actuel: Number(tempEffectif) });
            toast.success("Effectif du poste mis à jour");
            setEditingCpId(null);
            setEditingField(null);
            await loadPostes();
        } catch (err) {
            toast.error("Erreur mise à jour effectif du poste");
        }
    };

    const handleClearEffectifs = async () => {
        const toastId = toast.loading("Suppression en cours...");
        try {
            await clearEffectifs(selectedRegion, selectedTypologie, selectedCentre);
            toast.success("Effectifs réinitialisés avec succès", { id: toastId });
            await loadAllCentres();
            if (selectedCentre) await loadPostes();
        } catch (err) {
            toast.error("Erreur lors de la suppression des effectifs", { id: toastId });
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
                {/* Header Section */}
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="animate-in fade-in slide-in-from-left duration-700">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <UserRound className="w-6 h-6 text-[#005EA8]" />
                            Gestion des Postes
                        </h1>
                    </div>
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right duration-700">
                        <Button
                            onClick={() => setShowEffectifDialog(true)}
                            className="bg-[#005EA8] hover:bg-[#004e8a] text-white shadow-lg shadow-blue-200/50 border-none transition-all hover:scale-105 active:scale-95"
                        >
                            <Users className="w-4 h-4 mr-2" />
                            Mise à jour Massive
                        </Button>
                        <Button
                            onClick={() => setShowConfirmClear(true)}
                            className="bg-white text-red-600 border-red-100 hover:bg-red-50 hover:border-red-200 shadow-sm"
                            variant="outline"
                        >
                            <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                            Réinitialiser
                        </Button>
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
                            <SearchableSelect
                                options={regions.map(r => ({ value: r.id, label: r.label }))}
                                value={selectedRegion}
                                onChange={(val) => {
                                    setSelectedRegion(val);
                                    setSelectedTypologie('');
                                    setSelectedCentre('');
                                }}
                                placeholder="Toutes les régions"
                                className="h-9 px-3 rounded-md border-slate-300"
                                disabled={viewAll}
                            />
                        </div>

                        {/* Typologie */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                <Tag className="w-3 h-3 inline mr-1" />
                                Typologie
                            </label>
                            <SearchableSelect
                                options={typologies.map(t => ({ value: t.id, label: t.label }))}
                                value={selectedTypologie}
                                onChange={(val) => {
                                    setSelectedTypologie(val);
                                    setSelectedCentre('');
                                }}
                                placeholder="Toutes les typologies"
                                className="h-9 px-3 rounded-md border-slate-300"
                                disabled={viewAll}
                            />
                        </div>

                        {/* Centre */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                <Building className="w-3 h-3 inline mr-1" />
                                Centre
                            </label>
                            <SearchableSelect
                                options={centres.map(c => ({ value: c.id, label: c.label }))}
                                value={selectedCentre}
                                onChange={setSelectedCentre}
                                placeholder="-- Choisir un centre --"
                                emptyMessage="Aucun centre trouvé."
                                className="h-9 px-3 rounded-md border-slate-300"
                                disabled={centres.length === 0 || viewAll}
                            />
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

                {/* Content Section */}
                {(selectedCentre || viewAll) && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200-50 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom duration-700 font-sans">
                            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-20">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-8 bg-[#005EA8] rounded-full shadow-lg shadow-blue-200"></div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none">
                                            {viewAll ? "Référentiel des Postes" : `Effectifs : ${selectedCentreObj?.label}`}
                                        </h2>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto relative max-h-[70vh] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                <table className="w-full border-separate border-spacing-0">
                                    <thead className="sticky top-0 z-30">
                                        <tr className="bg-slate-50/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
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
                                                <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-700 uppercase">Statutaires</th>
                                                <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-700 uppercase">Effectif APS</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={viewAll ? 3 : 5} className="px-3 py-10 text-center text-slate-400 text-xs font-medium italic">Chargement des données...</td></tr>
                                    ) : filteredPostes.length === 0 ? (
                                        <tr>
                                            <td colSpan={viewAll ? 3 : 5} className="px-3 py-16 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                                                        <Search className="w-6 h-6" />
                                                    </div>
                                                    <p className="text-sm font-semibold text-slate-500">
                                                        {postes.length > 0 ? "Aucun profil ne correspond à votre recherche" : "Aucun poste configuré pour ce périmètre"}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto">
                                                        Vérifiez l'orthographe ou essayez d'élargir vos filtres de sélection.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPostes.map((poste, idx) => (
                                            <tr 
                                                key={viewAll ? poste.id : poste.centre_poste_id} 
                                                className="group hover:bg-slate-50/50 transition-all duration-300 border-b border-slate-50 last:border-0"
                                            >
                                                {viewAll ? (
                                                    // VUE GLOBALE (Reference)
                                                    <>
                                                        <td className="px-3 py-2 text-xs font-semibold text-slate-900">
                                                            {poste.label}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${poste.type_poste === 'MOD'
                                                                ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                                                : 'bg-purple-50 text-purple-600 border border-purple-100'
                                                                }`}>
                                                                {poste.type_poste}
                                                            </span>
                                                        </td>
                                                    </>
                                                ) : (
                                                    // VUE CENTRE (Assignments)
                                                    <>
                                                        <td className="px-3 py-2 text-xs font-medium text-slate-900">
                                                            {poste.poste_label}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${poste.type_poste === 'MOD'
                                                                ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                                                : 'bg-purple-50 text-purple-600 border border-purple-100'
                                                                }`}>
                                                                {poste.type_poste}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {editingCpId === poste.centre_poste_id && editingField === 'effectif' ? (
                                                                <div className="flex items-center justify-center gap-1.5 animate-in zoom-in-95 duration-200">
                                                                    <input
                                                                        type="number"
                                                                        value={tempEffectif}
                                                                        onChange={(e) => setTempEffectif(e.target.value)}
                                                                        className="w-16 px-2 py-1 text-xs font-bold border-2 border-slate-300 rounded-lg text-center focus:ring-0 shadow-sm outline-none bg-white"
                                                                        autoFocus
                                                                    />
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <button onClick={() => handleSavePosteEffectif(poste.centre_poste_id)} className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-md transition-all shadow-sm">
                                                                            <Save className="w-3 h-3" />
                                                                        </button>
                                                                        <button onClick={() => { setEditingCpId(null); setEditingField(null); }} className="p-1 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-md transition-all shadow-sm">
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div 
                                                                    className="group flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-110"
                                                                    onClick={() => {
                                                                        setEditingCpId(poste.centre_poste_id);
                                                                        setEditingField('effectif');
                                                                        setTempEffectif(poste.effectif_actuel || 0);
                                                                    }}
                                                                >
                                                                    <span className="text-xs font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md min-w-[24px] text-center border border-slate-100 group-hover:bg-slate-700 group-hover:text-white transition-colors tracking-tight">
                                                                        {poste.effectif_actuel}
                                                                    </span>
                                                                    <div className="h-0.5 w-0 bg-slate-400 group-hover:w-full transition-all duration-300 mt-0.5 rounded-full"></div>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {editingCpId === poste.centre_poste_id && editingField === 'aps' ? (
                                                                <div className="flex items-center justify-center gap-1.5 animate-in zoom-in-95 duration-200">
                                                                    <input
                                                                        type="number"
                                                                        value={tempAps}
                                                                        onChange={(e) => setTempAps(e.target.value)}
                                                                        className="w-16 px-2 py-1 text-xs font-bold border-2 border-blue-400 rounded-lg text-center focus:ring-0 shadow-sm outline-none bg-white"
                                                                        autoFocus
                                                                    />
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <button onClick={() => handleSavePosteAps(poste.centre_poste_id)} className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-md transition-all shadow-sm group">
                                                                            <Save className="w-3 h-3" />
                                                                        </button>
                                                                        <button onClick={() => { setEditingCpId(null); setEditingField(null); }} className="p-1 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-md transition-all shadow-sm">
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div 
                                                                    className="group flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-110"
                                                                    onClick={() => {
                                                                        setEditingCpId(poste.centre_poste_id);
                                                                        setEditingField('aps');
                                                                        setTempAps(poste.effectif_aps || 0);
                                                                    }}
                                                                >
                                                                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md min-w-[24px] text-center border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors tracking-tight">
                                                                        {poste.effectif_aps || 0}
                                                                    </span>
                                                                    <div className="h-0.5 w-0 bg-blue-400 group-hover:w-full transition-all duration-300 mt-0.5 rounded-full"></div>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                    {!viewAll && postes.length > 0 && (
                                        <tr className="bg-slate-50/95 backdrop-blur-md border-t border-slate-200 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                                            <td colSpan={2} className="px-8 py-2 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Récapitulatif Global</span>
                                                    <span className="text-[10px] font-bold text-slate-500 italic">Valeurs cumulées pour ce centre</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Statutaires</span>
                                                    <div className="px-3 py-1 bg-slate-100 rounded-lg border border-slate-200">
                                                        <span className="text-sm font-black text-slate-900 tracking-tight">
                                                            {postes.reduce((acc, p) => acc + (Number(p.effectif_actuel) || 0), 0)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-center bg-blue-50/50">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter mb-1">Total APS</span>
                                                    <div className="px-3 py-1 bg-blue-100/50 rounded-lg border border-blue-200">
                                                        <span className="text-sm font-black text-blue-600 tracking-tight">
                                                            {postes.reduce((acc, p) => acc + (Number(p.effectif_aps) || 0), 0)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}


                <EffectifUpdateDialog
                    open={showEffectifDialog}
                    onOpenChange={setShowEffectifDialog}
                    onSuccess={() => {
                        if (selectedCentre) loadPostes();
                        else loadAllCentres();
                    }}
                    filters={{
                        region_id: selectedRegion,
                        typologie_id: selectedTypologie,
                        centre_id: selectedCentre
                    }}
                />

                <ConfirmDialog
                    open={showConfirmClear}
                    onOpenChange={setShowConfirmClear}
                    onConfirm={handleClearEffectifs}
                    title="Réinitialisation des effectifs"
                    message={`Êtes-vous sûr de vouloir supprimer TOUS les effectifs pour ${selectedCentre ? "ce centre" : selectedRegion || selectedTypologie ? "le périmètre sélectionné" : "tous les centres"} ? Cette action est irréversible et supprimera également les tâches associées.`}
                    confirmText="Oui, Réinitialiser"
                    variant="destructive"
                />
            </div>
        </div>
    );
}
