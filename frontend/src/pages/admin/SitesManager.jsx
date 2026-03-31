import React, { useState, useEffect } from 'react';
import {
    MapPin,
    Building,
    Search,
    FileSpreadsheet,
    Plus,
    Pencil,
    Trash2,
    CheckCircle2,
    AlertCircle,
    X,
    Save,
    ArrowRight
} from 'lucide-react';
import { api, fetchSitesByCentre, createSite, updateSite, deleteSite } from '@/services/api';
import SiteUpdateDialog from '@/components/common/SiteUpdateDialog';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import toast from 'react-hot-toast';
import { Button } from '@/components/button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

export default function SitesManager() {
    const [regions, setRegions] = useState([]);
    const [centres, setCentres] = useState([]);
    const [allCentres, setAllCentres] = useState([]);

    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedCentre, setSelectedCentre] = useState('');

    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [siteToDelete, setSiteToDelete] = useState(null);

    // États pour l'ajout/édition
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ label: '', code: '' });

    useEffect(() => {
        loadRegions();
        loadAllCentres();
    }, []);

    useEffect(() => {
        if (allCentres.length > 0) {
            filterCentres();
        }
    }, [selectedRegion, allCentres]);

    useEffect(() => {
        if (selectedCentre) {
            loadSites();
        } else {
            setSites([]);
        }
    }, [selectedCentre]);

    const loadRegions = async () => {
        try {
            const data = await api.get('/regions').then(res => res.data);
            setRegions(data || []);
        } catch (err) {
            console.error('Erreur régions:', err);
        }
    };

    const loadAllCentres = async () => {
        try {
            const data = await api.get('/centres/').then(res => res.data);
            setAllCentres(data || []);
        } catch (err) {
            console.error('Erreur centres:', err);
        }
    };

    const filterCentres = () => {
        let filtered = [...allCentres];
        if (selectedRegion) {
            filtered = filtered.filter(c => String(c.region_id) === String(selectedRegion));
        } else {
            // Désélectionner le centre si aucune région n'est choisie
            setSelectedCentre('');
        }
        setCentres(filtered);
        if (selectedCentre && !filtered.find(c => String(c.id) === String(selectedCentre))) {
            setSelectedCentre('');
        }
    };

    const loadSites = async () => {
        if (!selectedCentre) return;
        setLoading(true);
        try {
            const data = await fetchSitesByCentre(selectedCentre);
            setSites(data || []);
        } catch (err) {
            toast.error("Erreur lors du chargement des sites");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.label) {
            toast.error("Veuillez saisir un nom pour le site");
            return;
        }
        try {
            await createSite({ ...formData, centre_id: Number(selectedCentre) });
            toast.success("Site créé avec succès");
            setIsAdding(false);
            setFormData({ label: '', code: '' });
            loadSites();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Erreur lors de la création");
        }
    };

    const handleUpdate = async (id) => {
        try {
            await updateSite(id, formData);
            toast.success("Site mis à jour");
            setEditingId(null);
            setFormData({ label: '', code: '' });
            loadSites();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Erreur lors de la mise à jour");
        }
    };

    const handleDelete = async () => {
        try {
            await deleteSite(siteToDelete);
            toast.success("Site supprimé");
            setShowDeleteConfirm(false);
            loadSites();
        } catch (err) {
            toast.error("Erreur lors de la suppression");
        }
    };

    const filteredSites = sites.filter(s => 
        s.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 animate-in fade-in duration-700">
            <div className="max-w-6xl mx-auto space-y-2">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-2">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg shadow-blue-200/50">
                                <MapPin className="w-4 h-4 text-white" />
                            </div>
                            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                                Sites Rattachés
                            </h1>
                        </div>
                    </div>
                    
                    <div className="flex gap-3 pl-14 md:pl-0">
                        <Button 
                            onClick={() => setShowImportDialog(true)}
                            variant="outline"
                            className="bg-white border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all duration-300 shadow-sm"
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Import / Export
                        </Button>
                        {selectedCentre && (
                            <Button 
                                onClick={() => {
                                    setIsAdding(true);
                                    setFormData({ label: '', code: '' });
                                }}
                                disabled={isAdding || editingId}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-200/50 transition-all duration-300 active:scale-95"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Nouveau Site
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filter Section - Glassmorphism style */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000"></div>
                    <div className="relative bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-white shadow-xl shadow-slate-200/50 flex flex-wrap gap-6 items-end">
                        <div className="flex-1 min-w-[240px] space-y-2">
                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                                <Building className="w-3.5 h-3.5" /> Région Régionale
                            </label>
                            <SearchableSelect
                                options={regions.map(r => ({ value: r.id, label: r.label }))}
                                value={selectedRegion}
                                onChange={setSelectedRegion}
                                placeholder="Toutes les régions"
                            />
                        </div>
                        
                        <div className="flex-[1.5] min-w-[320px] space-y-2">
                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                                <ArrowRight className="w-3.5 h-3.5" /> Centre Principal
                            </label>
                            <SearchableSelect
                                options={centres.map(c => ({ value: c.id, label: c.label }))}
                                value={selectedCentre}
                                onChange={setSelectedCentre}
                                placeholder="-- Sélectionner un centre --"
                                emptyMessage="Aucun centre trouvé."
                            />
                        </div>
                    </div>
                </div>

                {/* Main Content Areas */}
                {selectedCentre ? (
                    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                        {/* Table Header / Search */}
                        <div className="px-6 py-5 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/30">
                            <div className="relative w-full md:w-80 group">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <input 
                                    type="text"
                                    placeholder="Rechercher par nom ou code..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none"
                                />
                            </div>
                            
                            <div className="text-xs font-semibold text-slate-400">
                                {filteredSites.length} site{filteredSites.length > 1 ? 's' : ''} trouvé{filteredSites.length > 1 ? 's' : ''}
                            </div>
                        </div>

                        {/* Table Content */}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left">Code Site</th>
                                        <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left">Désignation</th>
                                        <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {/* Inline Addition Row */}
                                    {isAdding && (
                                        <tr className="bg-blue-50/20 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-2 text-blue-500">
                                                    <CheckCircle2 className="w-4 h-4 animate-pulse" />
                                                    <span className="text-[10px] font-bold uppercase tracking-tight italic opacity-70">Attribution auto</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                <input 
                                                    type="text" 
                                                    placeholder="Entrez le nom du nouveau site..."
                                                    value={formData.label}
                                                    onChange={(e) => setFormData({...formData, label: e.target.value, code: ''})}
                                                    autoFocus
                                                    className="w-full h-10 px-4 bg-white border-2 border-blue-200 rounded-xl text-sm font-medium focus:ring-0 focus:border-blue-500 transition-all outline-none shadow-sm"
                                                />
                                            </td>
                                            <td className="px-8 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button 
                                                        onClick={handleCreate} 
                                                        className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-transform active:scale-95"
                                                        size="sm"
                                                    >
                                                        Créer
                                                    </Button>
                                                    <Button 
                                                        onClick={() => setIsAdding(false)} 
                                                        variant="ghost"
                                                        className="h-9 w-9 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {/* Site Rows */}
                                    {filteredSites.map((site, index) => (
                                        <tr 
                                            key={site.id} 
                                            className="group hover:bg-blue-50/30 transition-all duration-300"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <td className="px-8 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                                                        <MapPin className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                                                    </div>
                                                    <span className="font-mono text-sm font-bold text-slate-600 bg-slate-100 group-hover:bg-white group-hover:shadow-sm px-2.5 py-1 rounded-md border border-slate-200">
                                                        {site.code}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4">
                                                {editingId === site.id ? (
                                                    <input 
                                                        type="text" 
                                                        value={formData.label}
                                                        onChange={(e) => setFormData({...formData, label: e.target.value})}
                                                        autoFocus
                                                        className="w-full h-10 px-4 bg-white border-2 border-blue-200 rounded-xl text-sm font-medium focus:ring-0 focus:border-blue-500 transition-all outline-none"
                                                    />
                                                ) : (
                                                    <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-900 transition-colors">
                                                        {site.label}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-8 py-4 text-right">
                                                <div className="flex justify-end items-center gap-1">
                                                    {editingId === site.id ? (
                                                        <div className="flex gap-1 animate-in zoom-in-50 duration-200">
                                                            <button 
                                                                onClick={() => handleUpdate(site.id)} 
                                                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                                                                title="Valider"
                                                            >
                                                                <Save className="w-5 h-5" />
                                                            </button>
                                                            <button 
                                                                onClick={() => setEditingId(null)} 
                                                                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                                                                title="Annuler"
                                                            >
                                                                <X className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingId(site.id);
                                                                    setFormData({ label: site.label, code: site.code });
                                                                }}
                                                                className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    setSiteToDelete(site.id);
                                                                    setShowDeleteConfirm(true);
                                                                }}
                                                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Empty Table State */}
                                    {filteredSites.length === 0 && !isAdding && (
                                        <tr>
                                            <td colSpan="3" className="px-8 py-20 text-center">
                                                <div className="max-w-xs mx-auto space-y-3">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto border border-slate-100 shadow-inner">
                                                        <Search className="w-6 h-6 text-slate-300" />
                                                    </div>
                                                    <h4 className="text-sm font-bold text-slate-700">Aucun site trouvé</h4>
                                                    <p className="text-xs text-slate-400 leading-relaxed">
                                                        Essayez d'ajuster votre recherche ou créez un nouveau site pour ce centre.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Initial Empty State */
                    <div className="bg-white rounded-[2.5rem] p-16 md:p-32 border-2 border-dashed border-slate-200/60 text-center space-y-6 animate-in fade-in zoom-in-95 duration-1000">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-blue-400 blur-3xl opacity-10 animate-pulse"></div>
                            <div className="relative w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[2rem] flex items-center justify-center border border-white shadow-2xl shadow-blue-100">
                                <Building className="w-10 h-10 text-blue-400" />
                            </div>
                        </div>
                        <div className="space-y-2 max-w-sm mx-auto">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Sélectionner un périmètre</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Choisissez d'abord une région puis le centre de rattachement pour accéder à la gestion des sites.
                            </p>
                        </div>
                    </div>
                )}

                {/* Modals */}
                <SiteUpdateDialog 
                    open={showImportDialog}
                    onOpenChange={setShowImportDialog}
                    onSuccess={loadSites}
                    filters={{
                        region_id: selectedRegion,
                        centre_id: selectedCentre
                    }}
                />

                <ConfirmDialog 
                    open={showDeleteConfirm}
                    onOpenChange={setShowDeleteConfirm}
                    onConfirm={handleDelete}
                    title="Suppression irrémédiable"
                    message="Êtes-vous sûr de vouloir supprimer ce site rattaché ? Cette action supprimera définitivement toutes les associations liées."
                    variant="destructive"
                />
            </div>
        </div>
    );
}
