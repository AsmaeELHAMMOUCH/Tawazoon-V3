import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { builderService } from '../services/builderService';
import {
    Building2, MapPin, Users, Package, Layers, Sparkles,
    ChevronRight, ArrowLeft, Check, Plus, Trash2, Save, FileSpreadsheet, Search
} from 'lucide-react';

const Steps = ({ current, steps }) => (
    <div className="flex items-center justify-center mb-8">
        {steps.map((step, idx) => (
            <React.Fragment key={idx}>
                <div className={`flex flex-col items-center z-10 ${idx <= current ? 'text-blue-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors
            ${idx < current ? 'bg-blue-600 border-blue-600 text-white' :
                            idx === current ? 'bg-white border-blue-600 text-blue-600' :
                                'bg-white border-slate-300 text-slate-400'}`}>
                        {idx < current ? <Check className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className="text-xs font-medium mt-1 uppercase tracking-wide">{step}</span>
                </div>
                {idx < steps.length - 1 && (
                    <div className={`w-20 h-0.5 -mt-5 transition-colors ${idx < current ? 'bg-blue-600' : 'bg-slate-200'}`} />
                )}
            </React.Fragment>
        ))}
    </div>
);

export default function CentreBuilder() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null); // 🆕 Error state

    // References
    const [regions, setRegions] = useState([]);
    const [refPostes, setRefPostes] = useState([]);
    const [refProduits, setRefProduits] = useState([]);
    const [refFamilles, setRefFamilles] = useState([]);
    const [refCategories, setRefCategories] = useState([]); // 🆕 Typologies
    const [refDirections, setRefDirections] = useState([]); // 🆕 Directions

    // Form State
    const [identity, setIdentity] = useState({ nom: '', region_id: '', direction_id: '', categorie_id: '' });
    const [selectedPostes, setSelectedPostes] = useState([]); // Labels
    const [posteSearch, setPosteSearch] = useState(""); // Hoisted state for StepPostes

    // Load Refs
    useEffect(() => {
        const loadRefs = async () => {
            setLoading(true);
            setError(null);
            try {
                const results = await Promise.allSettled([
                    builderService.getRegions(),
                    builderService.getRefPostes(),
                    builderService.getRefProduits(),
                    builderService.getRefFamilles(),
                    builderService.getRefCategories(),
                    builderService.getRefDirections()
                ]);

                // Regions
                if (results[0].status === 'fulfilled') setRegions(results[0].value || []);
                else console.error("Regions failed:", results[0].reason);

                // Postes
                if (results[1].status === 'fulfilled') setRefPostes(results[1].value || []);
                else console.error("Postes failed:", results[1].reason);

                // Produits
                if (results[2].status === 'fulfilled') setRefProduits(results[2].value || []);
                else console.error("Produits failed:", results[2].reason);

                // Familles
                if (results[3].status === 'fulfilled') setRefFamilles(results[3].value || []);
                else console.error("Familles failed:", results[3].reason);

                // Typologies (Categories)
                if (results[4].status === 'fulfilled') setRefCategories(results[4].value || []);
                else console.error("Categories failed:", results[4].reason);

                // Directions
                if (results[5].status === 'fulfilled') setRefDirections(results[5].value || []);
                else console.error("Directions failed:", results[5].reason);

                // Global error check to show user
                const failures = results.filter(r => r.status === 'rejected');
                if (failures.length > 0) {
                    setError(`Erreur de chargement: ${failures.length} ressources introuvables. Vérifiez la console.`);
                }

            } catch (err) {
                console.error("Critical Ref Load error", err);
                setError("Erreur critique chargement: " + err.message);
            } finally {
                setLoading(false);
            }
        };
        loadRefs();
    }, []);



    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const togglePosteSelection = (label) => {
        setSelectedPostes(prev =>
            prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
        );
    };



    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                nom: identity.nom,
                region_id: parseInt(identity.region_id),
                direction_id: identity.direction_id ? parseInt(identity.direction_id) : null,
                categorie_id: identity.categorie_id ? parseInt(identity.categorie_id) : null,
                postes_labels: selectedPostes,
                tasks_mapping: [] // No tasks anymore
            };

            const res = await builderService.createCentre(payload);



            // Persister le centre créé pour la simulation
            window.localStorage.setItem("sim_centre", JSON.stringify(res.id));
            window.localStorage.setItem("sim_poste", JSON.stringify("__ALL__"));
            window.localStorage.removeItem("sim_is_test");

            // Redirect to Simulation (Vue Intervenant)
            navigate(`/app/simulation?flux=poste`);
        } catch (err) {
            alert("Erreur lors de la création: " + err.message);
        } finally {
            setLoading(false);
        }
    };





    const handleSimulationTest = async () => {
        setLoading(true);
        setError(null);
        try {
            if (!identity.categorie_id) return;

            const similar = await builderService.findSimilarCentre(identity.categorie_id);

            // Persist as if it was the selected center
            window.localStorage.setItem("sim_centre", JSON.stringify(similar.id));
            window.localStorage.setItem("sim_poste", JSON.stringify("__ALL__"));
            window.localStorage.setItem("sim_is_test", "true");

            // Persist User Choices for Display Override
            window.localStorage.setItem("sim_test_region_id", identity.region_id);
            window.localStorage.setItem("sim_test_cat_id", identity.categorie_id);
            window.localStorage.setItem("sim_test_name", identity.nom || "CENTRE TEST");

            console.log("DEBUG: saving test params", identity);
            // console.log("DEBUG: refCategories", refCategories); // Avoid spamming console
            const selectedCat = refCategories.find(c => String(c.value) === String(identity.categorie_id));
            if (selectedCat) {
                console.log("DEBUG: found cat label", selectedCat.label);
                window.localStorage.setItem("sim_test_cat_label", selectedCat.label);
            } else {
                console.log("DEBUG: category NOT found for id", identity.categorie_id);
            }

            // Navigate
            navigate(`/app/simulation?flux=poste`);
        } catch (err) {
            console.error(err);
            setError("Impossible de trouver un centre similaire pour cette typologie (Test).");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <button onClick={() => navigate('/app/simulation')} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Retour Simulation
            </button>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm font-medium">
                    ⚠️ {error}
                </div>
            )}

            {/* <Steps ... /> Removed as requested */}

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Single Step View */}
                <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-500" /> Identité du Centre
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nom du Centre</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                value={identity.nom}
                                onChange={e => setIdentity({ ...identity, nom: e.target.value })}
                                placeholder="Ex: Centre de Tri Principal"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Région</label>
                            <select
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                value={identity.region_id}
                                onChange={e => setIdentity({ ...identity, region_id: e.target.value })}
                                disabled={regions.length === 0}
                            >
                                <option value="">Sélectionner...</option>
                                {regions.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                            </select>
                        </div>
                        {/* Direction Removed */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Typologie</label>
                            <select
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                value={identity.categorie_id}
                                onChange={e => setIdentity({ ...identity, categorie_id: e.target.value })}
                                disabled={refCategories.length === 0}
                            >
                                <option value="">Sélectionner...</option>
                                {refCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={handleSimulationTest}
                            disabled={!identity.categorie_id || loading}
                            className="w-full bg-gradient-to-r from-[#0077b6] to-[#48cae4] text-white px-4 py-3 rounded text-sm font-bold hover:shadow-[0_4px_14px_rgba(0,118,182,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                            title="Lancer la simulation"
                        >
                            <Sparkles className="w-5 h-5" /> Lancer la Simulation Test
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
