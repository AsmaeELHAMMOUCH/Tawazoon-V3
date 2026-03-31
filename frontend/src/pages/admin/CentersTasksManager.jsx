"use client";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import {
    Table,
    Plus,
    Trash2,
    Edit2,
    Save,
    X,
    Search,
    Filter,
    Check,
    AlertCircle,
    MapPin,
    Building,
    Tag,
    Loader2,
    Upload
} from "lucide-react";
import FlexNavbar from "@/components/FluxNavbar";
import { useSimulationParams } from "@/hooks/usePersistedState";
import TaskImportDialog from '@/components/common/TaskImportDialog';
import NewTaskImportDialog from '@/components/common/NewTaskImportDialog';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

export default function CentersTasksManager() {
    // --- Etats de sélection ---
    const [region, setRegion] = useState("");
    const [selectedTypology, setSelectedTypology] = useState("");
    const [centre, setCentre] = useState("");
    const [poste, setPoste] = useState("");

    // --- Listes pour les sélecteurs ---
    const [regions, setRegions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [centres, setCentres] = useState([]);
    const [postes, setPostes] = useState([]);

    // --- Données Tâches (CRUD) ---
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [taskNameFilter, setTaskNameFilter] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const showSuccess = (msg) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(""), 3000);
    };

    // Mode Edition / Création
    const [editingId, setEditingId] = useState(null); // ID de la tâche en cours d'édition
    const [editForm, setEditForm] = useState({});
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isNewImportOpen, setIsNewImportOpen] = useState(false);

    // --- Chargement initial ---
    useEffect(() => {
        // Charger Régions et Catégories
        Promise.all([api.regions(), api.categories()])
            .then(([r, c]) => {
                setRegions(r);
                setCategories(c);
            })
            .catch((err) => console.error("Erreur chargement init:", err));
    }, []);

    // --- Chargement Centres (filtrés par Région et Typologie) ---
    useEffect(() => {
        if (!region) {
            setCentres([]);
            setCentre("");
            return;
        }
        // L'API centres prend (regionId, categorieId)
        api.centres(region, selectedTypology)
            .then((data) => setCentres(data))
            .catch((err) => console.error("Erreur chargement centres:", err));
    }, [region, selectedTypology]);

    // --- Chargement Postes (filtrés par Centre) ---
    useEffect(() => {
        if (!centre) {
            setPostes([]);
            setPoste("");
            return;
        }
        api.postes(centre)
            .then((data) => setPostes(data))
            .catch((err) => console.error("Erreur chargement postes:", err));
    }, [centre]);

    // --- Chargement Tâches (filtrées par Centre et Poste) ---
    useEffect(() => {
        if (!centre) {
            setTasks([]);
            return;
        }
        setLoading(true);
        // On passe centreId et posteId (si sélectionné)
        // api.taches gère { centreId, posteId }
        api.taches({ centreId: centre, posteId: poste || null })
            .then((data) => {
                setTasks(data);
            })
            .catch((err) => console.error("Erreur chargement tâches:", err))
            .finally(() => setLoading(false));
    }, [centre, poste]);

    // --- CRUD Handlers ---

    const handleEdit = (task) => {
        setEditingId(task.id);

        // Extract Responsibles from displayResps to pre-fill form
        const cpId1 = task.displayResps?.[0]?.cp_id || task.centre_poste_id;
        const cpId2 = task.displayResps?.[1]?.cp_id || "";

        setEditForm({
            ...task,
            centre_poste_id: cpId1,
            centre_poste_id_2: cpId2,
            groupIds: task.groupIds || [task.id]
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        setSaving(true);
        try {
            const sharedPayload = {
                nom_tache: editForm.task || editForm.nom_tache,
                famille_uo: editForm.famille || editForm.famille_uo,
                produit: editForm.produit,
                phase: editForm.phase,
                unite_mesure: editForm.unit || editForm.unite_mesure,
                moyenne_min: editForm.moyenne_min,
                moy_sec: editForm.moy_sec,
                base_calcul: editForm.base_calcul,
                // centre_poste_id will be set individually
            };

            const groupIds = editForm.groupIds || [editingId];
            const promises = [];

            // 1. Update First Task (Responsable 1)
            // Always exists (editingId)
            const id1 = groupIds[0];
            promises.push(api.updateTache(id1, { ...sharedPayload, centre_poste_id: editForm.centre_poste_id }));

            // 2. Handle Second Task (Responsable 2)
            // Case A: Exists and is kept/changed
            if (groupIds.length > 1 && editForm.centre_poste_id_2) {
                const id2 = groupIds[1];
                promises.push(api.updateTache(id2, { ...sharedPayload, centre_poste_id: editForm.centre_poste_id_2 }));
            }
            // Case B: Did not exist, but added
            else if (groupIds.length === 1 && editForm.centre_poste_id_2) {
                promises.push(api.createTache({ ...sharedPayload, centre_poste_id: editForm.centre_poste_id_2 }));
            }
            // Case C: Existed but removed (set to empty)
            else if (groupIds.length > 1 && !editForm.centre_poste_id_2) {
                const id2 = groupIds[1];
                promises.push(api.deleteTache(id2));
            }

            await Promise.all(promises);

            // Refetch to ensure sync
            const refreshed = await api.taches({ centreId: centre, posteId: poste || null });
            setTasks(refreshed);

            setEditingId(null);
            showSuccess("Tâche(s) modifiée(s) avec succès");
        } catch (error) {
            setError("Erreur lors de la modification : " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette tâche ?")) return;
        setSaving(true);
        try {
            await api.deleteTache(id);
            setTasks(tasks.filter((t) => t.id !== id));
            showSuccess("Tâche supprimée");
        } catch (error) {
            setError("Erreur lors de la suppression : " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAll = async () => {
        if (!centre) return;
        if (!window.confirm("ATTENTION : Vous êtes sur le point de supprimer TOUTES les tâches de ce centre.\nCette action est irréversible.\nConfirmer ?")) return;

        setSaving(true);
        try {
            const res = await api.deleteTachesByCentre(centre);
            setTasks([]);
            showSuccess(`Suppression terminée. ${res.count} tâches supprimées.`);
        } catch (error) {
            setError("Erreur lors de la suppression massive : " + error.message);
        } finally {
            setSaving(false);
        }
    };


    // --- Filtrage Frontend ---
    const [familleFilter, setFamilleFilter] = useState("");
    const [resp1Filter, setResp1Filter] = useState(""); // 🆕 Filtre Responsable 1
    const [resp2Filter, setResp2Filter] = useState(""); // 🆕 Filtre Responsable 2

    const uniqueFamilies = useMemo(() => {
        const families = tasks.map(t => t.famille || t.famille_uo).filter(Boolean);
        return [...new Set(families)].sort();
    }, [tasks]);

    // --- Visual Grouping Logic (Merge Identical Tasks) ---
    const groupedTasks = useMemo(() => {
        if (!tasks || tasks.length === 0) return [];

        // Define key generator
        const getKey = (t) => `${(t.task || t.nom_tache || "").toLowerCase().trim()}|${(t.famille || t.famille_uo || "").toLowerCase()}|${(t.produit || "").toLowerCase()}|${(t.phase || "").toLowerCase()}`;

        const groups = {};
        const groupOrder = [];

        tasks.forEach(t => {
            const k = getKey(t);
            if (!groups[k]) {
                groups[k] = [];
                groupOrder.push(k);
            }
            groups[k].push(t);
        });

        // Flatten to display items using the preserved order
        return groupOrder.map(k => {
            const group = groups[k];
            const main = group[0];
            // If group has > 1 item, we treat it as a shared task
            // We collect responsibles
            // We sort by ID to be deterministic
            group.sort((a, b) => a.id - b.id);

            const resps = group.map(g => ({
                id: g.id,
                label: g.poste_label || g.nom_poste || "N/A",
                cp_id: g.centre_poste_id
            }));

            return {
                ...main, // Inherit usage properties from the first one
                isGroup: group.length > 1,
                groupIds: group.map(g => g.id), // Store all IDs for deletion/edition
                displayResps: resps
            };
        });
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        let res = groupedTasks;

        // Filtre par Famille
        if (familleFilter) {
            res = res.filter(t => (t.famille || t.famille_uo) === familleFilter);
        }

        // Filtre par Nom
        if (taskNameFilter) {
            const lower = taskNameFilter.toLowerCase();
            res = res.filter(
                (t) => (t.task || t.nom_tache || "").toLowerCase().includes(lower)
            );
        }

        // 🆕 Filtre par Responsable 1
        if (resp1Filter) {
            const lower = resp1Filter.toLowerCase();
            res = res.filter(t => {
                const r1 = t.displayResps?.[0]?.label || "";
                return r1.toLowerCase().includes(lower);
            });
        }

        // 🆕 Filtre par Responsable 2
        if (resp2Filter) {
            const lower = resp2Filter.toLowerCase();
            res = res.filter(t => {
                const r2 = t.displayResps?.[1]?.label || "";
                return r2.toLowerCase().includes(lower);
            });
        }

        // Note: If a specific POSTE filter is active, the API only returns that poste's tasks.
        // So 'groupedTasks' will likely effectively show single rows. 
        // This logic is purely visual for the "All Postes" view.

        return res;
    }, [groupedTasks, taskNameFilter, familleFilter, resp1Filter, resp2Filter]);

    // --- Composants UI ---

    const InputField = ({ label, value, onChange, type = "text", placeholder }) => (
        <div className="flex flex-col gap-1.5 group w-full">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider group-focus-within:text-blue-600 transition-colors flex items-center gap-1">
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm placeholder:text-slate-400"
            />
        </div>
    );


    return (
        <div className="min-h-screen bg-slate-50/50 p-4 space-y-4 font-sans text-slate-600">
            <div className="flex items-end justify-between pb-2 border-b border-slate-200/60 s">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                        Gestion des Tâches
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        Ajouter, modifier ou supprimer les tâches par centre et poste.
                    </p>
                </div>
            </div>

            {/* Alerts - Styled */}
            <div className="space-y-1">
                {error && (
                    <div className="bg-red-50/50 backdrop-blur-sm border border-red-200 text-red-700 px-3 py-2 rounded-lg flex items-center gap-2 text-xs shadow-sm animate-in slide-in-from-top-2 duration-300">
                        <div className="bg-red-100 p-1 rounded-full"><AlertCircle size={14} className="text-red-600" /></div>
                        <span className="font-medium">{error}</span>
                        <button onClick={() => setError("")} className="ml-auto hover:bg-red-100/80 p-1 rounded transition-colors">
                            <X size={12} />
                        </button>
                    </div>
                )}
                {success && (
                    <div className="bg-emerald-50/50 backdrop-blur-sm border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg flex items-center gap-2 text-xs shadow-sm animate-in slide-in-from-top-2 duration-300">
                        <div className="bg-emerald-100 p-1 rounded-full"><Check size={14} className="text-emerald-600" /></div>
                        <span className="font-medium">{success}</span>
                        <button onClick={() => setSuccess("")} className="ml-auto hover:bg-emerald-100/80 p-1 rounded transition-colors">
                            <X size={12} />
                        </button>
                    </div>
                )}
            </div>

            {/* Barre de Filtres Principale */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-wrap gap-4 items-end relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-600 to-cyan-400 opacity-90" />

                {/* Région */}
                <div className="w-56 space-y-1 group">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 group-focus-within:text-blue-600 transition-colors">
                        <MapPin size={10} className="opacity-70" /> Région
                    </label>
                    <SearchableSelect
                        options={regions.map(r => ({ value: r.id, label: r.label }))}
                        value={region}
                        onChange={setRegion}
                        placeholder="-- Choisir --"
                        className="h-8 px-3 rounded-lg border-slate-200"
                    />
                </div>

                {/* Typologie */}
                <div className="w-56 space-y-1 group">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 group-focus-within:text-blue-600 transition-colors">
                        <Tag size={10} className="opacity-70" /> Typologie
                    </label>
                    <SearchableSelect
                        options={categories.map(c => ({ value: c.id, label: c.label }))}
                        value={selectedTypology}
                        onChange={setSelectedTypology}
                        placeholder="-- Toutes --"
                        className="h-8 px-3 rounded-lg border-slate-200"
                        disabled={!region}
                    />
                </div>

                {/* Centre */}
                <div className="w-64 space-y-1 group">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 group-focus-within:text-blue-600 transition-colors">
                        <Building size={10} className="opacity-70" /> Centre
                    </label>
                    <SearchableSelect
                        options={centres.map(c => ({ value: c.id, label: c.label }))}
                        value={centre}
                        onChange={setCentre}
                        placeholder="-- Choisir un centre --"
                        emptyMessage="Aucun centre trouvé."
                        className="h-8 px-3 rounded-lg border-slate-200"
                        disabled={!region}
                    />
                </div>

                {/* ... Hidden fields kept hidden ... */}
                <div className="hidden">
                    <select value={poste} onChange={(e) => setPoste(e.target.value)} disabled={!centre}>
                        <option value="">-- Tous les postes --</option>
                        {postes.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                    <select value={familleFilter} onChange={(e) => setFamilleFilter(e.target.value)} disabled={!centre || tasks.length === 0}>
                        <option value="">-- Toutes --</option>
                        {uniqueFamilies.map((f, i) => <option key={i} value={f}>{f}</option>)}
                    </select>
                </div>
            </div>

            {/* Contenu Principal */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header Tableau */}
                <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3 w-1/3">
                        {/* Barre de recherche globale retirée car on filtre par colonne */}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {centre && (
                            <button
                                onClick={handleDeleteAll}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition cursor-pointer"
                                title="Supprimer toutes les tâches"
                            >
                                <Trash2 size={14} /> Tout supprimer
                            </button>
                        )}
                        {centre && (
                            <button
                                onClick={() => setIsImportOpen(true)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-green-200 text-green-600 rounded-lg text-xs font-medium hover:bg-green-50 transition cursor-pointer"
                                title="Mettre à jour les tâches (Import Excel)"
                            >
                                <Upload size={14} /> Mise à jour
                            </button>
                        )}
                    </div>
                </div>


                {/* Tableau */}
                <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 text-[10px] uppercase tracking-wider">
                            <tr>
                                <th className="px-2 py-2 w-16 text-center" style={{ display: 'none' }}>Ordre</th>
                                <th className="px-2 py-2 w-12 text-center" style={{ display: 'none' }}>Seq</th>
                                <th className="px-2 py-2 w-20 text-center">Etat</th>
                                <th className="px-2 py-2 w-32">Produit</th>
                                <th className="px-2 py-2 w-24">Phase</th>
                                <th className="px-2 py-2 w-32">Famille</th>
                                <th className="px-2 py-2 min-w-[200px]">
                                    <div className="flex flex-col gap-0.5">
                                        <span>Tâche</span>
                                        <div className="relative">
                                            <Search className="absolute left-1.5 top-1 text-slate-400" size={9} />
                                            <input
                                                type="text"
                                                placeholder="Filtrer..."
                                                className="w-full pl-5 pr-1 py-0.5 text-[9px] border border-slate-200 rounded focus:outline-none focus:border-blue-400 font-normal"
                                                value={taskNameFilter}
                                                onChange={(e) => setTaskNameFilter(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                </th>
                                <th className="px-2 py-2 w-20 text-center">Unité</th>
                                <th className="px-2 py-2 w-16 text-center">Base</th>
                                <th className="px-2 py-2 w-32">
                                    <div className="flex flex-col gap-0.5">
                                        <span>Responsable 1</span>
                                        <div className="relative">
                                            <Search className="absolute left-1.5 top-1 text-slate-400" size={9} />
                                            <input
                                                type="text"
                                                placeholder="Filtrer..."
                                                className="w-full pl-5 pr-1 py-0.5 text-[9px] border border-slate-200 rounded focus:outline-none focus:border-blue-400 font-normal"
                                                value={resp1Filter}
                                                onChange={(e) => setResp1Filter(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                </th>
                                <th className="px-2 py-2 w-32">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-slate-400">Responsable 2</span>
                                        <div className="relative">
                                            <Search className="absolute left-1.5 top-1 text-slate-400" size={9} />
                                            <input
                                                type="text"
                                                placeholder="Filtrer..."
                                                className="w-full pl-5 pr-1 py-0.5 text-[9px] border border-slate-200 rounded focus:outline-none focus:border-blue-400 font-normal"
                                                value={resp2Filter}
                                                onChange={(e) => setResp2Filter(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                </th>
                                <th className="px-2 py-2 w-16 text-right">Min</th>
                                <th className="px-2 py-2 w-16 text-right">Sec</th>
                                <th className="px-2 py-2 w-16 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="13" className="px-3 py-6 text-center text-slate-500">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="animate-spin" size={16} /> Chargement...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredTasks.length === 0 ? (
                                <tr>
                                    <td colSpan="13" className="px-3 py-6 text-center text-slate-500 italic">
                                        Aucune tâche trouvée pour cette sélection.
                                    </td>
                                </tr>
                            ) : (
                                filteredTasks.map((task, idx) => (
                                    <tr key={task.id} className="hover:bg-slate-50 group">
                                        {/* Mode Lecture / Edition */}
                                        {editingId === task.id ? (
                                            <>
                                                <td className="px-2 py-1 text-center" style={{ display: 'none' }}>
                                                    <input className="w-12 border rounded px-1 py-0.5 text-center text-xs" type="number" value={editForm.ordre || ""} onChange={e => setEditForm({ ...editForm, ordre: e.target.value })} />
                                                </td>
                                                <td className="px-2 py-1 text-center text-slate-400" style={{ display: 'none' }}>{idx + 1}</td>
                                                <td className="px-2 py-1 text-center">
                                                    <input className="w-full border rounded px-1 py-0.5 text-center text-xs" value={editForm.etat || "ACTIF"} onChange={e => setEditForm({ ...editForm, etat: e.target.value })} />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <input className="w-full border rounded px-1 py-0.5 text-xs" value={editForm.produit || ""} onChange={e => setEditForm({ ...editForm, produit: e.target.value })} />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <input className="w-full border rounded px-1 py-0.5 text-xs font-bold text-blue-700" value={editForm.phase || ""} onChange={e => setEditForm({ ...editForm, phase: e.target.value })} placeholder="Phase" />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <input className="w-full border rounded px-1 py-0.5 text-xs uppercase" value={editForm.famille || editForm.famille_uo || ""} onChange={e => setEditForm({ ...editForm, famille_uo: e.target.value })} placeholder="Famille" />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <input className="w-full border rounded px-1 py-0.5 text-xs" value={editForm.task || editForm.nom_tache || ""} onChange={e => setEditForm({ ...editForm, task: e.target.value })} />
                                                </td>
                                                <td className="px-2 py-1 text-center">
                                                    <input className="w-full border rounded px-1 py-0.5 text-center text-xs" value={editForm.unit || editForm.unite_mesure || ""} onChange={e => setEditForm({ ...editForm, unit: e.target.value })} />
                                                </td>
                                                <td className="px-2 py-1 text-center">
                                                    <input
                                                        className="w-full border rounded px-1 py-0.5 text-center text-xs"
                                                        type="number"
                                                        value={editForm.base_calcul || 100}
                                                        onChange={e => setEditForm({ ...editForm, base_calcul: Number(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <select
                                                        className="w-full border rounded px-1 py-0.5 text-[10px] bg-white text-xs"
                                                        value={editForm.centre_poste_id || ""}
                                                        onChange={(e) => setEditForm({ ...editForm, centre_poste_id: Number(e.target.value) })}
                                                    >
                                                        {postes.map((p) => (
                                                            <option key={p.id} value={p.centre_poste_id}>{p.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-2 py-1 text-center">
                                                    <select
                                                        className="w-full border rounded px-1 py-0.5 text-[10px] bg-white text-xs border-blue-300"
                                                        value={editForm.centre_poste_id_2 || ""}
                                                        onChange={(e) => setEditForm({ ...editForm, centre_poste_id_2: Number(e.target.value) })}
                                                    >
                                                        <option value="">-- Aucun --</option>
                                                        {postes.map((p) => (
                                                            <option key={p.id} value={p.centre_poste_id}>{p.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-2 py-1 text-right">
                                                    <input
                                                        className="w-16 border rounded px-1 py-0.5 text-right text-xs"
                                                        type="number"
                                                        step="0.0001"
                                                        value={editForm.moyenne_min || 0}
                                                        onChange={e => setEditForm({ ...editForm, moyenne_min: Number(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="px-2 py-1 text-right">
                                                    <input
                                                        className="w-16 border rounded px-1 py-0.5 text-right text-xs"
                                                        type="number"
                                                        step="1"
                                                        value={editForm.moy_sec || 0}
                                                        onChange={e => setEditForm({ ...editForm, moy_sec: Number(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="px-2 py-1 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button onClick={handleSaveEdit} disabled={saving} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={14} /></button>
                                                        <button onClick={handleCancelEdit} className="text-slate-500 hover:bg-slate-100 p-1 rounded"><X size={14} /></button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-2 py-1 text-center text-slate-600 font-mono text-[9px]" style={{ display: 'none' }}>{task.ordre || "-"}</td>
                                                <td className="px-2 py-1 text-center text-slate-400 text-[9px]" style={{ display: 'none' }}>{idx + 1}</td>
                                                <td className="px-2 py-1 text-center">
                                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${task.etat === 'ACTIF' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                                        {task.etat || "ACTIF"}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-1 text-slate-500 text-[10px]">{task.produit}</td>
                                                <td className="px-2 py-1 text-blue-600 font-bold text-[9px] uppercase">{task.phase}</td>
                                                <td className="px-2 py-1 text-slate-600 text-[10px]">{task.famille || task.famille_uo}</td>
                                                <td className="px-2 py-1 font-medium text-slate-700 text-[10px]">{task.task || task.nom_tache}</td>
                                                <td className="px-2 py-1 text-center text-slate-500 text-[9px] uppercase">{task.unit || task.unite_mesure}</td>
                                                <td className="px-2 py-1 text-center text-slate-500 font-mono text-[10px]">{task.base_calcul}</td>
                                                <td className="px-2 py-1 text-slate-600 text-[9px] font-medium leading-tight">
                                                    {task.displayResps?.[0]?.label || "N/A"}
                                                </td>
                                                <td className="px-2 py-1 text-slate-500 text-[9px] leading-tight">
                                                    {task.displayResps?.[1]?.label ? (
                                                        <span className="text-blue-600 font-medium">{task.displayResps[1].label}</span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                                <td className="px-2 py-1 text-right font-mono text-slate-700 font-semibold text-[10px]" title="Moyenne Min (Total)">
                                                    {Number(task.moyenne_min || 0).toFixed(4).replace('.', ',')}
                                                </td>
                                                <td className="px-2 py-1 text-right font-mono text-slate-500 text-[10px]">
                                                    {Number(task.moy_sec || task.min_sec || 0).toFixed(4).replace('.', ',')}
                                                </td>
                                                <td className="px-2 py-1 text-center">
                                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEdit(task)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit2 size={12} /></button>

                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <TaskImportDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
                onSuccess={() => {
                    // Refetch tasks
                    api.taches({ centreId: centre, posteId: poste || null })
                        .then((data) => setTasks(data))
                        .catch((err) => console.error("Erreur second refresh:", err));
                }}
                centreId={centre}
                regionId={region}
            />

            <NewTaskImportDialog
                open={isNewImportOpen}
                onOpenChange={setIsNewImportOpen}
                onSuccess={() => {
                    api.taches({ centreId: centre, posteId: poste || null })
                        .then((data) => setTasks(data))
                        .catch((err) => console.error("Erreur refresh:", err));
                }}
                centreId={centre}
            />
        </div>
    );
}
