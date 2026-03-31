import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";

import WizardStepper from "@/components/wizard/WizardStepper";
import WizardNavigation from "@/components/wizard/WizardNavigation";
import Step1CentreSelection from "@/components/wizard/Step1CentreSelection";
import Step2RawImport from "@/components/wizard/Step2RawImport";
import Step2ParametersConfig from "@/components/wizard/Step2ParametersConfig";
import Step3VolumeInput from "@/components/wizard/Step3VolumeInput";
import Step5ComparatifProcessResults from "@/components/wizard/Step5ComparatifProcessResults";

import "@/styles/wizard.css";

// Helper function to recalculate local/axes based on percentages
const recalculateGridValues = (gridValues, wizardData) => {
  const recalculated = JSON.parse(JSON.stringify(gridValues)); // Deep clone

  // Helper to sync Standard details (Guichet, Collecte, Marche) for CR/CO/AMANA
  const syncStandardDetails = (fluxKey, flowType, subKey, localVal) => {
    const pctCollecte = Number(
      wizardData[`${fluxKey}_pctCollecte`] !== undefined
        ? wizardData[`${fluxKey}_pctCollecte`]
        : wizardData.pctCollecte || 0
    );
    const pctMarche = Number(
      wizardData[`${fluxKey}_pctMarcheOrdinaire`] !== undefined
        ? wizardData[`${fluxKey}_pctMarcheOrdinaire`]
        : wizardData.pctMarcheOrdinaire || 0
    );
    const pctGuichet = Number(
      wizardData[`${fluxKey}_pctGuichet`] !== undefined
        ? wizardData[`${fluxKey}_pctGuichet`]
        : wizardData.pctGuichet || 0
    );

    const collecte = Math.round(localVal * (pctCollecte / 100));
    const marche = Math.round(localVal * (pctMarche / 100));
    const guichet = Math.round(localVal * (pctGuichet / 100));

    if (!recalculated[fluxKey].localDetails) recalculated[fluxKey].localDetails = {};
    const detailKey = subKey ? `${flowType}_${subKey}` : flowType;
    recalculated[fluxKey].localDetails[detailKey] = { guichet, collecte, marche };
  };

  // Helper to recalculate a single flow object with flux-specific parameters
  const recalcFlow = (flowObj, fluxKey, flowType) => {
    if (!flowObj || typeof flowObj !== "object") return;

    const pctAxes = Number(
      wizardData[`${fluxKey}_pctAxesArrivee`] !== undefined
        ? wizardData[`${fluxKey}_pctAxesArrivee`]
        : wizardData.pctAxesArrivee || 0
    );
    const pctLocal = Number(
      wizardData[`${fluxKey}_pctAxesDepart`] !== undefined
        ? wizardData[`${fluxKey}_pctAxesDepart`]
        : wizardData.pctAxesDepart || 0
    );

    // Handle nested gc/part structure (amana)
    if (flowObj.gc && flowObj.part) {
      ["gc", "part"].forEach((subKey) => {
        const sub = flowObj[subKey];
        if (sub && sub.global !== undefined) {
          const globalVal = parseFloat(String(sub.global).replace(",", ".")) || 0;
          const localVal = Math.round(globalVal * (pctLocal / 100));

          sub.local = String(localVal);
          sub.axes = String(Math.round(globalVal * (pctAxes / 100)));

          // Sync ventilation for AMANA
          syncStandardDetails(fluxKey, flowType, subKey, localVal);
        }
      });
    }

    // Handle simple global/local/axes structure (cr, co)
    else if (flowObj.global !== undefined) {
      const globalVal = parseFloat(String(flowObj.global).replace(",", ".")) || 0;
      const localVal = Math.round(globalVal * (pctLocal / 100));
      flowObj.local = String(localVal);
      flowObj.axes = String(Math.round(globalVal * (pctAxes / 100)));

      // Sync ventilation for CR/CO
      if (["cr", "co"].includes(fluxKey)) {
        syncStandardDetails(fluxKey, flowType, null, localVal);
      }
    }
  };

  // Recalculate each flux with its specific parameters
  if (recalculated.amana) {
    recalcFlow(recalculated.amana.depot, "amana", "depot");
    recalcFlow(recalculated.amana.recu, "amana", "recu");
  }

  if (recalculated.cr) {
    recalcFlow(recalculated.cr.med, "cr", "med");
    recalcFlow(recalculated.cr.arrive, "cr", "arrive");
  }

  if (recalculated.co) {
    recalcFlow(recalculated.co.med, "co", "med");
    recalcFlow(recalculated.co.arrive, "co", "arrive");
  }

  return recalculated;
};

export default function ComparatifProcessusWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [centreDetails, setCentreDetails] = useState(null);
  const [postes, setPostes] = useState([]);

  // Comparatif step validation (controls the final wizard button)
  const [step1Valid, setStep1Valid] = useState(false);
  const [step2Valid, setStep2Valid] = useState(false);
  const [step3Valid, setStep3Valid] = useState(false);
  const [step4Valid, setStep4Valid] = useState(false);
  const [step5Valid, setStep5Valid] = useState(false);

  const launchComparatifRef = useRef(null);

  const initialWizardData = useMemo(
    () => ({
      // Step 1: Centre Selection
      region: null,
      typologie: null,
      centre: null,
      isVirtual: false,
      virtualTypology: null,
      virtualName: null,

      // Volume
      pctCollecte: 5,
      pctMarcheOrdinaire: 0,
      pctGuichet: 95,
      pctRetour: 0,
      pctAxesArrivee: 0,
      pctAxesDepart: 100,
      pctNational: 100,
      pctInternational: 0,
      crParCaisson: 40,

      // Productivité
      productivite: 100,
      idleMinutes: 0,
      shift: 1,

      // Distribution
      natureGeo: 0,
      tauxComplexite: 0,
      dureeTrajet: 0,
      hasGuichet: 1,
      nbrCoSac: 350,
      nbrCrSac: 400,

      // Step 3: Volumes
      rawGridValues: null,
      gridValues: {
        amana: {
          depot: {
            gc: { global: "0", local: "0", axes: "0" },
            part: { global: "0", local: "0", axes: "0" },
          },
          recu: {
            gc: { global: "0", local: "0", axes: "0" },
            part: { global: "0", local: "0", axes: "0" },
          },
        },
        cr: {
          med: { global: "0", local: "0", axes: "0" },
          arrive: { global: "0", local: "0", axes: "0" },
          localDetails: {},
        },
        co: {
          med: { global: "0", local: "0", axes: "0" },
          arrive: { global: "0", local: "0", axes: "0" },
          localDetails: {},
        },
        ebarkia: {
          med: "0",
          arrive: "0",
        },
        lrh: {
          med: "0",
          arrive: "0",
        },
      },

      // Flux Specific Defaults
      amana_pctCollecte: 5,
      amana_pctRetour: 0,
      amana_pctAxesArrivee: 0,
      amana_pctAxesDepart: 100,
      amana_pctNational: 100,
      amana_pctInternational: 0,
      amana_pctMarcheOrdinaire: 0,
      amana_pctGuichet: 95,
      amana_pctCrbt: 50,
      amana_pctHorsCrbt: 50,

      co_pctCollecte: 5,
      co_pctRetour: 0,
      co_pctAxesArrivee: 0,
      co_pctAxesDepart: 100,
      co_pctNational: 100,
      co_pctInternational: 0,
      co_pctMarcheOrdinaire: 0,
      co_pctGuichet: 95,
      co_pctVagueMaster: 0,
      co_pctBoitePostale: 0,

      cr_pctCollecte: 5,
      cr_pctRetour: 0,
      cr_pctAxesArrivee: 0,
      cr_pctAxesDepart: 100,
      cr_pctNational: 100,
      cr_pctInternational: 0,
      cr_pctMarcheOrdinaire: 0,
      cr_pctGuichet: 95,
      cr_pctVagueMaster: 0,
      cr_pctBoitePostale: 0,
      cr_pctCrbt: 50,
      cr_pctHorsCrbt: 50,

      pctVagueMaster: 0,
      pctBoitePostale: 0,
      pctCrbt: 50,
      pctHorsCrbt: 50,

      colisAmanaParCanvaSac: 35,
      edPercent: 40,
      simulationResults: null,
      needsRelaunch: false,
    }),
    []
  );

  const [wizardData, setWizardData] = useState(initialWizardData);

  const updateWizardData = useCallback((newData) => {
    setWizardData((prev) => ({ ...prev, ...newData }));
  }, []);

  const handleParameterChange = useCallback(
    (newData) => {
      updateWizardData(newData);
    },
    [updateWizardData]
  );

  const handleImportBandoeng = useCallback(
    async (file) => {
      const toastId = toast.loading("Importation en cours...");
      try {
        const gridValues = await api.importBandoengVolumes(file);
        if (gridValues && typeof gridValues === "object") {
          updateWizardData({ rawGridValues: gridValues, gridValues });
          toast.success("Volumes importés avec succès");
          toast.dismiss(toastId);
        } else {
          throw new Error("Format de données invalide");
        }
      } catch (e) {
        console.error("Import Error:", e);
        toast.error("Erreur lors de l'import : " + (e?.message || e));
        toast.dismiss(toastId);
      }
    },
    [updateWizardData]
  );

  const handleDownloadTemplate = useCallback(async () => {
    try {
      await api.downloadBandoengVolumesTemplate();
    } catch (e) {
      console.error("Download Error:", e);
      toast.error("Erreur téléchargement modèle");
    }
  }, []);

  // Launch grid recalculation when percentage parameters change (keep gridValues consistent)
  useEffect(() => {
    const sourceGrid = wizardData.rawGridValues || wizardData.gridValues;
    if (sourceGrid) {
      const recalculated = recalculateGridValues(sourceGrid, wizardData);
      if (JSON.stringify(wizardData.gridValues) !== JSON.stringify(recalculated)) {
        updateWizardData({ gridValues: recalculated });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    wizardData.rawGridValues,
    wizardData.gridValues,
    wizardData.pctAxesArrivee,
    wizardData.pctAxesDepart,
    wizardData.amana_pctAxesArrivee,
    wizardData.amana_pctAxesDepart,
    wizardData.co_pctAxesArrivee,
    wizardData.co_pctAxesDepart,
    wizardData.cr_pctAxesArrivee,
    wizardData.cr_pctAxesDepart,
    wizardData.pctCollecte,
    wizardData.pctMarcheOrdinaire,
    wizardData.pctGuichet,
    wizardData.amana_pctCollecte,
    wizardData.amana_pctMarcheOrdinaire,
    wizardData.amana_pctGuichet,
    wizardData.co_pctCollecte,
    wizardData.co_pctMarcheOrdinaire,
    wizardData.co_pctGuichet,
    wizardData.cr_pctCollecte,
    wizardData.cr_pctMarcheOrdinaire,
    wizardData.cr_pctGuichet,
    updateWizardData,
  ]);

  // Calculate heuresNet (used in Step2ParametersConfig)
  const heuresNet = useMemo(() => {
    const prod = Number(wizardData.productivite || 100) / 100;
    const idleH = Number(wizardData.idleMinutes || 0) / 60;
    return Math.max(0, 8.5 * prod - idleH).toFixed(2);
  }, [wizardData.productivite, wizardData.idleMinutes]);

  // Load centre data when selected (APS, coefficients, auto-import if empty)
  useEffect(() => {
    if (!wizardData.centre) {
      setCentreDetails(null);
      return;
    }

    const loadCenterData = async () => {
      try {
        const detailRes = await fetch(`/api/bandoeng/centre-details/${wizardData.centre}`);
        let details = null;

        if (detailRes.ok) {
          details = await detailRes.json();
          setCentreDetails(details);
          updateWizardData({
            natureGeo:
              details.nature_geo !== undefined ? details.nature_geo : wizardData.natureGeo,
            tauxComplexite:
              details.taux_complexite !== undefined
                ? details.taux_complexite
                : wizardData.tauxComplexite,
            dureeTrajet:
              details.duree_trajet !== undefined ? details.duree_trajet : wizardData.dureeTrajet,
          });
        } else {
          console.error("Failed to load centre details:", detailRes.statusText);
          toast.error("Erreur lors du chargement des détails du centre");
        }

        const postesList = await api.bandoengPostes(wizardData.centre);
        setPostes(postesList || []);

        const hasNoTasks = !details || details.task_count === 0;
        const hasNoPostes = !postesList || postesList.length === 0;

        if (hasNoTasks || hasNoPostes) {
          const importRes = await api.autoImportTasks(wizardData.centre);
          if (importRes?.success && importRes.created_count > 0) {
            const message =
              importRes.failed_count > 0
                ? `Initialisation : ${importRes.created_count} tâches importées, ${importRes.failed_count} rejetées (${importRes.typology_used})`
                : `Initialisation : ${importRes.created_count} tâches importées (${importRes.typology_used})`;

            toast.success(message, { duration: 6000 });

            if (importRes.failed_count > 0) {
              toast.success(
                () => (
                  <div className="flex flex-col gap-2">
                    <span>
                      {importRes.failed_count} lignes rejetées. Vous pouvez télécharger le rapport.
                    </span>
                    <button
                      type="button"
                      onClick={() => api.exportRejections(importRes.failed_rows)}
                      className="text-xs bg-white text-green-700 px-2 py-1 rounded border border-green-200 hover:bg-green-50 font-bold"
                    >
                      Télécharger le rapport de rejets (.xlsx)
                    </button>
                  </div>
                ),
                { duration: 8000 }
              );
            }

            const finalDetailRes = await fetch(`/api/bandoeng/centre-details/${wizardData.centre}`);
            if (finalDetailRes.ok) {
              setCentreDetails(await finalDetailRes.json());
            }
            // Recharger les postes après auto-import pour que les dialogs puissent fonctionner
            const postesAfter = await api.bandoengPostes(wizardData.centre);
            setPostes(postesAfter || []);
          }
        }
      } catch (err) {
        console.error("Error in loadCenterData:", err);
        toast.error("Erreur lors du chargement des données du centre");
      }
    };

    loadCenterData();
  }, [wizardData.centre, updateWizardData]);

  // Reset step5 validity whenever user leaves step 5
  useEffect(() => {
    if (currentStep !== 5) setStep5Valid(false);
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    } else {
      launchComparatifRef.current?.();
    }
  }, [currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  }, [currentStep]);

  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 1:
        return step1Valid;
      case 2:
        return step2Valid;
      case 3:
        return step3Valid;
      case 4:
        return step4Valid;
      case 5:
        return step5Valid;
      default:
        return false;
    }
  }, [currentStep, step1Valid, step2Valid, step3Valid, step4Valid, step5Valid]);

  return (
    <div className="wizard-container">
      <WizardStepper currentStep={currentStep} mode="comparatif" />

      <div className="flex-1 overflow-auto">
        {currentStep === 1 && (
          <Step1CentreSelection
            data={wizardData}
            onDataChange={updateWizardData}
            onValidationChange={setStep1Valid}
          />
        )}
        {currentStep === 2 && (
          <Step2RawImport
            data={wizardData}
            onDataChange={updateWizardData}
            onValidationChange={setStep2Valid}
            onImportBandoeng={handleImportBandoeng}
            onDownloadTemplate={handleDownloadTemplate}
          />
        )}
        {currentStep === 3 && (
          <Step2ParametersConfig
            data={{ ...wizardData, heuresNet }}
            onDataChange={updateWizardData}
            handleParameterChange={handleParameterChange}
            onValidationChange={setStep3Valid}
          />
        )}
        {currentStep === 4 && (
          <Step3VolumeInput
            data={wizardData}
            onDataChange={updateWizardData}
            onValidationChange={setStep4Valid}
            onImportBandoeng={handleImportBandoeng}
            onDownloadTemplate={handleDownloadTemplate}
          />
        )}
        {currentStep === 5 && (
          <Step5ComparatifProcessResults
            wizardData={wizardData}
            centreDetails={centreDetails}
            postes={postes}
            loading={loading}
            setLoading={setLoading}
            registerLaunchHandler={(fn) => {
              launchComparatifRef.current = fn;
            }}
            onStep5ValidChange={setStep5Valid}
          />
        )}
      </div>

      <WizardNavigation
        currentStep={currentStep}
        totalSteps={5}
        onPrevious={handlePrevious}
        onNext={handleNext}
        canGoNext={canGoNext}
        loading={loading}
        onReset={() => {
          if (!confirm("Êtes-vous sûr de réinitialiser le wizard ?")) return;
          setCurrentStep(1);
          setStep1Valid(false);
          setStep2Valid(false);
          setStep3Valid(false);
          setStep4Valid(false);
          setStep5Valid(false);
          setCentreDetails(null);
          setWizardData(initialWizardData);
        }}
        isLastStep={currentStep === 5}
      />

      <Toaster position="top-right" />
    </div>
  );
}

