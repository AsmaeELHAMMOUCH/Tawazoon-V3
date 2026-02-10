// SimulationIntervenantAvancee.jsx - Wrapper page for VueIntervenantAvancee
import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import VueIntervenantAvancee from "@/components/views/VueIntervenantAvancee";
import { simulateBandoeng } from "@/services/api";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

export default function SimulationIntervenantAvancee() {
    const location = useLocation();
    const navigate = useNavigate();

    // States
    const [regions, setRegions] = useState([]);
    const [centres, setCentres] = useState([]);
    const [postesOptions, setPostesOptions] = useState([]);
    const [loading, setLoading] = useState({});

    const [region, setRegion] = useState("");
    const [centre, setCentre] = useState("");
    const [poste, setPoste] = useState("");
    const [centreCategorie, setCentreCategorie] = useState(null);

    const [productivite, setProductivite] = useState(100);
    const [heuresNet, setHeuresNet] = useState(8);
    const [idleMinutes, setIdleMinutes] = useState(0);
    const [shift, setShift] = useState(1);

    const [resultats, setResultats] = useState(null);
    const [totaux, setTotaux] = useState(null);
    const [hasSimulated, setHasSimulated] = useState(false);
    const [simDirty, setSimDirty] = useState(false);

    // Load initial data
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const regionsData = await api.regions();
                setRegions(regionsData || []);
            } catch (error) {
                console.error("Error loading initial data:", error);
                toast.error("Erreur lors du chargement des données");
            }
        };

        loadInitialData();
    }, []);

    // Load centres when region changes
    useEffect(() => {
        const loadCentres = async () => {
            if (!region) {
                setCentres([]);
                return;
            }

            try {
                const centresData = await api.centres(region);
                setCentres(centresData || []);
            } catch (error) {
                console.error("Error loading centres:", error);
                toast.error("Erreur lors du chargement des centres");
            }
        };

        loadCentres();
    }, [region]);

    // Load postes and centre details when centre changes
    useEffect(() => {
        const loadCentreData = async () => {
            if (!centre) {
                setCentreCategorie(null);
                setPostesOptions([]); // Clear postes if no centre
                return;
            }

            try {
                // 1. Charger détails centre
                const centreDataPromise = api.getCentre(centre);

                // 2. Tenter de charger les postes spécifiques au centre
                let postesDataPromise = api.postes(centre);

                let [centreData, postesData] = await Promise.all([
                    centreDataPromise,
                    postesDataPromise
                ]);

                // 3. Fallback : Si aucun poste au centre, charger tout le référentiel
                if (!postesData || postesData.length === 0) {
                    // console.log("⚠️ Aucun poste dans ce centre. Chargement du référentiel complet.");
                    postesData = await api.postes(); // Appel sans filtre
                    if (postesData && postesData.length > 0) {
                        toast("Aucun poste associé : Affichage du référentiel complet", {
                            icon: "ℹ️",
                            style: { fontSize: '12px' }
                        });
                    }
                }

                setCentreCategorie(centreData?.categorie_id || null);
                setPostesOptions(postesData || []);
            } catch (error) {
                console.error("Error loading centre data:", error);
                toast.error("Erreur chargement données");
            }
        };

        loadCentreData();
    }, [centre]);

    // Helper function to sum grid values
    const sumValues = (gridValues, paths) => {
        let total = 0;
        paths.forEach(pathArray => {
            let current = gridValues;
            for (const key of pathArray) {
                if (current && current[key] !== undefined) {
                    current = current[key];
                } else {
                    current = 0;
                    break;
                }
            }
            const val = parseFloat(current);
            if (!isNaN(val)) total += val;
        });
        return total;
    };

    // Handle simulation
    const handleSimuler = useCallback(async (params) => {
        if (!centre) {
            toast.error("Veuillez sélectionner un centre");
            return;
        }

        setLoading({ simulation: true });
        setSimDirty(false);

        try {
            const gridValues = params.grid_values;

            // Calculate totals from grid (same logic as BandoengSimulation)
            const co_export_total = sumValues(gridValues, [["co", "med", "global"], ["co", "med", "local"], ["co", "med", "axes"]]);
            const co_import_total = sumValues(gridValues, [["co", "arrive", "global"], ["co", "arrive", "local"], ["co", "arrive", "axes"]]);
            const cr_export_total = sumValues(gridValues, [["cr", "med", "global"], ["cr", "med", "local"], ["cr", "med", "axes"]]);
            const cr_import_total = sumValues(gridValues, [["cr", "arrive", "global"], ["cr", "arrive", "local"], ["cr", "arrive", "axes"]]);
            const colis_export = sumValues(gridValues, [
                ["amana", "depot", "gc", "global"], ["amana", "depot", "gc", "local"], ["amana", "depot", "gc", "axes"],
                ["amana", "depot", "part", "global"], ["amana", "depot", "part", "local"], ["amana", "depot", "part", "axes"]
            ]);
            const colis_import = sumValues(gridValues, [
                ["amana", "recu", "gc", "global"], ["amana", "recu", "gc", "local"], ["amana", "recu", "gc", "axes"],
                ["amana", "recu", "part", "global"], ["amana", "recu", "part", "local"], ["amana", "recu", "part", "axes"]
            ]);
            const gare_export = parseFloat(gridValues.ebarkia?.med || 0);
            const gare_import = parseFloat(gridValues.ebarkia?.arrive || 0);

            // Get poste code (null for global simulation)
            const selectedPosteObj = poste ? postesOptions.find(p => String(p.id) === String(poste)) : null;
            const posteCode = selectedPosteObj ? selectedPosteObj.code : null;

            // Prepare payload for Bandoeng API
            const payload = {
                centre_id: parseInt(centre),
                poste_code: posteCode, // null for global simulation
                volumes: {
                    amana_import: colis_import,
                    amana_export: colis_export,
                    courrier_ordinaire_import: co_import_total,
                    courrier_ordinaire_export: co_export_total,
                    courrier_recommande_import: cr_import_total,
                    courrier_recommande_export: cr_export_total,
                    gare_import: gare_import,
                    gare_export: gare_export,
                    presse_import: 0,
                    presse_export: 0,
                    grid_values: gridValues
                },
                params: {
                    productivite: params.productivite || 100,
                    idle_minutes: params.idle_minutes || 0,
                    shift: params.shift || 1,
                    pct_sac: params.pct_sac || 60,
                    colis_amana_par_canva_sac: params.colis_amana_par_canva_sac || 35,
                    courriers_par_sac: params.courriers_par_sac || 350,
                    nbr_co_sac: params.nbr_co_sac || 350,
                    nbr_cr_sac: params.nbr_cr_sac || 400,
                    ratio_trieur: params.ratio_trieur || 1200,
                    ratio_preparateur: params.ratio_preparateur || 1000,
                    ratio_magasinier: params.ratio_magasinier || 800,
                    coeff_circ: params.coeff_circ || 1,
                    coeff_geo: params.coeff_geo || 1,
                    pct_retour: params.pct_retour || 0,
                    pct_collecte: params.pct_collecte || 0,
                    pct_axes: params.pct_axes || 0,
                    pct_local: params.pct_local || 0,
                    pct_international: params.pct_international || 0,
                    pct_national: params.pct_national || 100,
                    pct_march_ordinaire: params.pct_march_ordinaire || 0
                }
            };

            // Call Bandoeng simulation API
            const data = await simulateBandoeng(payload);

            setResultats(data);
            setTotaux(data.totaux || null);
            setHasSimulated(true);

            const modeText = poste ? "par poste" : "globale";
            toast.success(`Simulation ${modeText} réussie : ${data.total_ressources_humaines || data.fte_arrondi || 0} ETP`);
        } catch (error) {
            console.error("Simulation error:", error);
            toast.error(error.response?.data?.detail || "Erreur lors de la simulation");
        } finally {
            setLoading({ simulation: false });
        }
    }, [centre, poste, postesOptions]);

    return (
        <div className="min-h-screen bg-slate-50">
            <VueIntervenantAvancee
                regions={regions}
                centres={centres}
                postesOptions={postesOptions}
                loading={loading}
                region={region}
                setRegion={setRegion}
                centre={centre}
                setCentre={setCentre}
                centreCategorie={centreCategorie}
                poste={poste}
                setPoste={setPoste}
                productivite={productivite}
                setProductivite={setProductivite}
                heuresNet={heuresNet}
                setHeuresNet={setHeuresNet}
                onSimuler={handleSimuler}
                resultats={resultats}
                totaux={totaux}
                hasSimulated={hasSimulated}
                simDirty={simDirty}
                idleMinutes={idleMinutes}
                setIdleMinutes={setIdleMinutes}
                shift={shift}
                setShift={setShift}
            />
        </div>
    );
}
