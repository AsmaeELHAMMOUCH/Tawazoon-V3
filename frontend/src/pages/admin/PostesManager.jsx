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
import { updateCentreAps, clearEffectifs } from '@/services/api';
import ApsUpdateDialog from '@/components/common/ApsUpdateDialog';
import EffectifUpdateDialog from '@/components/common/EffectifUpdateDialog';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Button } from '@/components/button';

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
    const [showApsDialog, setShowApsDialog] = useState(false);
    const [showEffectifDialog, setShowEffectifDialog] = useState(false);
    const [showConfirmClear, setShowConfirmClear] = useState(false);
    const [editingAps, setEditingAps] = useState(false);
    const [apsValue, setApsValue] = useState(0);

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
            const centre = centres.find(c => String(c.id) === String(selectedCentre));
            if (centre) setApsValue(centre.aps || 0);
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

    const handleSaveAps = async () => {
        try {
            await updateCentreAps(selectedCentre, apsValue);
            toast.success("APS mis à jour avec succès");
            setEditingAps(false);
            // Rafraîchir les données locales
            await loadAllCentres();
            await loadPostes();
        } catch (err) {
            toast.error("Erreur lors de la mise à jour de l'APS");
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
                {/* Header */}
                <div className="mb-4 flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <UserRound className="w-5 h-5 text-blue-600" />
                            Consultation des Postes par Centre
                        </h1>
                        <p className="text-xs text-slate-600 mt-1">
                            Consultez les effectifs actuels pour chaque poste d'un centre
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => setShowApsDialog(true)}
                            className="bg-white text-[#005EA8] border-[#005EA8] hover:bg-blue-50 text-xs font-semibold h-9"
                            variant="outline"
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Mise à jour APS
                        </Button>
                        <Button
                            onClick={() => setShowEffectifDialog(true)}
                            className="bg-white text-emerald-600 border-emerald-600 hover:bg-emerald-50 text-xs font-semibold h-9"
                            variant="outline"
                        >
                            <Users className="w-4 h-4 mr-2" />
                            Mise à jour Effectifs
                        </Button>
                        <Button
                            onClick={() => setShowConfirmClear(true)}
                            className="bg-white text-red-600 border-red-600 hover:bg-red-50 text-xs font-semibold h-9"
                            variant="outline"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Vider
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

                {/* Liste des postes */}
                {(selectedCentre || viewAll) && (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-900">
                                {viewAll ? "Référentiel des Postes (Table Postes)" : `Postes du centre : ${selectedCentreObj?.label}`}
                            </h2>
                            {!viewAll && selectedCentreObj && (
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-lg">
                                        <span className="text-[10px] font-bold text-blue-700 uppercase">Total APS</span>
                                        {editingAps ? (
                                            <div className="flex items-center gap-1">
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
                                            <div className="group flex items-center gap-2 cursor-pointer" onClick={() => setEditingAps(true)} title="Cliquez pour modifier l'APS">
                                                <span className="text-sm font-black text-blue-900">{apsValue}</span>
                                                <Pencil className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
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
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={viewAll ? 2 : 3} className="px-3 py-4 text-center text-slate-500 text-xs">Chargement...</td></tr>
                                    ) : filteredPostes.length === 0 ? (
                                        <tr><td colSpan={viewAll ? 2 : 3} className="px-3 py-4 text-center text-slate-500 text-xs">
                                            {postes.length > 0 ? "Aucun poste ne correspond à votre recherche" : "Aucun poste trouvé"}
                                        </td></tr>
                                    ) : (
                                        filteredPostes.map((poste, idx) => (
                                            <tr key={viewAll ? poste.id : poste.centre_poste_id} className="hover:bg-slate-50 transition-colors">
                                                {viewAll ? (
                                                    // VUE GLOBALE (Reference)
                                                    <>
                                                        <td className="px-3 py-2 text-xs font-semibold text-slate-900">
                                                            {poste.label}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${poste.type_poste === 'MOD'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : 'bg-purple-100 text-purple-700'
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
                                                        <td className="px-3 py-2">
                                                            <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${poste.type_poste === 'MOD'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : 'bg-purple-100 text-purple-700'
                                                                }`}>
                                                                {poste.type_poste}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className="text-xs font-semibold text-slate-900">{poste.effectif_actuel}</span>
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
                                                TOTAL EFFECTIF ACTUEL
                                            </td>
                                            <td className="px-3 py-2 text-center text-slate-900 text-xs">
                                                {postes.reduce((acc, p) => acc + (Number(p.effectif_actuel) || 0), 0)}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <ApsUpdateDialog
                    open={showApsDialog}
                    onOpenChange={setShowApsDialog}
                    onSuccess={() => {
                        loadAllCentres();
                        if (selectedCentre) loadPostes();
                    }}
                    filters={{
                        region_id: selectedRegion,
                        typologie_id: selectedTypologie
                    }}
                />

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
