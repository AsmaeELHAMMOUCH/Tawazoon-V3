"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
    Plus,
    Save,
    X,
    AlertCircle,
    CheckCircle2,
    MapPin,
    Building,
    Tag,
    ChevronRight,
    Layers
} from "lucide-react";

export default function AjoutTache() {
    // États pour les filtres de sélection
    const [regions, setRegions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [centres, setCentres] = useState([]);
    const [postes, setPostes] = useState([]);

    const [selectedRegion, setSelectedRegion] = useState("");
    const [selectedTypologie, setSelectedTypologie] = useState("");
    const [selectedCentre, setSelectedCentre] = useState("");

    // États pour le formulaire de tâche
    const [taskForm, setTaskForm] = useState({
        etat: "A",
        produit: "",
        famille_uo: "",
        phase: "",
        base_calcul: 100,
        unite_mesure: "",
        nom_tache: "",
        moyenne_min: 0,
        moy_sec: 0,
        centre_poste_id: "",
        centre_poste_id_2: ""
    });

    // États UI
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Chargement des données de référence
    useEffect(() => {
        loadRegions();
        loadTypologies();
    }, []);

    useEffect(() => {
        if (selectedRegion) {
            loadCentres();
        } else {
            setCentres([]);
            setSelectedCentre("");
        }
    }, [selectedRegion, selectedTypologie]);

    useEffect(() => {
        if (selectedCentre) {
            loadPostes();
        } else {
            setPostes([]);
        }
    }, [selectedCentre]);

    const loadRegions = async () => {
        try {
            const data = await api.regions();
            setRegions(data);
        } catch (err) {
            console.error("Erreur chargement régions:", err);
        }
    };

    const loadTypologies = async () => {
        try {
            const data = await api.categories();
            setCategories(data);
        } catch (err) {
            console.error("Erreur chargement typologies:", err);
        }
    };

    const loadCentres = async () => {
        try {
            const data = await api.centres(selectedRegion, selectedTypologie || null);
            setCentres(data);
        } catch (err) {
            console.error("Erreur chargement centres:", err);
        }
    };

    const loadPostes = async () => {
        try {
            const data = await api.postes(selectedCentre);
            setPostes(data);
        } catch (err) {
            console.error("Erreur chargement postes:", err);
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!selectedCentre) {
            setError("Veuillez sélectionner un centre.");
            return;
        }
        if (!taskForm.centre_poste_id) {
            setError("Veuillez sélectionner au moins le Responsable 1.");
            return;
        }
        if (!taskForm.nom_tache) {
            setError("Veuillez saisir le nom de la tâche.");
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            // Créer la première tâche
            const payload1 = { ...taskForm };
            delete payload1.centre_poste_id_2;

            await api.createTache(payload1);

            // Créer la deuxième tâche si un responsable 2 est sélectionné
            if (taskForm.centre_poste_id_2) {
                const payload2 = {
                    ...taskForm,
                    centre_poste_id: taskForm.centre_poste_id_2
                };
                delete payload2.centre_poste_id_2;
                await api.createTache(payload2);
            }

            setSuccess(
                taskForm.centre_poste_id_2
                    ? "Tâche créée avec succès pour les 2 responsables !"
                    : "Tâche créée avec succès !"
            );

            // Réinitialiser le formulaire de tâche
            setTaskForm({
                etat: "A",
                produit: "",
                famille_uo: "",
                phase: "",
                base_calcul: 100,
                unite_mesure: "",
                nom_tache: "",
                moyenne_min: 0,
                moy_sec: 0,
                centre_poste_id: "",
                centre_poste_id_2: ""
            });

            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            setError("Erreur lors de la création : " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setTaskForm({
            etat: "A",
            produit: "",
            famille_uo: "",
            phase: "",
            base_calcul: 100,
            unite_mesure: "",
            nom_tache: "",
            moyenne_min: 0,
            moy_sec: 0,
            centre_poste_id: "",
            centre_poste_id_2: ""
        });
        setError("");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Layers className="w-6 h-6 text-blue-600" />
                        Ajout de Tâche
                    </h1>
                    <p className="text-sm text-slate-600 mt-1">
                        Créez une nouvelle tâche en suivant les étapes ci-dessous
                    </p>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
                        <CheckCircle2 className="w-5 h-5" />
                        {success}
                    </div>
                )}

                {/* Étape 1: Sélection du Centre */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-4">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-700 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                        Sélection du Centre
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Région */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                Région
                            </label>
                            <select
                                value={selectedRegion}
                                onChange={(e) => {
                                    setSelectedRegion(e.target.value);
                                    setSelectedTypologie("");
                                    setSelectedCentre("");
                                }}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">-- Choisir une région --</option>
                                {regions.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Typologie */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                                <Tag className="w-4 h-4" />
                                Typologie
                            </label>
                            <select
                                value={selectedTypologie}
                                onChange={(e) => {
                                    setSelectedTypologie(e.target.value);
                                    setSelectedCentre("");
                                }}
                                disabled={!selectedRegion}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            >
                                <option value="">-- Toutes les typologies --</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Centre */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                                <Building className="w-4 h-4" />
                                Centre
                            </label>
                            <select
                                value={selectedCentre}
                                onChange={(e) => setSelectedCentre(e.target.value)}
                                disabled={!selectedRegion}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            >
                                <option value="">-- Choisir un centre --</option>
                                {centres.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Étape 2: Informations de la Tâche */}
                {selectedCentre && (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-4">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-700 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                            Informations de la Tâche
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* État */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    État
                                </label>
                                <select
                                    value={taskForm.etat}
                                    onChange={(e) => setTaskForm({ ...taskForm, etat: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="A">A</option>
                                    <option value="N/A">N/A</option>
                                </select>
                            </div>

                            {/* Produit */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Produit
                                </label>
                                <select
                                    value={taskForm.produit}
                                    onChange={(e) => setTaskForm({ ...taskForm, produit: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">-- Choisir un produit --</option>
                                    <option value="CO Arrivé">CO Arrivé</option>
                                    <option value="CO MED">CO MED</option>
                                    <option value="CR Arrivé">CR Arrivé</option>
                                    <option value="CR MED">CR MED</option>
                                    <option value="AMANA Dépôt">AMANA Dépôt</option>
                                    <option value="AMANA Reçu">AMANA Reçu</option>
                                    <option value="E barkia Arrivé">E barkia Arrivé</option>
                                    <option value="LRH Arrivé">LRH Arrivé</option>
                                </select>
                            </div>

                            {/* Famille */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Famille
                                </label>
                                <select
                                    value={taskForm.famille_uo}
                                    onChange={(e) => setTaskForm({ ...taskForm, famille_uo: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">-- Choisir une famille --</option>
                                    <option value="Arrivée Camion Principal">Arrivée Camion Principal</option>
                                    <option value="Guichet Pro">Guichet Pro</option>
                                    <option value="Distribution Locale">Distribution Locale</option>
                                    <option value="Départ Axes">Départ Axes</option>
                                    <option value="Guichet">Guichet</option>
                                    <option value="Arrivée Camions Axes">Arrivée Camions Axes</option>
                                    <option value="Collecte">Collecte</option>
                                    <option value="Départ Camion Principal">Départ Camion Principal</option>
                                    <option value="Reporting">Reporting</option>
                                </select>
                            </div>

                            {/* Phase */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Phase
                                </label>
                                <select
                                    value={taskForm.phase}
                                    onChange={(e) => setTaskForm({ ...taskForm, phase: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">-- Choisir une phase --</option>
                                    <option value="Arrivée">Arrivée</option>
                                    <option value="Tri">Tri</option>
                                    <option value="Distribution">Distribution</option>
                                    <option value="Départ">Départ</option>
                                    <option value="Guichet">Guichet</option>
                                    <option value="Arrière Guichet">Arrière Guichet</option>
                                    <option value="Autre">Autre</option>
                                </select>
                            </div>

                            {/* Base de calcul */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Base de calcul
                                </label>
                                <select
                                    value={taskForm.base_calcul}
                                    onChange={(e) => setTaskForm({ ...taskForm, base_calcul: Number(e.target.value) })}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value={100}>100</option>
                                    <option value={60}>60</option>
                                    <option value={40}>40</option>
                                </select>
                            </div>

                            {/* Unité de mesure */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Unité de mesure
                                </label>
                                <select
                                    value={taskForm.unite_mesure}
                                    onChange={(e) => setTaskForm({ ...taskForm, unite_mesure: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">-- Choisir une unité --</option>
                                    <option value="Sac">Sac</option>
                                    <option value="Courrier">Courrier</option>
                                    <option value="Caisson">Caisson</option>
                                    <option value="Colis">Colis</option>
                                    <option value="Facteur">Facteur</option>
                                    <option value="Part">Part</option>
                                    <option value="Dépeche">Dépeche</option>
                                </select>
                            </div>

                            {/* Nom de la tâche */}
                            <div className="md:col-span-3">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Nom de la tâche <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={taskForm.nom_tache}
                                    onChange={(e) => setTaskForm({ ...taskForm, nom_tache: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Décrivez la tâche..."
                                />
                            </div>

                            {/* Minutes */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Minutes
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={taskForm.moyenne_min}
                                    onChange={(e) => setTaskForm({ ...taskForm, moyenne_min: Number(e.target.value) })}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Secondes */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Secondes
                                </label>
                                <input
                                    type="number"
                                    value={taskForm.moy_sec}
                                    onChange={(e) => setTaskForm({ ...taskForm, moy_sec: Number(e.target.value) })}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Étape 3: Responsables */}
                {selectedCentre && (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-4">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-700 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                            Responsables
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Responsable 1 */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Responsable 1 <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={taskForm.centre_poste_id}
                                    onChange={(e) => setTaskForm({ ...taskForm, centre_poste_id: Number(e.target.value) })}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">-- Choisir un poste --</option>
                                    {postes.map((p) => (
                                        <option key={p.id} value={p.centre_poste_id}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Responsable 2 */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Responsable 2 <span className="text-slate-400">(Optionnel)</span>
                                </label>
                                <select
                                    value={taskForm.centre_poste_id_2}
                                    onChange={(e) => setTaskForm({ ...taskForm, centre_poste_id_2: Number(e.target.value) })}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">-- Aucun --</option>
                                    {postes.map((p) => (
                                        <option key={p.id} value={p.centre_poste_id}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                {selectedCentre && (
                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-colors"
                        >
                            <X className="w-4 h-4" />
                            Réinitialiser
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? "Enregistrement..." : "Créer la tâche"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
