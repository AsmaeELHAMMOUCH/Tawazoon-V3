"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    Settings,
    MapPin,
    Building,
    Tag,
    Save,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ChevronRight,
    ShieldCheck,
    FileDown,
    FileUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "../../lib/api";
import { toast } from "react-hot-toast";

export default function CentresTypologieManager() {
    const fileInputRef = useRef(null);
    const [regions, setRegions] = useState([]);
    const [centres, setCentres] = useState([]);
    const [typologies, setTypologies] = useState([]);
    const [categorisations, setCategorisations] = useState([]);

    const [selectedRegion, setSelectedRegion] = useState("");
    const [selectedCentre, setSelectedCentre] = useState("");
    const [currentTypologyLabel, setCurrentTypologyLabel] = useState("");
    const [currentCategLabel, setCurrentCategLabel] = useState("");
    const [newTypologyId, setNewTypologyId] = useState("");
    const [newCategId, setNewCategId] = useState("");

    const [loading, setLoading] = useState({
        regions: false,
        centres: false,
        typologies: false,
        saving: false,
        exporting: false,
        importing: false,
    });

    const [message, setMessage] = useState({ text: "", type: "" });

    // Initial Load: Regions and Typologies (Categories)
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading((prev) => ({ ...prev, regions: true, typologies: true }));
            try {
                const [regionsData, typsData, categsData] = await Promise.all([
                    api.regions(),
                    api.categories(),
                    api.categorisations(),
                ]);
                setRegions(regionsData || []);
                setTypologies(typsData || []);
                setCategorisations(categsData || []);
            } catch (err) {
                console.error("Erreur chargement données initiales:", err);
                toast.error("Erreur lors du chargement des données de référence.");
            } finally {
                setLoading((prev) => ({
                    ...prev,
                    regions: false,
                    typologies: false,
                }));
            }
        };
        loadInitialData();
    }, []);

    // Load Centres when Region changes
    useEffect(() => {
        if (!selectedRegion) {
            setCentres([]);
            return;
        }

        const loadCentres = async () => {
            setLoading((prev) => ({ ...prev, centres: true }));
            try {
                const data = await api.centres(selectedRegion);
                setCentres(data || []);
                setSelectedCentre(""); // Reset center selection
            } catch (err) {
                console.error("Erreur chargement centres:", err);
                toast.error("Erreur lors du chargement des centres.");
            } finally {
                setLoading((prev) => ({ ...prev, centres: false }));
            }
        };
        loadCentres();
    }, [selectedRegion]);

    // Update Current Typology when selectedCentre changes
    useEffect(() => {
        if (!selectedCentre) {
            setCurrentTypologyLabel("");
            setNewTypologyId("");
            return;
        }

        const centre = centres.find((c) => String(c.id) === String(selectedCentre));
        if (centre) {
            const typology =
                typologies.find(
                    (t) => String(t.id) === String(centre.categorie_id)
                ) || null;
            const categ =
                categorisations.find(
                    (ct) => String(ct.id) === String(centre.id_categorisation)
                ) || null;

            setCurrentTypologyLabel(typology ? typology.label : "Aucune");
            setNewTypologyId(centre.categorie_id ? String(centre.categorie_id) : "");

            setCurrentCategLabel(categ ? categ.label : "Non définie");
            setNewCategId(centre.id_categorisation ? String(centre.id_categorisation) : "");
        }
    }, [selectedCentre, centres, typologies, categorisations]);

    const handleSave = async () => {
        if (!selectedCentre) return;

        setLoading((prev) => ({ ...prev, saving: true }));
        const tId = toast.loading("Enregistrement des modifications...");

        try {
            const promises = [];

            // Typology Update
            if (newTypologyId && String(newTypologyId) !== String(selectedCentreData?.categorie_id)) {
                promises.push(api.updateCentreTypology(selectedCentre, newTypologyId));
            }

            // Categorisation Update
            if (newCategId && String(newCategId) !== String(selectedCentreData?.id_categorisation)) {
                promises.push(api.updateCentreCategorisation(selectedCentre, newCategId));
            }

            if (promises.length === 0) {
                toast.dismiss(tId);
                return;
            }

            await Promise.all(promises);
            toast.success("Mise à jour effectuée avec succès !", { id: tId });

            // Refresh centre list locally
            setCentres(prev => prev.map(c =>
                String(c.id) === String(selectedCentre)
                    ? {
                        ...c,
                        categorie_id: newTypologyId ? Number(newTypologyId) : c.categorie_id,
                        id_categorisation: newCategId ? Number(newCategId) : c.id_categorisation
                    }
                    : c
            ));

        } catch (err) {
            console.error("Erreur lors de la sauvegarde:", err);
            toast.error("Une erreur est survenue lors de la mise à jour.", { id: tId });
        } finally {
            setLoading((prev) => ({ ...prev, saving: false }));
        }
    };

    const handleExportExcel = async () => {
        setLoading(prev => ({ ...prev, exporting: true }));
        const tId = toast.loading("Génération du fichier Excel...");
        try {
            await api.exportCentresTypologies(selectedRegion || null);
            toast.success("Export terminé !", { id: tId });
        } catch (err) {
            console.error("Export Failed:", err);
            toast.error("Erreur lors de l'exportation.", { id: tId });
        } finally {
            setLoading(prev => ({ ...prev, exporting: false }));
        }
    };

    const handleImportExcel = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(prev => ({ ...prev, importing: true }));
        const tId = toast.loading("Importation des typologies...");
        try {
            const result = await api.importCentresTypologies(file);
            toast.success(`${result.updated} centres mis à jour avec succès !`, { id: tId });

            if (result.errors?.length > 0) {
                toast.error(`${result.errors.length} erreurs lors de l'import.`);
            }

            // Refresh everything
            if (selectedRegion) {
                const updatedCentres = await api.centres(selectedRegion);
                setCentres(updatedCentres || []);
            }
        } catch (err) {
            console.error("Import Failed:", err);
            toast.error("Erreur lors de l'importation.", { id: tId });
        } finally {
            setLoading(prev => ({ ...prev, importing: false }));
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const selectedCentreData = useMemo(() => {
        return centres.find((c) => String(c.id) === String(selectedCentre));
    }, [selectedCentre, centres]);

    return (
        <div className="min-h-screen bg-slate-50/50 p-4">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100">
                            <Settings className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">
                                Gestion des Typologies
                            </h1>
                            <p className="text-slate-500 text-[11px]">
                                Modification groupée ou individuelle des classifications métiers
                            </p>
                        </div>
                    </div>

                    {/* Excel Actions */}
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".xlsx, .xls"
                            onChange={handleImportExcel}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading.importing}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                        >
                            <FileUp className="w-3.5 h-3.5 text-indigo-500" />
                            {loading.importing ? "Importation..." : "Importer Excel"}
                        </button>
                        <button
                            onClick={handleExportExcel}
                            disabled={loading.exporting}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 transition-all shadow-sm disabled:opacity-50"
                        >
                            <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                            {loading.exporting ? "Exportation..." : selectedRegion ? "Export Région" : "Export Tous Centres"}
                        </button>
                    </div>
                </div>

                {/* Filters Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Region Select */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <MapPin className="w-3 h-3" />
                                Région
                            </label>
                            <select
                                value={selectedRegion}
                                onChange={(e) => setSelectedRegion(e.target.value)}
                                disabled={loading.regions}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                            >
                                <option value="">Toutes les régions (Optionnel)</option>
                                {regions.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Centre Select */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Building className="w-3 h-3" />
                                Centre individuel
                            </label>
                            <select
                                value={selectedCentre}
                                onChange={(e) => setSelectedCentre(e.target.value)}
                                disabled={!selectedRegion || loading.centres}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                            >
                                <option value="">
                                    {loading.centres
                                        ? "Chargement..."
                                        : !selectedRegion
                                            ? "Sélectionnez d'abord une région"
                                            : "Sélectionner un centre spécifique"}
                                </option>
                                {centres.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Update Card */}
                {selectedCentre && (
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-indigo-50 px-5 py-3 border-b border-indigo-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-indigo-600" />
                                <h2 className="font-bold text-indigo-900 text-xs">
                                    Configuration de la Typologie
                                </h2>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Current State */}
                                <div className="lg:col-span-4 space-y-4">
                                    <div>
                                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                                            État Actuel
                                        </h3>
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 relative group overflow-hidden">
                                            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:scale-110 transition-transform">
                                                <ShieldCheck className="w-12 h-12 text-slate-900" />
                                            </div>
                                            <div className="relative z-10">
                                                <div className="text-[10px] text-slate-400 mb-0.5 uppercase font-bold">Typologie</div>
                                                <div className="text-sm font-black text-slate-900 leading-tight mb-3">
                                                    {currentTypologyLabel || "Non définie"}
                                                </div>

                                                <div className="text-[10px] text-slate-400 mb-0.5 uppercase font-bold">Classe</div>
                                                <div className="text-sm font-black text-slate-900 leading-tight">
                                                    {currentCategLabel || "Non définie"}
                                                </div>

                                                <div className="text-[9px] text-slate-400 mt-4 flex items-center gap-1">
                                                    <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                                                    Valeurs enregistrées
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Update State */}
                                <div className="lg:col-span-8 space-y-4">
                                    <div>
                                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                                            Nouvelle Typologie
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {typologies.map((typ) => (
                                                <button
                                                    key={typ.id}
                                                    onClick={() => setNewTypologyId(String(typ.id))}
                                                    className={cn(
                                                        "flex items-center justify-between p-2.5 rounded-lg border transition-all text-left",
                                                        String(newTypologyId) === String(typ.id)
                                                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-[1.02]"
                                                            : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <Tag className={cn("w-3.5 h-3.5 flex-shrink-0", String(newTypologyId) === String(typ.id) ? "text-indigo-200" : "text-slate-400")} />
                                                        <span className="font-bold text-[11px] truncate">{typ.label}</span>
                                                    </div>
                                                    {String(newTypologyId) === String(typ.id) && (
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-white animate-in zoom-in duration-200 flex-shrink-0" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                                            Nouvelle Classe (Catégorisation)
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                            {categorisations.map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setNewCategId(String(cat.id))}
                                                    className={cn(
                                                        "flex items-center justify-between p-2.5 rounded-lg border transition-all text-left",
                                                        String(newCategId) === String(cat.id)
                                                            ? "bg-emerald-600 border-emerald-600 text-white shadow-md scale-[1.02]"
                                                            : "bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <ShieldCheck className={cn("w-3.5 h-3.5 flex-shrink-0", String(newCategId) === String(cat.id) ? "text-emerald-200" : "text-slate-400")} />
                                                        <span className="font-bold text-[11px] truncate">{cat.label}</span>
                                                    </div>
                                                    {String(newCategId) === String(cat.id) && (
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-white animate-in zoom-in duration-200 flex-shrink-0" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action */}
                            <div className="mt-8 flex flex-col items-center">
                                <button
                                    onClick={handleSave}
                                    disabled={loading.saving || (
                                        String(newTypologyId) === String(selectedCentreData?.categorie_id) &&
                                        String(newCategId) === String(selectedCentreData?.id_categorisation)
                                    )}
                                    className={cn(
                                        "group relative min-w-[200px] px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                                        loading.saving || (
                                            String(newTypologyId) === String(selectedCentreData?.categorie_id) &&
                                            String(newCategId) === String(selectedCentreData?.id_categorisation)
                                        )
                                            ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                                            : "bg-[#005EA8] text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-95"
                                    )}
                                >
                                    {loading.saving ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Mise à jour...
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            <Save className="w-3.5 h-3.5" />
                                            Enregistrer
                                        </div>
                                    )}
                                </button>
                                {String(newTypologyId) === String(selectedCentreData?.categorie_id) &&
                                    String(newCategId) === String(selectedCentreData?.id_categorisation) && selectedCentre && (
                                        <p className="mt-2 text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                            Aucune modification à enregistrer
                                        </p>
                                    )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!selectedCentre && !loading.centres && (
                    <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center text-center opacity-70">
                        <div className="p-3 bg-slate-100 rounded-xl mb-3">
                            <Building className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-base font-bold text-slate-400 mb-1">Mode de modification groupée ou individuelle</h3>
                        <p className="text-slate-400 text-xs max-w-sm">
                            Utilisez les boutons <b>Excel</b> en haut pour une modification massive (tous les centres ou par région),
                            ou sélectionnez une région et un centre pour une modification unique.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
