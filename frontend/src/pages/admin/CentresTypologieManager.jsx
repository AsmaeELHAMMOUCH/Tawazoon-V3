"use client";
import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "../../lib/api";

export default function CentresTypologieManager() {
    const [regions, setRegions] = useState([]);
    const [centres, setCentres] = useState([]);
    const [typologies, setTypologies] = useState([]);

    const [selectedRegion, setSelectedRegion] = useState("");
    const [selectedCentre, setSelectedCentre] = useState("");
    const [currentTypologyLabel, setCurrentTypologyLabel] = useState("");
    const [newTypologyId, setNewTypologyId] = useState("");

    const [loading, setLoading] = useState({
        regions: false,
        centres: false,
        typologies: false,
        saving: false,
    });

    const [message, setMessage] = useState({ text: "", type: "" });

    // Initial Load: Regions and Typologies (Categories)
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading((prev) => ({ ...prev, regions: true, typologies: true }));
            try {
                const [regionsData, typsData] = await Promise.all([
                    api.regions(),
                    api.categories(),
                ]);
                setRegions(regionsData);
                setTypologies(typsData);
            } catch (err) {
                console.error("Erreur chargement données initiales:", err);
                setMessage({
                    text: "Erreur lors du chargement des régions ou des typologies.",
                    type: "error",
                });
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
                setCentres(data);
                setSelectedCentre(""); // Reset center selection
            } catch (err) {
                console.error("Erreur chargement centres:", err);
                setMessage({
                    text: "Erreur lors du chargement des centres.",
                    type: "error",
                });
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
            setCurrentTypologyLabel(typology ? typology.label : "Aucune");
            setNewTypologyId(centre.categorie_id ? String(centre.categorie_id) : "");
        }
    }, [selectedCentre, centres, typologies]);

    const handleSave = async () => {
        if (!selectedCentre || !newTypologyId) return;

        setLoading((prev) => ({ ...prev, saving: true }));
        setMessage({ text: "", type: "" });

        try {
            await api.updateCentreTypology(selectedCentre, newTypologyId);
            setMessage({
                text: "La typologie du centre a été mise à jour avec succès !",
                type: "success",
            });

            // Refresh centre list locally to reflect changes in UI
            setCentres(prev => prev.map(c =>
                String(c.id) === String(selectedCentre)
                    ? { ...c, categorie_id: Number(newTypologyId) }
                    : c
            ));

        } catch (err) {
            console.error("Erreur lors de la sauvegarde:", err);
            setMessage({
                text: "Une erreur est survenue lors de la mise à jour.",
                type: "error",
            });
        } finally {
            setLoading((prev) => ({ ...prev, saving: false }));
        }
    };

    const selectedCentreData = useMemo(() => {
        return centres.find((c) => String(c.id) === String(selectedCentre));
    }, [selectedCentre, centres]);

    return (
        <div className="min-h-screen bg-slate-50/50 p-4">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-2.5 mb-6">
                    <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100">
                        <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">
                            Gestion des Typologies
                        </h1>
                        <p className="text-slate-500 text-[11px]">
                            Modifier la classification métier (AM, CCC, etc.) d'un centre
                        </p>
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
                                <option value="">Sélectionner une région</option>
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
                                Centre
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
                                            : "Sélectionner un centre"}
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
                                                <div className="text-base font-black text-slate-900 leading-tight">
                                                    {currentTypologyLabel || "Non définie"}
                                                </div>
                                                <div className="text-[9px] text-slate-400 mt-2 flex items-center gap-1">
                                                    <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                                                    Valeur enregistrée
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
                                </div>
                            </div>

                            {/* Action */}
                            <div className="mt-8 flex flex-col items-center">
                                {message.text && (
                                    <div className={cn(
                                        "mb-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold animate-in slide-in-from-top-2",
                                        message.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
                                    )}>
                                        {message.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                        {message.text}
                                    </div>
                                )}

                                <button
                                    onClick={handleSave}
                                    disabled={!newTypologyId || loading.saving || String(newTypologyId) === String(selectedCentreData?.categorie_id)}
                                    className={cn(
                                        "group relative min-w-[200px] px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                                        !newTypologyId || loading.saving || String(newTypologyId) === String(selectedCentreData?.categorie_id)
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
                                {String(newTypologyId) === String(selectedCentreData?.categorie_id) && selectedCentre && !message.text && (
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
                    <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center text-center opacity-60">
                        <div className="p-3 bg-slate-100 rounded-xl mb-3">
                            <Building className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-base font-bold text-slate-400 mb-1">Aucun centre sélectionné</h3>
                        <p className="text-slate-400 text-xs max-w-xs">
                            Veuillez sélectionner une région puis un centre pour modifier sa typologie.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
