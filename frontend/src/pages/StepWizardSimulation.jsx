import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import WizardStepper from "@/components/wizard/WizardStepper";
import WizardNavigation from "@/components/wizard/WizardNavigation";
import Step1CentreSelection from "@/components/wizard/Step1CentreSelection";
import Step2ParametersConfig from "@/components/wizard/Step2ParametersConfig";
import Step3VolumeInput from "@/components/wizard/Step3VolumeInput";
import Step4Results from "@/components/wizard/Step4Results";
import { api } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import "@/styles/wizard.css";

// Helper function to recalculate local/axes based on percentages
const recalculateGridValues = (gridValues, wizardData) => {
    const recalculated = JSON.parse(JSON.stringify(gridValues)); // Deep clone

    // Helper to recalculate a single flow object with flux-specific percentages
    const recalcFlow = (flowObj, fluxKey) => {
        if (!flowObj || typeof flowObj !== 'object') return;

        // Try to get flux-specific percentages, fallback to global
        const pctAxes = Number(wizardData[`${fluxKey}_pctAxesArrivee`] !== undefined ? wizardData[`${fluxKey}_pctAxesArrivee`] : (wizardData.pctAxesArrivee || 0));
        const pctLocal = Number(wizardData[`${fluxKey}_pctAxesDepart`] !== undefined ? wizardData[`${fluxKey}_pctAxesDepart`] : (wizardData.pctAxesDepart || 0));

        // Handle nested gc/part structure (amana)
        if (flowObj.gc && flowObj.part) {
            ['gc', 'part'].forEach(subKey => {
                const sub = flowObj[subKey];
                if (sub && sub.global !== undefined) {
                    const globalVal = parseFloat(String(sub.global).replace(',', '.')) || 0;

                    if (globalVal > 0) {
                        sub.local = String(Math.round(globalVal * (pctLocal / 100)));
                        sub.axes = String(Math.round(globalVal * (pctAxes / 100)));
                    } else {
                        sub.local = "0";
                        sub.axes = "0";
                    }
                }
            });
        }
        // Handle simple global/local/axes structure (cr, co)
        else if (flowObj.global !== undefined) {
            const globalVal = parseFloat(String(flowObj.global).replace(',', '.')) || 0;

            if (globalVal > 0) {
                flowObj.local = String(Math.round(globalVal * (pctLocal / 100)));
                flowObj.axes = String(Math.round(globalVal * (pctAxes / 100)));
            } else {
                flowObj.local = "0";
                flowObj.axes = "0";
            }
        }
    };

    // Recalculate each flux with its specific parameters
    if (recalculated.amana) {
        recalcFlow(recalculated.amana.depot, 'amana');
        recalcFlow(recalculated.amana.recu, 'amana');
    }

    if (recalculated.cr) {
        recalcFlow(recalculated.cr.med, 'cr');
        recalcFlow(recalculated.cr.arrive, 'cr');
    }

    if (recalculated.co) {
        recalcFlow(recalculated.co.med, 'co');
        recalcFlow(recalculated.co.arrive, 'co');
    }

    return recalculated;
};

export default function StepWizardSimulation() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [postes, setPostes] = useState([]);
    const [centreDetails, setCentreDetails] = useState(null);

    // Validation states for each step
    const [step1Valid, setStep1Valid] = useState(false);
    const [step2Valid, setStep2Valid] = useState(false);
    const [step3Valid, setStep3Valid] = useState(false);

    // Wizard data state
    const [wizardData, setWizardData] = useState({
        // Step 1: Centre Selection
        region: null,
        typologie: null,
        centre: null,

        // Volume
        pctCollecte: 5,
        pctMarcheOrdinaire: 0,
        pctRetour: 0,
        pctAxesArrivee: 0,
        pctAxesDepart: 0,
        pctNational: 100,
        pctInternational: 0,
        crParCaisson: 40,

        // Productivité
        productivite: 100,
        idleMinutes: 0,
        shift: 1,

        // Distribution
        natureGeo: 1,
        tauxComplexite: 1,
        dureeTrajet: 0,
        hasGuichet: 0,
        nbrCoSac: 350,
        nbrCrSac: 400,

        // Flux Specific Defaults
        amana_pctCollecte: 5,
        amana_pctRetour: 0,
        amana_pctAxesArrivee: 0,
        amana_pctAxesDepart: 0,
        amana_pctNational: 100,
        amana_pctInternational: 0,
        amana_pctMarcheOrdinaire: 0,
        amana_pctCrbt: 50,
        amana_pctHorsCrbt: 50,

        co_pctCollecte: 5,
        co_pctRetour: 0,
        co_pctAxesArrivee: 0,
        co_pctAxesDepart: 0,
        co_pctNational: 100,
        co_pctInternational: 0,

        cr_pctCollecte: 5,
        cr_pctRetour: 0,
        cr_pctAxesArrivee: 0,
        cr_pctAxesDepart: 0,
        cr_pctNational: 100,
        cr_pctInternational: 0,

        // Step 3: Volumes
        gridValues: {
            amana: {
                depot: {
                    gc: { global: "0", local: "0", axes: "0" },
                    part: { global: "0", local: "0", axes: "0" }
                },
                recu: {
                    gc: { global: "0", local: "0", axes: "0" },
                    part: { global: "0", local: "0", axes: "0" }
                }
            },
            cr: {
                med: { global: "0", local: "0", axes: "0" },
                arrive: { global: "0", local: "0", axes: "0" }
            },
            co: {
                med: { global: "0", local: "0", axes: "0" },
                arrive: { global: "0", local: "0", axes: "0" }
            },
            ebarkia: {
                med: "0",
                arrive: "0"
            },
            lrh: {
                med: "0",
                arrive: "0"
            }
        },
        colisAmanaParCanvaSac: 35,
        edPercent: 40,

        // Step 4: Results
        simulationResults: null,
    });

    // Load centre data when selected
    useEffect(() => {
        if (!wizardData.centre) {
            setPostes([]);
            setCentreDetails(null);
            return;
        }

        const loadCenterData = async () => {
            try {
                // 1. Charger les détails du centre (APS, Typologie, Nombre de tâches)
                const detailRes = await fetch(`/api/bandoeng/centre-details/${wizardData.centre}`);
                let details = null;
                if (detailRes.ok) {
                    details = await detailRes.json();
                    setCentreDetails(details);
                }

                // 2. Charger les postes existants
                let postesList = await api.getPostes(wizardData.centre);

                // 3. Trigger Auto-import si :
                // - Pas de tâches (même si des postes existent)
                // - OU Pas de postes du tout
                const hasNoTasks = !details || details.task_count === 0;
                const hasNoPostes = !postesList || postesList.length === 0;

                if (hasNoTasks || hasNoPostes) {
                    console.log("Empty center detected (tasks=0 or postes=0). Triggering auto-import...");
                    const importRes = await api.autoImportTasks(wizardData.centre);
                    if (importRes.success && importRes.created_count > 0) {
                        const message = importRes.failed_count > 0
                            ? `Initialisation : ${importRes.created_count} tâches importées, ${importRes.failed_count} rejetées (${importRes.typology_used})`
                            : `Initialisation : ${importRes.created_count} tâches importées (${importRes.typology_used})`;

                        toast.success((t) => (
                            <div className="flex flex-col gap-2">
                                <span>{message}</span>
                                {importRes.failed_count > 0 && (
                                    <button
                                        onClick={() => {
                                            api.exportRejections(importRes.failed_rows);
                                            toast.dismiss(t.id);
                                        }}
                                        className="text-xs bg-white text-green-700 px-2 py-1 rounded border border-green-200 hover:bg-green-50 font-bold"
                                    >
                                        Télécharger le rapport de rejets (.xlsx)
                                    </button>
                                )}
                            </div>
                        ), { duration: 6000 });

                        // Recharger les données après import
                        postesList = await api.getPostes(wizardData.centre);
                        const finalDetailRes = await fetch(`/api/bandoeng/centre-details/${wizardData.centre}`);
                        if (finalDetailRes.ok) {
                            setCentreDetails(await finalDetailRes.json());
                        }
                    } else if (importRes.success && importRes.created_count === 0) {
                        console.log("Auto-import success but 0 tasks created (check typology file).");
                    }
                }

                setPostes(postesList || []);

            } catch (err) {
                console.error("Error in loadCenterData:", err);
                toast.error("Erreur lors du chargement des données du centre");
            }
        };

        loadCenterData();
    }, [wizardData.centre]);

    // Calculate heuresNet (used in multiple places)
    const heuresNet = React.useMemo(() => {
        const prod = Number(wizardData.productivite || 100) / 100;
        const idleH = Number(wizardData.idleMinutes || 0) / 60;
        return Math.max(0, 8 * prod - idleH).toFixed(2);
    }, [wizardData.productivite, wizardData.idleMinutes]);

    // Recalculate grid values when percentage parameters change
    useEffect(() => {
        if (wizardData.gridValues) {
            const recalculated = recalculateGridValues(wizardData.gridValues, wizardData);
            // Only update if values actually changed to avoid infinite loop
            const currentStr = JSON.stringify(wizardData.gridValues);
            const newStr = JSON.stringify(recalculated);
            if (currentStr !== newStr) {
                setWizardData(prev => ({
                    ...prev,
                    gridValues: recalculated
                }));
            }
        }
    }, [
        wizardData.pctAxesArrivee, wizardData.pctAxesDepart,
        wizardData.amana_pctAxesArrivee, wizardData.amana_pctAxesDepart,
        wizardData.co_pctAxesArrivee, wizardData.co_pctAxesDepart,
        wizardData.cr_pctAxesArrivee, wizardData.cr_pctAxesDepart
    ]);

    // Update wizard data
    const updateWizardData = useCallback((newData) => {
        setWizardData(prev => ({ ...prev, ...newData }));
    }, []);

    // Update wizard data and invalidate simulation results
    const handleParameterChange = useCallback((newData) => {
        setWizardData(prev => ({
            ...prev,
            ...newData,
            simulationResults: null  // Clear simulation results when parameters change
        }));
    }, []);

    // Export PDF handler
    const handleExportPDF = useCallback(() => {
        if (!wizardData.simulationResults) {
            toast.error("Aucune simulation à exporter");
            return;
        }

        try {
            const doc = new jsPDF();
            let yPos = 20;

            // En-tête
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text('Rapport de Simulation Bandoeng', 105, yPos, { align: 'center' });

            yPos += 10;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 105, yPos, { align: 'center' });

            yPos += 5;
            doc.text(`Centre: ${wizardData.centre || 'N/A'}`, 105, yPos, { align: 'center' });

            yPos += 15;

            // Section KPIs
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Indicateurs Clés', 14, yPos);
            yPos += 8;

            const kpiData = [
                ['Charge Totale', `${wizardData.simulationResults.charge_totale?.toFixed(2) || 0} h`],
                ['ETP Calculé', wizardData.simulationResults.fte_calcule?.toFixed(2) || 0],
                ['ETP Final (Arrondi)', wizardData.simulationResults.fte_final || 0],
                ['Besoin', wizardData.simulationResults.besoin || 0],
                ['Écart', wizardData.simulationResults.ecart || 0]
            ];

            autoTable(doc, {
                startY: yPos,
                head: [['Indicateur', 'Valeur']],
                body: kpiData,
                theme: 'striped',
                headStyles: { fillColor: [0, 94, 168] },
                margin: { left: 14, right: 14 }
            });

            // Estimate table height: header + 5 rows + margins
            yPos += 10 + (kpiData.length * 10) + 15;

            // Section Paramètres
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Paramètres de Simulation', 14, yPos);
            yPos += 8;

            const paramData = [
                ['Productivité', `${wizardData.productivite}%`],
                ['Temps Idle', `${wizardData.idleMinutes} min`],
                ['Shift', wizardData.shift],
                ['% Axes Arrivée', `${wizardData.pctAxesArrivee}%`],
                ['% Axes Départ', `${wizardData.pctAxesDepart}%`],
                ['Nature Géo', wizardData.natureGeo],
                ['Taux Complexité', wizardData.tauxComplexite]
            ];

            autoTable(doc, {
                startY: yPos,
                head: [['Paramètre', 'Valeur']],
                body: paramData,
                theme: 'striped',
                headStyles: { fillColor: [0, 94, 168] },
                margin: { left: 14, right: 14 }
            });

            // Nouvelle page pour les tâches
            doc.addPage();
            yPos = 20;

            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Référentiel Temps', 14, yPos);
            yPos += 8;

            // Tableau des tâches
            const taskData = (wizardData.simulationResults.taches || []).map(task => [
                task.nom_tache || '',
                task.famille || '',
                task.produit || '',
                task.volume?.toFixed(0) || '0',
                task.temps_unitaire?.toFixed(2) || '0',
                task.charge_heures?.toFixed(2) || '0'
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [['Tâche', 'Famille', 'Produit', 'Volume', 'Temps Unit.', 'Charge (h)']],
                body: taskData,
                theme: 'grid',
                headStyles: { fillColor: [0, 94, 168], fontSize: 8 },
                bodyStyles: { fontSize: 7 },
                margin: { left: 14, right: 14 }
            });

            // Nouvelle page pour les ressources par poste
            if (wizardData.simulationResults.ressources_par_poste && wizardData.simulationResults.ressources_par_poste.length > 0) {
                doc.addPage();
                yPos = 20;

                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text('Ressources par Poste', 14, yPos);
                yPos += 8;

                const resourceData = wizardData.simulationResults.ressources_par_poste.map(res => [
                    res.poste_nom || '',
                    res.fte_calcule?.toFixed(2) || '0',
                    res.fte_final || '0',
                    res.besoin || '0',
                    res.ecart || '0'
                ]);

                autoTable(doc, {
                    startY: yPos,
                    head: [['Poste', 'ETP Calculé', 'ETP Final', 'Besoin', 'Écart']],
                    body: resourceData,
                    theme: 'striped',
                    headStyles: { fillColor: [0, 94, 168], fontSize: 9 },
                    bodyStyles: { fontSize: 8 },
                    margin: { left: 14, right: 14 }
                });
            }

            // Sauvegarder le PDF
            const fileName = `simulation_${wizardData.centre}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            toast.success("PDF exporté avec succès !");
        } catch (error) {
            console.error("Erreur lors de l'export PDF:", error);
            toast.error("Erreur lors de l'export PDF");
        }
    }, [wizardData]);

    // Navigation handlers
    const handleNext = useCallback(() => {
        if (currentStep < 4) {
            setCurrentStep(prev => prev + 1);
        } else {
            // Finish wizard - Export PDF
            handleExportPDF();
        }
    }, [currentStep, handleExportPDF]);

    const handlePrevious = useCallback(() => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    const handleReset = useCallback(() => {
        if (confirm("Êtes-vous sûr de vouloir réinitialiser le wizard ? Toutes les données seront perdues.")) {
            setCurrentStep(1);
            setWizardData({
                region: null,
                typologie: null,
                centre: null,
                pctCollecte: 5,
                pctMarcheOrdinaire: 0,
                pctRetour: 0,
                pctAxesArrivee: 0,
                pctAxesDepart: 0,
                pctNational: 100,
                pctInternational: 0,
                crParCaisson: 500,
                productivite: 100,
                idleMinutes: 0,
                shift: 1,
                natureGeo: 1,
                tauxComplexite: 1,
                dureeTrajet: 0,
                gridValues: {
                    amana: {
                        depot: {
                            gc: { global: "0", local: "0", axes: "0" },
                            part: { global: "0", local: "0", axes: "0" }
                        },
                        recu: {
                            gc: { global: "0", local: "0", axes: "0" },
                            part: { global: "0", local: "0", axes: "0" }
                        }
                    },
                    cr: {
                        med: { global: "0", local: "0", axes: "0" },
                        arrive: { global: "0", local: "0", axes: "0" }
                    },
                    co: {
                        med: { global: "0", local: "0", axes: "0" },
                        arrive: { global: "0", local: "0", axes: "0" }
                    },
                    ebarkia: {
                        med: "0",
                        arrive: "0"
                    },
                    lrh: {
                        med: "0",
                        arrive: "0"
                    }
                },
                colisAmanaParCanvaSac: 35,
                nbrCoSac: 350,
                nbrCrSac: 400,
                edPercent: 40,
                simulationResults: null,
            });
            setStep1Valid(false);
            setStep2Valid(false);
            setStep3Valid(false);
        }
    }, []);

    // Launch simulation
    const handleLaunchSimulation = useCallback(async () => {
        setLoading(true);
        try {
            // Prepare simulation payload (similar to BandoengSimulation)
            const payload = {
                centre_id: wizardData.centre,
                grid_values: wizardData.gridValues,
                parameters: {
                    productivite: wizardData.productivite,
                    idle_minutes: wizardData.idleMinutes,
                    shift: wizardData.shift,
                    coeff_geo: wizardData.natureGeo,
                    coeff_circ: wizardData.tauxComplexite,
                    duree_trajet: wizardData.dureeTrajet,
                    pct_axes: wizardData.pctAxesArrivee,
                    pct_local: wizardData.pctAxesDepart,
                    pct_national: wizardData.pctNational,
                    pct_international: wizardData.pctInternational,
                    pct_collecte: wizardData.pctCollecte,
                    pct_retour: wizardData.pctRetour,
                    pct_marche_ordinaire: wizardData.pctMarcheOrdinaire,
                    colis_amana_par_canva_sac: wizardData.colisAmanaParCanvaSac,
                    nbr_co_sac: wizardData.nbrCoSac,
                    nbr_cr_sac: wizardData.nbrCrSac,
                    cr_par_caisson: wizardData.crParCaisson,
                    ed_percent: wizardData.edPercent,
                    has_guichet: wizardData.hasGuichet,
                    // AMANA
                    amana_pct_collecte: wizardData.amana_pctCollecte,
                    amana_pct_retour: wizardData.amana_pctRetour,
                    amana_pct_axes_arrivee: wizardData.amana_pctAxesArrivee,
                    amana_pct_axes_depart: wizardData.amana_pctAxesDepart,
                    amana_pct_national: wizardData.amana_pctNational,
                    amana_pct_international: wizardData.amana_pctInternational,
                    amana_pct_marche_ordinaire: wizardData.amana_pctMarcheOrdinaire,
                    amana_pct_crbt: wizardData.amana_pctCrbt,
                    amana_pct_hors_crbt: wizardData.amana_pctHorsCrbt,
                    // CO
                    co_pct_collecte: wizardData.co_pctCollecte,
                    co_pct_retour: wizardData.co_pctRetour,
                    co_pct_axes_arrivee: wizardData.co_pctAxesArrivee,
                    co_pct_axes_depart: wizardData.co_pctAxesDepart,
                    co_pct_national: wizardData.co_pctNational,
                    co_pct_international: wizardData.co_pctInternational,
                    // CR
                    cr_pct_collecte: wizardData.cr_pctCollecte,
                    cr_pct_retour: wizardData.cr_pctRetour,
                    cr_pct_axes_arrivee: wizardData.cr_pctAxesArrivee,
                    cr_pct_axes_depart: wizardData.cr_pctAxesDepart,
                    cr_pct_national: wizardData.cr_pctNational,
                    cr_pct_international: wizardData.cr_pctInternational,
                }
            };

            const res = await api.bandoengSimulate(payload);

            updateWizardData({ simulationResults: res });
            toast.success("Simulation lancée avec succès !");
        } catch (err) {
            console.error("Simulation error:", err);
            toast.error("Erreur lors de la simulation : " + (err.message || "Erreur inconnue"));
        } finally {
            setLoading(false);
        }
    }, [wizardData, updateWizardData]);

    // Import Bandoeng handler
    const handleImportBandoeng = useCallback(async (file) => {
        const toastId = toast.loading("Importation en cours...");
        try {
            const gridValues = await api.importBandoengVolumes(file);
            if (gridValues && typeof gridValues === 'object') {
                // Recalculate local/axes based on percentages
                const recalculated = recalculateGridValues(gridValues, wizardData);
                updateWizardData({ gridValues: recalculated });
                toast.success("Volumes importés avec succès");
                toast.dismiss(toastId);
            } else {
                throw new Error("Format de données invalide");
            }
        } catch (e) {
            console.error("Import Error:", e);
            toast.error("Erreur lors de l'import : " + e.message);
            toast.dismiss(toastId);
        }
    }, [updateWizardData, wizardData]);

    // Download template handler
    const handleDownloadTemplate = useCallback(async () => {
        try {
            await api.downloadBandoengVolumesTemplate();
        } catch (e) {
            console.error("Download Error:", e);
            toast.error("Erreur téléchargement modèle");
        }
    }, []);

    // Determine if can go to next step
    const canGoNext = React.useMemo(() => {
        switch (currentStep) {
            case 1:
                return step1Valid;
            case 2:
                return step2Valid;
            case 3:
                return step3Valid;
            case 4:
                return true;
            default:
                return false;
        }
    }, [currentStep, step1Valid, step2Valid, step3Valid]);

    return (
        <div className="wizard-container">
            {/* Stepper */}
            <WizardStepper currentStep={currentStep} />

            {/* Step Content */}
            <div className="flex-1 overflow-auto">
                {currentStep === 1 && (
                    <Step1CentreSelection
                        data={wizardData}
                        onDataChange={updateWizardData}
                        onValidationChange={setStep1Valid}
                    />
                )}
                {currentStep === 2 && (
                    <Step2ParametersConfig
                        data={{ ...wizardData, heuresNet }}
                        onDataChange={updateWizardData}
                        handleParameterChange={handleParameterChange}
                        onValidationChange={setStep2Valid}
                    />
                )}
                {currentStep === 3 && (
                    <Step3VolumeInput
                        data={wizardData}
                        onDataChange={updateWizardData}
                        onValidationChange={setStep3Valid}
                        onImportBandoeng={handleImportBandoeng}
                        onDownloadTemplate={handleDownloadTemplate}
                    />
                )}
                {currentStep === 4 && (
                    <Step4Results
                        data={{ ...wizardData, heuresNet }}
                        onLaunchSimulation={handleLaunchSimulation}
                        simulationResults={wizardData.simulationResults}
                        loading={loading}
                        postes={postes}
                        centreDetails={centreDetails}
                    />
                )}
            </div>

            {/* Navigation */}
            <WizardNavigation
                currentStep={currentStep}
                totalSteps={4}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onReset={handleReset}
                canGoNext={canGoNext}
                isLastStep={currentStep === 4}
                loading={loading}
            />

            <Toaster position="top-right" />
        </div>
    );
}
