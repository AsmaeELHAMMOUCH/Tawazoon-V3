import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Calculator,
    Check,
    X,
    ArrowLeft,
    Info,
    Layers,
    Truck,
    Store,
    Briefcase,
    MapPin,
    Users,
    CreditCard,
    Save,
    BarChart3,
    Landmark,
    Building2,
    Route,
    Clock,
    UserCheck,
    Sun,
    Settings
} from 'lucide-react';
import { api } from '../../lib/api';

// Définition des paliers et règles
const THRESHOLDS = {
    amana: [
        { limit: 90, score: 0, label: 'Très faible' },
        { limit: 310, score: 25, label: 'Faible' },
        { limit: 910, score: 50, label: 'Moyen' },
        { limit: 2920, score: 75, label: 'Fort' },
        { limit: Infinity, score: 100, label: 'Très fort' }
    ],
    cr: [
        { limit: 6100, score: 0, label: 'Très faible' },
        { limit: 11400, score: 25, label: 'Faible' },
        { limit: 21800, score: 50, label: 'Moyen' },
        { limit: 30800, score: 75, label: 'Fort' },
        { limit: Infinity, score: 100, label: 'Très fort' }
    ],
    co: [
        { limit: 460000, score: 0, label: 'Très faible' },
        { limit: 860000, score: 25, label: 'Faible' },
        { limit: 1520000, score: 50, label: 'Moyen' },
        { limit: 3090000, score: 75, label: 'Fort' },
        { limit: Infinity, score: 100, label: 'Très fort' }
    ],
    ce: [
        { limit: 2200, score: 0, label: 'Très faible' },
        { limit: 11600, score: 25, label: 'Faible' },
        { limit: 27500, score: 50, label: 'Moyen' },
        { limit: 53600, score: 75, label: 'Fort' },
        { limit: Infinity, score: 100, label: 'Très fort' }
    ],
    sites: [
        { limit: 2, score: 0, label: 'Très faible' },
        { limit: 4, score: 25, label: 'Faible' },
        { limit: 6, score: 50, label: 'Moyen' },
        { limit: 8, score: 75, label: 'Fort' },
        { limit: Infinity, score: 100, label: 'Très fort' }
    ],
    tournees: [
        { limit: 3, score: 0, label: 'Très faible' },
        { limit: 6, score: 25, label: 'Faible' },
        { limit: 10, score: 50, label: 'Moyen' },
        { limit: 20, score: 75, label: 'Fort' },
        { limit: Infinity, score: 100, label: 'Très fort' }
    ],
    effectif: [
        { limit: 2, score: 0, label: 'Très faible' },
        { limit: 5, score: 25, label: 'Faible' },
        { limit: 10, score: 50, label: 'Moyen' },
        { limit: 16, score: 75, label: 'Fort' },
        { limit: Infinity, score: 100, label: 'Très fort' }
    ]
};

// Fonction utilitaire pour trouver le score et le label
const getThresholdResult = (value, type) => {
    const rules = THRESHOLDS[type];
    const found = rules.find(r => value <= r.limit);
    return found || rules[rules.length - 1];
};

const getEffectifResult = (value) => {
    const rules = THRESHOLDS.effectif;
    // Special rule: if value < limit then return logic.
    // If value < 2 -> 0.
    // If value < 5 -> 25 (covering 2 to 4.99).
    // ...
    const found = rules.find(r => value < r.limit);
    return found || rules[rules.length - 1];
}


const BLOCKS = [
    {
        id: 'bloc1',
        label: 'Bloc 1 : Complexité Opérationnelle',
        weightTotal: 26,
        color: 'indigo',
        type: 'boolean',
        icon: Settings,
        criteria: [
            { id: 'distribution_finale', label: 'Distribution finale', weight: 12, icon: Layers, description: 'Le centre assure-t-il la distribution finale du courrier ?' },
            { id: 'acheminement', label: 'Acheminement', weight: 6, icon: Truck, description: 'Le centre gère-t-il des missions d\'acheminement ?' },
            { id: 'guichet_actif', label: 'Guichet actif', weight: 6, icon: Store, description: 'Le centre dispose-t-il d\'un guichet ouvert au public ?' },
            { id: 'barid_pro', label: 'Barid Pro', weight: 2, icon: Briefcase, description: 'Service dédié aux professionnels (Barid Pro) actif ?' },
        ]
    },
    {
        id: 'bloc2',
        label: 'Bloc 2 : Charge Opérationnelle',
        weightTotal: 32,
        color: 'emerald',
        type: 'calculated',
        icon: BarChart3,
        description: 'Calcul basé sur les volumes annuels d\'activité'
    },
    {
        id: 'bloc3',
        label: 'Bloc 3 : Rôle Territorial & Réseau',
        weightTotal: 26,
        color: 'amber',
        type: 'mixed',
        icon: MapPin,
        description: 'Statut du centre et gestion du périmètre'
    },
    {
        id: 'bloc4',
        label: 'Bloc 4 : Ressources',
        weightTotal: 16,
        color: 'rose',
        type: 'mixed',
        icon: Users,
        description: 'Effectif et Amplitude horaire'
    }
];

export default function CategorisationCentre() {
    const { centreId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const { simulationData, centreInfo: navCentreInfo, volumes } = location.state || {};
    const [fetchedCentreInfo, setFetchedCentreInfo] = useState(null);

    // On privilégie les données fraîches si disponibles
    const centreInfo = fetchedCentreInfo || navCentreInfo;

    // Fetch centre details if missing OR incomplete (missing class)
    useEffect(() => {
        const isInfoComplete = centreInfo && centreInfo.categorisation_label;

        // On ne relance pas si on a déjà fait un fetch (fetchedCentreInfo exists) 
        // sauf si le fetch a échoué (mais ici fetchedCentreInfo est null si fail/start)
        // Simplification : si on n'a pas fetchedCentreInfo ET que l'info courante est incomplète => on fetch
        if (!fetchedCentreInfo && !isInfoComplete && centreId) {
            const loadCentre = async () => {
                try {
                    const list = await api.centres();
                    const found = list.find(c => String(c.id) === String(centreId));
                    if (found) {
                        console.log("✅ Centre details fetched (fresh):", found);
                        setFetchedCentreInfo(found);
                    }
                } catch (e) {
                    console.error("Erreur chargement infos centre:", e);
                }
            };
            loadCentre();
        }
    }, [centreId, fetchedCentreInfo, navCentreInfo]); // Deps secure specific vars

    // Initialisation des valeurs Boolean inputs
    const [values, setValues] = useState(() => {
        const initialValues = {};
        BLOCKS.filter(b => b.type === 'boolean').forEach(block => {
            block.criteria.forEach(c => {
                initialValues[c.id] = false;
            });
        });
        return initialValues;
    });

    // Inputs Bloc 2 (Volumes) - Pre-filled from Vue Centre navigation state
    const [volumeInputs, setVolumeInputs] = useState({
        cOrd: volumes?.cOrd || 0,
        cReco: volumes?.cReco || 0,
        amana: volumes?.amana || 0,
        eBarkia: volumes?.eBarkia || 0,
        lrh: volumes?.lrh || 0,
        sacs: volumes?.sacs || 0,
        colis: volumes?.colis || 0,
    });

    // Inputs Bloc 3 (Territorial)
    const [territorialInputs, setTerritorialInputs] = useState({
        chef_lieu: 'non',
        sites_rattachés: '1-2', // ✅ Now a dropdown selection (range)
        tournees_rattachées: 0
    });

    // Inputs Bloc 4 (Ressources)
    const [ressourcesInputs, setRessourcesInputs] = useState({
        effectif_global: 0,
        amplitude: 'normal' // normal | etendu | continu
    });

    // ✅ Acheminement Score (from Axes parameters)
    const [acheminementScore, setAcheminementScore] = useState(0);

    const [scores, setScores] = useState({});
    const [totalScore, setTotalScore] = useState(0);

    // --- LOGIC: Distribution Finale (Automated) ---
    const [simResults, setSimResults] = useState(null);
    const [distriFinaleDetails, setDistriFinaleDetails] = useState({ total: 0, active: false });
    const [guichetActifDetails, setGuichetActifDetails] = useState({ total: 0, active: false });
    const [baridProDetails, setBaridProDetails] = useState({ total: 0, active: false });

    // Fetch categorisation data - either from navigation state or from API
    useEffect(() => {
        const fetchData = async () => {
            // 1. Volumes - Priority to location.state, then DB
            if (location.state?.volumes) {
                const vols = location.state.volumes;
                setVolumeInputs({
                    cOrd: vols.cOrd || 0,
                    cReco: vols.cReco || 0,
                    amana: vols.amana || 0,
                    eBarkia: vols.eBarkia || 0,
                    lrh: vols.lrh || 0,
                    sacs: vols.sacs || 0,
                    colis: vols.colis || 0,
                });
            } else if (centreId) {
                try {
                    const v = await api.getCentreVolumes(centreId);
                    setVolumeInputs({
                        cOrd: v.courrier_ordinaire || 0,
                        cReco: v.courrier_recommande || 0,
                        amana: v.amana || 0,
                        eBarkia: v.ebarkia || 0,
                        lrh: v.lrh || 0,
                        sacs: v.sacs || 0,
                        colis: v.colis || 0,
                    });
                } catch (e) {
                    console.error("Failed to fetch reference volumes", e);
                }
            }

            // 2. Simulation Results
            if (location.state?.simulationResults) {
                const simData = location.state.simulationResults;
                console.log("✅ Simulation data received from navigation:", simData);

                setSimResults({
                    postes: simData.postes || [],
                    total_heures: simData.total_heures,
                    fte_calcule: simData.total_etp_calcule,
                    fte_arrondi: simData.total_etp_arrondi
                });

                if (typeof simData.total_etp_arrondi === 'number') {
                    setRessourcesInputs(prev => ({
                        ...prev,
                        effectif_global: simData.total_etp_arrondi
                    }));
                }

                if (typeof simData.acheminement_score === 'number') {
                    setAcheminementScore(simData.acheminement_score);
                }
            } else if (centreId) {
                try {
                    console.log("📥 Fetching latest categorisation simulation for centre:", centreId);
                    const response = await api.getLatestCategSimulation(centreId);

                    if (response.found && response.data) {
                        const categData = response.data;
                        setSimResults({
                            postes: categData.postes || [],
                            total_heures: categData.total_heures,
                            fte_calcule: categData.total_etp_calcule,
                            fte_arrondi: categData.total_etp_arrondi
                        });

                        if (typeof categData.total_etp_arrondi === 'number') {
                            setRessourcesInputs(prev => ({
                                ...prev,
                                effectif_global: categData.total_etp_arrondi
                            }));
                        }
                    } else {
                        setSimResults({ postes: [] });
                    }
                } catch (err) {
                    console.error("❌ Error fetching categorisation data:", err);
                    setSimResults({ postes: [] });
                }
            }
        };

        fetchData();
    }, [centreId, location.state]);

    // Apple Rule: Distribution Finale
    useEffect(() => {
        if (!simResults?.postes) return;

        // "label_poste like Facteur" implies searching for 'facteur' in the label
        // We look for any staffing on 'Facteur' posts
        const facteurPostes = simResults.postes.filter(p =>
            p.poste_label && p.poste_label.toLowerCase().includes('facteur')
        );

        // "somme des effectif arrondi de tous les facteur"
        const sumEffectif = facteurPostes.reduce((acc, p) => acc + (p.etp_arrondi || 0), 0);

        console.log("Distribution Finale Logic:", {
            foundPostes: facteurPostes.length,
            sumEffectif,
            result: sumEffectif > 0
        });

        const hasDistribution = sumEffectif > 0;

        setDistriFinaleDetails({
            total: sumEffectif,
            active: hasDistribution
        });

        setValues(prev => {
            // Only update if changed to avoid loops
            if (prev.distribution_finale === hasDistribution) return prev;
            return {
                ...prev,
                distribution_finale: hasDistribution
            };
        });
    }, [simResults]);

    // ✅ Apple Rule: Guichet Actif (same logic but for Guichetier)
    useEffect(() => {
        if (!simResults?.postes) return;

        // Look for any staffing on 'Guichetier' posts
        const guichetierPostes = simResults.postes.filter(p =>
            p.poste_label && p.poste_label.toLowerCase().includes('guichetier')
        );

        // Sum of etp_arrondi for all guichetier posts
        const sumEffectif = guichetierPostes.reduce((acc, p) => acc + (p.etp_arrondi || 0), 0);

        console.log("Guichet Actif Logic:", {
            foundPostes: guichetierPostes.length,
            sumEffectif,
            result: sumEffectif > 0
        });

        const hasGuichet = sumEffectif > 0;

        setGuichetActifDetails({
            total: sumEffectif,
            active: hasGuichet
        });

        setValues(prev => {
            // Only update if changed to avoid loops
            if (prev.guichet_actif === hasGuichet) return prev;
            return {
                ...prev,
                guichet_actif: hasGuichet
            };
        });
    }, [simResults]);

    // ✅ Apple Rule: Barid Pro (automated based on staffing)
    useEffect(() => {
        if (!simResults?.postes) return;

        // Look for any staffing on 'Barid Pro' posts
        const baridPostes = simResults.postes.filter(p =>
            p.poste_label && p.poste_label.toLowerCase().includes('barid pro')
        );

        // Sum of etp_arrondi
        const sumEffectif = baridPostes.reduce((acc, p) => acc + (p.etp_arrondi || 0), 0);

        console.log("Barid Pro Logic:", {
            foundPostes: baridPostes.length,
            sumEffectif,
            result: sumEffectif > 0
        });

        const hasBarid = sumEffectif > 0;

        setBaridProDetails({
            total: sumEffectif,
            active: hasBarid
        });

        setValues(prev => {
            if (prev.barid_pro === hasBarid) return prev;
            return {
                ...prev,
                barid_pro: hasBarid
            };
        });
    }, [simResults]);

    // Calcul du Bloc 2
    const currentBloc2Results = useMemo(() => {
        const vAmana = Number(volumeInputs.amana) || 0;
        const vCR = Number(volumeInputs.cReco) || 0;
        const vCO = Number(volumeInputs.cOrd) || 0;
        const vCE = Number(volumeInputs.eBarkia) || 0;

        // Use standard <= logic for volumes
        const rAmana = getThresholdResult(vAmana, 'amana');
        const rCR = getThresholdResult(vCR, 'cr');
        const rCO = getThresholdResult(vCO, 'co');
        const rCE = getThresholdResult(vCE, 'ce');

        const sAmana = (rAmana.score / 100) * 12;
        const sCR = (rCR.score / 100) * 8;
        const sCO = (rCO.score / 100) * 8;
        const sCE = (rCE.score / 100) * 4;

        return {
            total: sAmana + sCR + sCO + sCE,
            details: {
                amana: { val: vAmana, palier: rAmana, weighted: sAmana },
                cr: { val: vCR, palier: rCR, weighted: sCR },
                co: { val: vCO, palier: rCO, weighted: sCO },
                ce: { val: vCE, palier: rCE, weighted: sCE }
            }
        };
    }, [volumeInputs]);

    // Calcul du Bloc 3
    const currentBloc3Results = useMemo(() => {
        // 1. Chef-lieu
        let scoreChefLieuBrut = 0;
        if (territorialInputs.chef_lieu === 'province') scoreChefLieuBrut = 50;
        if (territorialInputs.chef_lieu === 'region') scoreChefLieuBrut = 100;
        const sChefLieu = (scoreChefLieuBrut / 100) * 10;

        // 2. Sites (dropdown selection)
        const sitesMapping = {
            '1-2': { score: 0, label: 'Très faible' },
            '3-4': { score: 25, label: 'Faible' },
            '5-6': { score: 50, label: 'Moyen' },
            '7-8': { score: 75, label: 'Fort' },
            '>8': { score: 100, label: 'Très fort' }
        };
        const sitesSelection = territorialInputs.sites_rattachés || '1-2';
        const rSites = sitesMapping[sitesSelection] || sitesMapping['1-2'];
        const sSites = (rSites.score / 100) * 8;

        // 3. Tournées (auto-calculated from facteur effectif)
        const vTournees = distriFinaleDetails?.total || 0; // ✅ Use effectif arrondi facteurs
        const rTournees = getThresholdResult(vTournees, 'tournees');
        const sTournees = (rTournees.score / 100) * 8;

        return {
            total: sChefLieu + sSites + sTournees,
            details: {
                chef_lieu: { val: territorialInputs.chef_lieu, raw: scoreChefLieuBrut, weighted: sChefLieu },
                sites: { val: sitesSelection, palier: rSites, weighted: sSites },
                tournees: { val: vTournees, palier: rTournees, weighted: sTournees }
            }
        };
    }, [territorialInputs, distriFinaleDetails]);

    // Calcul du Bloc 4
    const currentBloc4Results = useMemo(() => {
        // 1. Effectif (strict < check)
        const vEff = Number(ressourcesInputs.effectif_global) || 0;
        const rEff = getEffectifResult(vEff);
        const sEff = (rEff.score / 100) * 11;

        // 2. Amplitude
        let scoreAmpBrut = 0;
        if (ressourcesInputs.amplitude === 'etendu') scoreAmpBrut = 50;
        if (ressourcesInputs.amplitude === 'continu') scoreAmpBrut = 100;
        const sAmp = (scoreAmpBrut / 100) * 5;

        return {
            total: sEff + sAmp,
            details: {
                effectif: { val: vEff, palier: rEff, weighted: sEff },
                amplitude: { val: ressourcesInputs.amplitude, raw: scoreAmpBrut, weighted: sAmp }
            }
        };
    }, [ressourcesInputs]);

    // Calcul global des scores
    useEffect(() => {
        const newScores = {};
        let global = 0;

        // B1 - Special handling for acheminement (auto-calculated)
        let b1Score = 0;
        BLOCKS[0].criteria.forEach(c => {
            if (c.id === 'acheminement') {
                // Use auto-calculated acheminement score
                if (acheminementScore > 0) {
                    b1Score += c.weight;
                }
            } else if (values[c.id]) {
                b1Score += c.weight;
            }
        });
        newScores['bloc1'] = b1Score;
        global += b1Score;

        // B2
        newScores['bloc2'] = currentBloc2Results.total;
        global += currentBloc2Results.total;

        // B3
        newScores['bloc3'] = currentBloc3Results.total;
        global += currentBloc3Results.total;

        // B4
        newScores['bloc4'] = currentBloc4Results.total;
        global += currentBloc4Results.total;

        setScores(newScores);
        setTotalScore(global);
    }, [values, currentBloc2Results, currentBloc3Results, currentBloc4Results, acheminementScore]);


    const handleToggle = (id) => setValues(prev => ({ ...prev, [id]: !prev[id] }));
    const handleVolumeChange = (field, val) => setVolumeInputs(prev => ({ ...prev, [field]: val }));
    const handleTerritorialChange = (field, val) => setTerritorialInputs(prev => ({ ...prev, [field]: val }));
    const handleRessourcesChange = (field, val) => setRessourcesInputs(prev => ({ ...prev, [field]: val }));

    const [catList, setCatList] = useState([]);
    useEffect(() => {
        api.categorisations().then(setCatList).catch(console.error);
    }, []);

    const classeCentre = useMemo(() => {
        // Rules per prompt:
        // A < 25
        // B 26 - 50
        // C 50 - 75
        // D > 75
        if (totalScore > 75) return 'D';
        if (totalScore >= 50) return 'C';
        if (totalScore >= 25) return 'B';
        return 'A'; // < 25
    }, [totalScore]);

    const handleSave = async () => {
        const matchedCat = catList.find(c => c.label === `Classe ${classeCentre}` || c.label === classeCentre);

        let postesToUpdate = [];
        if (simResults?.postes) {
            postesToUpdate = simResults.postes.map(p => ({
                centre_poste_id: p.centre_poste_id,
                etp_arrondi: p.etp_arrondi || 0
            }));
        }

        console.log("Save:", { centreId, scores, totalScore, classeCentre, matchedCat, postesToUpdate });

        if (matchedCat) {
            if (window.confirm(`Confirmez-vous la sauvegarde ?\n\nCatégorie: ${classeCentre}\nScore: ${totalScore.toFixed(1)}\nPostes à mettre à jour: ${postesToUpdate.length}`)) {
                try {
                    // ✅ Pass volumes for persistence
                    await api.updateCentreCategorisation(centreId, matchedCat.id, postesToUpdate, {
                        courrier_ordinaire: Number(volumeInputs.cOrd) || 0,
                        courrier_recommande: Number(volumeInputs.cReco) || 0,
                        amana: Number(volumeInputs.amana) || 0,
                        ebarkia: Number(volumeInputs.eBarkia) || 0,
                        lrh: Number(volumeInputs.lrh) || 0,
                        sacs: Number(volumeInputs.sacs) || 0,
                        colis: Number(volumeInputs.colis) || 0
                    });
                    alert(`Sauvegardé avec succès ! Les effectifs ont été mis à jour.`);
                } catch (e) {
                    console.error("Error saving categorisation:", e);
                    alert("Erreur lors de la sauvegarde de la catégorisation.");
                }
            }
        } else {
            console.warn("Category not found in list:", catList);
            alert(`Attention : La catégorie 'Classe ${classeCentre}' n'est pas reconnue par le système.`);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 font-sans text-slate-900">
            {/* Compact Header */}
            <div className="max-w-7xl mx-auto mb-6">
                <button
                    onClick={() => navigate('/app/simulation/centre', { state: { flux: 'centre' } })}
                    className="group flex items-center text-slate-400 hover:text-indigo-600 transition-all duration-200 mb-3 text-xs font-semibold"
                >
                    <div className="p-1 rounded-full bg-slate-200 group-hover:bg-indigo-100 mr-1.5 transition-colors">
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                    </div>
                    Retour
                </button>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-1">
                            Catégorisation & Complexité
                            {centreInfo && (
                                <span className="bg-white border border-indigo-100 text-indigo-600 text-sm px-3 py-1 rounded-full font-bold shadow-sm flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                    {centreInfo.label}
                                </span>
                            )}
                        </h1>
                        <p className="text-slate-500 font-medium text-sm">
                            Évaluation du centre <span className="font-bold text-slate-700 bg-slate-200 px-1.5 rounded">#{centreId}</span>
                        </p>
                    </div>

                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 grid grid-cols-1 xl:grid-cols-2 xl:grid-rows-2 gap-5">
                    {BLOCKS.map((block) => {
                        const score = scores[block.id] || 0;
                        const isBoolean = block.type === 'boolean';
                        const isCalculated = block.type === 'calculated';
                        const isMixed = block.type === 'mixed';

                        const colorMap = {
                            indigo: { bg: 'from-indigo-600 to-indigo-500', text: 'text-indigo-100', shadow: 'hover:shadow-indigo-100/50' },
                            emerald: { bg: 'from-emerald-600 to-emerald-500', text: 'text-emerald-100', shadow: 'hover:shadow-emerald-100/50' },
                            amber: { bg: 'from-amber-500 to-orange-500', text: 'text-amber-100', shadow: 'hover:shadow-amber-100/50' },
                            rose: { bg: 'from-rose-600 to-rose-500', text: 'text-rose-100', shadow: 'hover:shadow-rose-100/50' },
                            blue: { bg: 'from-blue-600 to-cyan-500', text: 'text-blue-100', shadow: 'hover:shadow-blue-100/50' }
                        };
                        const colors = colorMap[block.color] || colorMap.indigo;

                        return (
                            <div key={block.id} className={`group bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col h-full`}>
                                {/* Clean Blue Header - Matching Reference Style */}
                                <div className="relative overflow-hidden bg-[#0EA5E9] rounded-t-2xl px-4 py-3 text-white flex items-center justify-between h-[90px]">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                            {block.icon && <block.icon className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold leading-tight">
                                                {block.label.split(':')[1]?.trim() || block.label}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-medium text-white/90">
                                                    Poids : {block.weightTotal}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="text-white/80 text-[8px] font-semibold uppercase tracking-wide">Score</div>
                                        <div className="flex items-baseline gap-1 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/30">
                                            <span className="text-3xl font-black">{score.toFixed(1)}</span>
                                            <span className="text-xs font-semibold text-white/80">/ {block.weightTotal}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 flex-1 text-xs space-y-4">
                                    {isBoolean && (
                                        <div className="grid grid-cols-1 gap-2">
                                            {block.criteria.map((c) => {
                                                const isDistri = c.id === 'distribution_finale';
                                                const isAcheminement = c.id === 'acheminement';

                                                // ✅ Special display for Acheminement (auto-calculated)
                                                if (isAcheminement) {
                                                    const isActive = acheminementScore > 0;
                                                    return (
                                                        <div
                                                            key={c.id}
                                                            className={`relative flex items-center justify-between p-3 rounded-xl border select-none transition-all duration-200 cursor-default ring-2 ring-offset-1 ring-slate-100
                                                                ${isActive ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-slate-100 bg-white'}
                                                            `}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-1.5 rounded-md transition-colors ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                                    <c.icon className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`block font-semibold transition-colors ${isActive ? 'text-indigo-900' : 'text-slate-600'}`}>
                                                                            {c.label}
                                                                        </span>
                                                                        <span className="text-[9px] font-bold text-slate-500 bg-slate-200 px-1 rounded uppercase tracking-wider">
                                                                            Auto
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-400 font-normal line-clamp-1">{c.description}</span>
                                                                    <div className="text-[10px] font-mono font-medium text-slate-500 mt-0.5">
                                                                        Axes: <span className="font-bold text-slate-700">
                                                                            {location.state?.simulationResults?.axes_arrivee > 0 || location.state?.simulationResults?.axes_depart > 0 ? 'Oui' : 'Non'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className={`flex items-center justify-center w-8 h-6 rounded text-xs font-bold transition-colors ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-300'}`}>
                                                                {isActive ? `+${c.weight}` : '-'}
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                // Regular checkbox display for other criteria
                                                const isGuichet = c.id === 'guichet_actif';
                                                const isBaridPro = c.id === 'barid_pro';

                                                return (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => !isDistri && !isGuichet && !isBaridPro && handleToggle(c.id)}
                                                        className={`relative flex items-center justify-between p-3 rounded-xl border select-none transition-all duration-200 
                                                            ${values[c.id] ? `border-${block.color}-500 bg-${block.color}-50/50 shadow-sm` : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50'}
                                                            ${(isDistri || isGuichet || isBaridPro) ? 'cursor-default ring-2 ring-offset-1 ring-slate-100' : 'cursor-pointer'}
                                                        `}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-1.5 rounded-md transition-colors ${values[c.id] ? `bg-${block.color}-100 text-${block.color}-600` : 'bg-slate-100 text-slate-400'}`}>
                                                                <c.icon className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`block font-semibold transition-colors ${values[c.id] ? `text-${block.color}-900` : 'text-slate-600'}`}>
                                                                        {c.label}
                                                                    </span>
                                                                    {(isDistri || isGuichet || isBaridPro) && (
                                                                        <span className="text-[9px] font-bold text-slate-500 bg-slate-200 px-1 rounded uppercase tracking-wider">
                                                                            Auto
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] text-slate-400 font-normal line-clamp-1">{c.description}</span>
                                                                {isDistri && typeof distriFinaleDetails?.total === 'number' && (
                                                                    <div className="text-[10px] font-mono font-medium text-slate-500 mt-0.5">
                                                                        Effectif Facteurs: <span className="font-bold text-slate-700">{distriFinaleDetails.total.toFixed(0)}</span>
                                                                    </div>
                                                                )}
                                                                {isGuichet && typeof guichetActifDetails?.total === 'number' && (
                                                                    <div className="text-[10px] font-mono font-medium text-slate-500 mt-0.5">
                                                                        Effectif Guichetiers: <span className="font-bold text-slate-700">{guichetActifDetails.total.toFixed(0)}</span>
                                                                    </div>
                                                                )}
                                                                {isBaridPro && typeof baridProDetails?.total === 'number' && (
                                                                    <div className="text-[10px] font-mono font-medium text-slate-500 mt-0.5">
                                                                        Effectif Barid Pro: <span className="font-bold text-slate-700">{baridProDetails.total.toFixed(0)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className={`flex items-center justify-center w-8 h-6 rounded text-xs font-bold transition-colors ${values[c.id] ? `bg-${block.color}-600 text-white shadow-sm` : 'bg-slate-100 text-slate-300'}`}>
                                                            {values[c.id] ? `+${c.weight}` : '-'}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {isCalculated && block.id === 'bloc2' && (
                                        <div className="space-y-1">
                                            {/* Grid layout for calculated blocks */}
                                            <div className="grid grid-cols-2 gap-1">
                                                {/* Courrier Ordinaire (CO) */}
                                                <div className="bg-white p-2 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="p-1 bg-slate-100 rounded text-slate-600"><Layers className="w-3 h-3" /></div>
                                                            <span className="font-bold text-slate-700 text-xs">CO</span>
                                                        </div>
                                                        <div className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">8%</div>
                                                    </div>
                                                    <input type="number" className="w-full text-right bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-2 py-1 font-mono text-xs font-medium outline-none transition-all mb-1"
                                                        value={volumeInputs.cOrd} onChange={e => handleVolumeChange('cOrd', e.target.value)} />
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[9px] text-slate-400 font-medium">{currentBloc2Results.details.co.palier.label}</span>
                                                        <span className="text-xs font-bold text-emerald-600">{currentBloc2Results.details.co.weighted.toFixed(1)} <span className="text-[9px] font-normal">pts</span></span>
                                                    </div>
                                                </div>

                                                {/* Courrier Recommandé (CR) */}
                                                <div className="bg-white p-2 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="p-1 bg-slate-100 rounded text-slate-600"><Briefcase className="w-3 h-3" /></div>
                                                            <span className="font-bold text-slate-700 text-xs">CR</span>
                                                        </div>
                                                        <div className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">8%</div>
                                                    </div>
                                                    <input type="number" className="w-full text-right bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-2 py-1 font-mono text-xs font-medium outline-none transition-all mb-1"
                                                        value={volumeInputs.cReco} onChange={e => handleVolumeChange('cReco', e.target.value)} />
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[9px] text-slate-400 font-medium">{currentBloc2Results.details.cr.palier.label}</span>
                                                        <span className="text-xs font-bold text-emerald-600">{currentBloc2Results.details.cr.weighted.toFixed(1)} <span className="text-[9px] font-normal">pts</span></span>
                                                    </div>
                                                </div>

                                                {/* AMANA */}
                                                <div className="col-span-2 bg-white p-2 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="p-1 bg-slate-100 rounded text-slate-600"><Truck className="w-3 h-3" /></div>
                                                            <span className="font-bold text-slate-700 text-xs">Amana</span>
                                                        </div>
                                                        <div className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">12%</div>
                                                    </div>
                                                    <input type="number" className="w-full text-right bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-2 py-1 font-mono text-xs font-medium outline-none transition-all mb-1"
                                                        value={volumeInputs.amana} onChange={e => handleVolumeChange('amana', e.target.value)} />
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[9px] text-slate-400 font-medium">{currentBloc2Results.details.amana.palier.label}</span>
                                                        <span className="text-xs font-bold text-emerald-600">{currentBloc2Results.details.amana.weighted.toFixed(1)} <span className="text-[9px] font-normal">pts</span></span>
                                                    </div>
                                                </div>

                                                {/* eBarkia (CE) */}
                                                <div className="bg-white p-2 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="p-1 bg-slate-100 rounded text-slate-600"><BarChart3 className="w-3 h-3" /></div>
                                                            <span className="font-bold text-slate-700 text-xs">eBarkia</span>
                                                        </div>
                                                        <div className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">4%</div>
                                                    </div>
                                                    <input type="number" className="w-full text-right bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-2 py-1 font-mono text-xs font-medium outline-none transition-all mb-1"
                                                        value={volumeInputs.eBarkia} onChange={e => handleVolumeChange('eBarkia', e.target.value)} />
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[9px] text-slate-400 font-medium">{currentBloc2Results.details.ce.palier.label}</span>
                                                        <span className="text-xs font-bold text-emerald-600">{currentBloc2Results.details.ce.weighted.toFixed(1)} <span className="text-[9px] font-normal">pts</span></span>
                                                    </div>
                                                </div>

                                                {/* LRH - Info only (not scored) */}
                                                <div className="bg-white p-2 rounded-xl border border-slate-200">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="p-1 bg-slate-100 rounded text-slate-500"><CreditCard className="w-3 h-3" /></div>
                                                            <span className="font-bold text-slate-600 text-xs">LRH</span>
                                                        </div>
                                                        <span className="text-[9px] text-slate-400 font-semibold">Info</span>
                                                    </div>
                                                    <input type="number" className="w-full text-right bg-white border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-2 py-1 font-mono text-xs font-medium outline-none transition-all"
                                                        value={volumeInputs.lrh} onChange={e => handleVolumeChange('lrh', e.target.value)} />
                                                </div>

                                                {/* Sacs - Info only (not scored) */}
                                                <div className="bg-white p-2 rounded-xl border border-slate-200">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="p-1 bg-slate-100 rounded text-slate-500"><Store className="w-3 h-3" /></div>
                                                            <span className="font-bold text-slate-600 text-xs">Sacs</span>
                                                        </div>
                                                        <span className="text-[9px] text-slate-400 font-semibold">Info</span>
                                                    </div>
                                                    <input type="number" className="w-full text-right bg-white border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-2 py-1 font-mono text-xs font-medium outline-none transition-all"
                                                        value={volumeInputs.sacs} onChange={e => handleVolumeChange('sacs', e.target.value)} />
                                                </div>

                                                {/* Colis - Info only (not scored) */}
                                                <div className="bg-white p-2 rounded-xl border border-slate-200">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="p-1 bg-slate-100 rounded text-slate-500"><Truck className="w-3 h-3" /></div>
                                                            <span className="font-bold text-slate-600 text-xs">Colis</span>
                                                        </div>
                                                        <span className="text-[9px] text-slate-400 font-semibold">Info</span>
                                                    </div>
                                                    <input type="number" className="w-full text-right bg-white border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-2 py-1 font-mono text-xs font-medium outline-none transition-all"
                                                        value={volumeInputs.colis} onChange={e => handleVolumeChange('colis', e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {isMixed && block.id === 'bloc3' && (
                                        <div className="space-y-1">
                                            {/* Chef-lieu Selector */}
                                            <div className="bg-slate-50 p-2 rounded-xl border border-amber-100">
                                                <div className="flex justify-between items-center mb-1 pb-1 border-b border-amber-200/50">
                                                    <div className="flex items-center gap-2 font-bold text-slate-700">
                                                        <Landmark className="w-4 h-4 text-amber-500" />
                                                        <span>Statut Chef-Lieu</span>
                                                    </div>
                                                    <span className="font-bold text-emerald-600 bg-white px-2 py-0.5 rounded shadow-sm text-xs">{currentBloc3Results.details.chef_lieu.weighted.toFixed(1)}</span>
                                                </div>
                                                <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-inner">
                                                    {[{ v: 'non', l: 'Non' }, { v: 'province', l: 'Prov.' }, { v: 'region', l: 'Région' }].map(o => (
                                                        <label key={o.v} className={`flex-1 relative cursor-pointer group`}>
                                                            <input type="radio" value={o.v} checked={territorialInputs.chef_lieu === o.v} onChange={e => handleTerritorialChange('chef_lieu', e.target.value)} className="peer hidden" />
                                                            <div className="py-1 px-1 text-center text-[10px] font-bold rounded-md transition-all duration-200 peer-checked:bg-amber-100 peer-checked:text-amber-800 peer-checked:shadow-sm text-slate-500 hover:bg-slate-50">
                                                                {o.l}
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Sliders Grid */}
                                            <div className="grid grid-cols-2 gap-1">
                                                {/* Sites - Dropdown */}
                                                <div className="bg-slate-50 p-2 rounded-xl border border-amber-100 flex flex-col justify-between">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] uppercase font-bold text-slate-500">Sites</span>
                                                        <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded">8%</span>
                                                    </div>
                                                    <div className="mb-1">
                                                        <select
                                                            className="w-full text-center text-sm font-bold bg-white border border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 rounded-lg px-2 py-1 outline-none transition-all"
                                                            value={territorialInputs.sites_rattachés}
                                                            onChange={e => handleTerritorialChange('sites_rattachés', e.target.value)}
                                                        >
                                                            <option value="1-2">1-2</option>
                                                            <option value="3-4">3-4</option>
                                                            <option value="5-6">5-6</option>
                                                            <option value="7-8">7-8</option>
                                                            <option value=">8">&gt;8</option>
                                                        </select>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-xs font-bold text-emerald-600">{currentBloc3Results.details.sites.weighted.toFixed(1)} pts</div>
                                                        <div className="text-[9px] text-slate-400 mt-0.5">{currentBloc3Results.details.sites.palier.label}</div>
                                                    </div>
                                                </div>
                                                {/* Tournees - Auto-calculated */}
                                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-2 rounded-xl border border-amber-200 flex flex-col justify-between">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] uppercase font-bold text-slate-700">Tournées</span>
                                                            <span className="text-[8px] font-bold text-amber-600 bg-amber-100 px-1 rounded uppercase tracking-wider">Auto</span>
                                                        </div>
                                                        <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded">8%</span>
                                                    </div>
                                                    <div className="text-center mb-1">
                                                        <div className="text-2xl font-black text-amber-700">
                                                            {currentBloc3Results.details.tournees.val}
                                                        </div>
                                                        <div className="text-[9px] text-slate-500 font-medium mt-0.5">
                                                            = Effectif Facteurs
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-xs font-bold text-emerald-600">{currentBloc3Results.details.tournees.weighted.toFixed(1)} pts</div>
                                                        <div className="text-[9px] text-slate-400 mt-0.5">{currentBloc3Results.details.tournees.palier.label}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {isMixed && block.id === 'bloc4' && (
                                        <div className="space-y-1">
                                            {/* Effectif */}
                                            <div className="bg-slate-50 p-2 rounded-xl border border-rose-100">
                                                <div className="flex justify-between items-center mb-1">
                                                    <div className="flex items-center gap-2 font-bold text-slate-700">
                                                        <UserCheck className="w-4 h-4 text-rose-500" />
                                                        <span>Effectif Global</span>
                                                    </div>
                                                    <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">11%</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <input type="number" className="w-16 pl-2 pr-6 py-1 bg-white border border-slate-300 rounded-lg font-bold text-center shadow-sm focus:ring-2 focus:ring-rose-200 outline-none"
                                                            value={ressourcesInputs.effectif_global} onChange={e => handleRessourcesChange('effectif_global', e.target.value)} />
                                                        <span className="absolute right-2 top-1.5 text-xs text-slate-400">👤</span>
                                                    </div>
                                                    <div className="flex-1 text-right">
                                                        <div className="text-emerald-600 font-bold text-sm">{currentBloc4Results.details.effectif.weighted.toFixed(1)} pts</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">{currentBloc4Results.details.effectif.palier.label}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Amplitude */}
                                            <div className="bg-slate-50 p-2 rounded-xl border border-rose-100">
                                                <div className="flex justify-between items-center mb-1 pb-1 border-b border-rose-200/50">
                                                    <div className="flex items-center gap-2 font-bold text-slate-700">
                                                        <Clock className="w-4 h-4 text-rose-500" />
                                                        <span>Amplitude</span>
                                                    </div>
                                                    <div className="font-bold text-emerald-600 bg-white px-2 py-0.5 rounded shadow-sm text-xs">{currentBloc4Results.details.amplitude.weighted.toFixed(1)}</div>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    {[{ v: 'normal', l: 'Normal', i: Sun }, { v: 'etendu', l: 'Etendu 2x8', i: Clock }, { v: 'continu', l: 'Continu 24/7', i: Layers }].map(o => (
                                                        <label key={o.v} className={`flex items-center justify-between p-1.5 rounded-lg border cursor-pointer transition-all duration-200 ${ressourcesInputs.amplitude === o.v ? 'bg-white border-rose-400 ring-1 ring-rose-100 shadow-sm' : 'bg-white/50 border-slate-200 hover:bg-white'}`}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`p-1 rounded ${ressourcesInputs.amplitude === o.v ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                                                                    <o.i className="w-3 h-3" />
                                                                </div>
                                                                <span className={`text-[10px] font-bold ${ressourcesInputs.amplitude === o.v ? 'text-slate-800' : 'text-slate-500'}`}>{o.l}</span>
                                                            </div>
                                                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${ressourcesInputs.amplitude === o.v ? 'border-rose-500 bg-rose-500' : 'border-slate-300'}`}>
                                                                {ressourcesInputs.amplitude === o.v && <div className="w-1 h-1 bg-white rounded-full" />}
                                                            </div>
                                                            <input type="radio" value={o.v} checked={ressourcesInputs.amplitude === o.v} onChange={e => handleRessourcesChange('amplitude', e.target.value)} className="hidden" />
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                </div>

                {/* Compact Sidebar Summary */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden sticky top-4">
                        <div className="relative overflow-hidden bg-[#1E40AF] rounded-t-2xl px-4 py-3 text-white text-center">
                            <div className="relative z-10">
                                <h3 className="text-white/90 font-semibold text-[10px] mb-1.5 uppercase tracking-wider">Score Global</h3>
                                <div className="flex items-baseline justify-center gap-1 mb-3">
                                    <span className="text-3xl font-black tracking-tight">
                                        {totalScore.toFixed(1)}
                                    </span>
                                    <span className="text-base text-white/80 font-medium">/100</span>
                                </div>

                                {/* Categories - Side by Side */}
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    {/* Current Category */}
                                    {centreInfo?.categorisation_label && (
                                        <div className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-white/10 border border-white/20 backdrop-blur-sm">
                                            <span className="text-[8px] text-white/70 uppercase font-semibold tracking-wider">Actuel</span>
                                            <span className="text-sm font-black text-white">{centreInfo.categorisation_label}</span>
                                        </div>
                                    )}

                                    {/* New Calculated Class */}
                                    <div className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg bg-white/20 border border-white/30 backdrop-blur-sm ${!centreInfo?.categorisation_label ? 'col-span-2' : ''}`}>
                                        <div className="flex items-center gap-1">
                                            <Calculator className="w-2.5 h-2.5 text-white/90" />
                                            <span className="text-[8px] text-white/70 uppercase font-semibold tracking-wider">Nouveau</span>
                                        </div>
                                        <span className="text-base font-black text-white tracking-tight">Catégorie {classeCentre}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-white">
                            <h4 className="flex items-center gap-2 font-bold text-slate-800 mb-6 text-sm uppercase tracking-wide">
                                <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                                Récapitulatif
                            </h4>
                            <div className="space-y-5">
                                {BLOCKS.map(block => {
                                    const percent = Math.min(((scores[block.id] || 0) / block.weightTotal) * 100, 100);
                                    return (
                                        <div key={block.id} className="group">
                                            <div className="flex items-center justify-between text-xs mb-1.5">
                                                <span className="text-slate-500 font-bold group-hover:text-indigo-600 transition-colors">{block.label}</span>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="font-bold text-slate-900 text-sm">{(scores[block.id] || 0).toFixed(1)}</span>
                                                    <span className="text-slate-400 text-[10px]">/ {block.weightTotal}</span>
                                                </div>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100/80 rounded-full overflow-hidden shadow-inner">
                                                <div
                                                    className={`h-full bg-gradient-to-r from-${block.color}-500 to-${block.color}-400 rounded-full shadow-sm transition-all duration-700 ease-out`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="border-t border-slate-100 mt-6 pt-6 flex justify-between items-center">
                                    <span className="font-medium text-slate-500 text-sm">Total Points</span>
                                    <span className="font-black text-slate-900 text-2xl tracking-tight">{totalScore.toFixed(1)} <span className="text-sm font-normal text-slate-400">pts</span></span>
                                </div>

                                {/* 📋 Liste des Postes avec Effectifs Arrondis */}
                                {simResults?.postes && simResults.postes.length > 0 && (
                                    <div className="border-t border-slate-100 mt-6 pt-6">
                                        <h5 className="flex items-center gap-2 font-bold text-slate-700 mb-3 text-xs uppercase tracking-wide">
                                            <Users className="w-3.5 h-3.5 text-indigo-500" />
                                            Détail des Postes
                                            <span className="ml-auto text-[10px] font-normal text-slate-400">
                                                Total: {simResults.fte_arrondi?.toFixed(0) || 0}
                                            </span>
                                        </h5>
                                        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2">
                                            {simResults.postes.map((poste, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-semibold text-slate-700 truncate">
                                                            {poste.poste_label || poste.label || 'Poste'}
                                                        </div>
                                                        {poste.intitule_rh && (
                                                            <div className="text-[10px] text-slate-400 truncate">
                                                                {poste.intitule_rh}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-2">
                                                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                            {(poste.etp_arrondi || 0).toFixed(0)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
