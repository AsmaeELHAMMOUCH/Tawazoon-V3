import React, { useEffect } from "react";
import { Package, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AmanaVolumeGrid, StandardVolumeGrid } from "@/components/centres_uniq/BandoengGrid";


export default function Step3VolumeInput({
    data,
    onDataChange,
    onValidationChange,
}) {

    // Helper to calculate sub-details for Standard (CR/CO) or AMANA Local volume
    const syncStandardDetails = (newGridValues, fluxKey, flow, subKey, localValue) => {
        const localVal = parseFloat(String(localValue).replace(',', '.')) || 0;
        const pctCollecte = Number(data[`${fluxKey}_pctCollecte`] !== undefined ? data[`${fluxKey}_pctCollecte`] : (data.pctCollecte || 0));
        const pctMarche = Number(data[`${fluxKey}_pctMarcheOrdinaire`] !== undefined ? data[`${fluxKey}_pctMarcheOrdinaire`] : (data.pctMarcheOrdinaire || 0));
        const pctGuichet = Number(data[`${fluxKey}_pctGuichet`] !== undefined ? data[`${fluxKey}_pctGuichet`] : (data.pctGuichet || 0));

        const collecte = Math.round(localVal * (pctCollecte / 100));
        const marche = Math.round(localVal * (pctMarche / 100));
        const guichet = Math.round(localVal * (pctGuichet / 100));

        if (!newGridValues[fluxKey].localDetails) newGridValues[fluxKey].localDetails = {};
        const detailKey = subKey ? `${flow}_${subKey}` : flow;
        newGridValues[fluxKey].localDetails[detailKey] = { guichet, collecte, marche };
    };

    // Handle grid value changes
    const handleGridChange = (path, value) => {
        const newGridValues = { ...data.gridValues };

        // Navigate to the parent object
        let current = newGridValues;
        for (let i = 0; i < path.length - 1; i++) {
            current[path[i]] = { ...current[path[i]] };
            current = current[path[i]];
        }

        const lastKey = path[path.length - 1];
        current[lastKey] = value;

        // Auto-calculation Logic (Global/Local/Axes)
        const section = path[0]; // amana, cr, co

        // AMANA SPECIFIC LOGIC
        if (section === 'amana') {
            // Case 1: Manual update of a sub-detail (Guichet, Collecte, or Marche)
            if (path[1] === "localDetails") {
                const combinedKey = path[2]; // e.g. "depot_gc"
                const [flow, group] = combinedKey.split('_');

                // Then sum and update Local
                const details = newGridValues.amana.localDetails[combinedKey] || {};
                const localSum = (parseFloat(details.guichet) || 0) + 
                                (parseFloat(details.collecte) || 0) + 
                                (parseFloat(details.marche) || 0);
                
                // Update Local for this section
                const flowObj = flow === 'depot' ? 'depot' : 'recu';
                newGridValues.amana[flowObj][group].local = localSum.toString();
                
                // Update Global for this section
                const axesVal = parseFloat(newGridValues.amana[flowObj][group].axes || 0);
                newGridValues.amana[flowObj][group].global = Math.round(localSum + axesVal).toString();
            }
            
            // Case 2: Global or Local update (Step 2 % propagation)
            else if (path.length >= 4) { // amana -> flow -> group -> lastKey
                const flow = path[1]; // depot or recu
                const group = path[2]; // gc or part

                if (lastKey === "global") {
                    const globalVal = parseFloat(String(value).replace(',', '.')) || 0;
                    const pctAxes = Number(data.amana_pctAxesArrivee !== undefined ? data.amana_pctAxesArrivee : (data.pctAxesArrivee || 0));
                    const pctLocal = Number(data.amana_pctAxesDepart !== undefined ? data.amana_pctAxesDepart : (data.pctAxesDepart || 0));

                    const localVal = Math.round(globalVal * (pctLocal / 100));
                    const axesVal = Math.round(globalVal * (pctAxes / 100));
                    
                    current.local = localVal.toString();
                    current.axes = axesVal.toString();

                    syncStandardDetails(newGridValues, "amana", flow, group, localVal);
                }

                if (lastKey === "local") {
                    const localVal = parseFloat(String(value).replace(',', '.')) || 0;
                    const axesVal = parseFloat(String(current.axes || 0).replace(',', '.')) || 0;
                    current.global = Math.round(localVal + axesVal).toString();

                    syncStandardDetails(newGridValues, "amana", flow, group, localVal);
                }

                if (lastKey === "axes") {
                    const localVal = parseFloat(String(current.local || 0).replace(',', '.')) || 0;
                    const axesVal = parseFloat(String(value).replace(',', '.')) || 0;
                    current.global = Math.round(localVal + axesVal).toString();
                }
            }
        } 
        // OTHER FLUX LOGIC (CR, CO)
        else if (['cr', 'co'].includes(section)) {
            const flow = path[1]; // med or arrive

            if (lastKey === "global") {
                const globalVal = parseFloat(String(value).replace(',', '.')) || 0;
                const axesKey = `${section}_pctAxesArrivee`;
                const localKey = `${section}_pctAxesDepart`;
                const pctAxes = Number(data[axesKey] !== undefined ? data[axesKey] : (data.pctAxesArrivee || 0));
                const pctLocal = Number(data[localKey] !== undefined ? data[localKey] : (data.pctAxesDepart || 0));

                if (current.local !== undefined && current.axes !== undefined) {
                    const localVal = Math.round(globalVal * (pctLocal / 100));
                    current.local = localVal.toString();
                    current.axes = Math.round(globalVal * (pctAxes / 100)).toString();

                    syncStandardDetails(newGridValues, section, flow, null, localVal);
                }
            }
            if (lastKey === "local") {
                const localVal = parseFloat(String(value).replace(',', '.')) || 0;
                const axesVal = parseFloat(String(current.axes || 0).replace(',', '.')) || 0;
                current.global = Math.round(localVal + axesVal).toString();

                syncStandardDetails(newGridValues, section, flow, null, localVal);
            }
            if (lastKey === "axes") {
                const localVal = parseFloat(String(current.local || 0).replace(',', '.')) || 0;
                const axesVal = parseFloat(String(value).replace(',', '.')) || 0;
                current.global = Math.round(localVal + axesVal).toString();
            }
            // Case: Manual update of sub-detail for CR/CO
            if (path[1] === "localDetails") {
                const flowKey = path[2]; // e.g. "med" or "arrive"
                
                // Then sum and update Local
                const details = newGridValues[section].localDetails[flowKey] || {};
                const localSum = (parseFloat(details.guichet) || 0) + 
                                (parseFloat(details.collecte) || 0) + 
                                (parseFloat(details.marche) || 0);
                
                // Update Local for this section
                newGridValues[section][flowKey].local = localSum.toString();
                
                // Update Global for this section
                const axesVal = parseFloat(newGridValues[section][flowKey].axes || 0);
                newGridValues[section][flowKey].global = Math.round(localSum + axesVal).toString();
            }
        }

        onDataChange({ ...data, gridValues: newGridValues });
    };

    // Validation: at least some volume data entered
    useEffect(() => {
        const hasData = data.gridValues && Object.keys(data.gridValues).length > 0;
        onValidationChange(hasData);
    }, [data.gridValues, onValidationChange]);

    return (
        <div className="wizard-step-content space-y-2 p-4 text-xs">
            <div className="flex items-center justify-center gap-3 mb-1.5 px-4 py-2 bg-gradient-to-r from-blue-50/60 via-white to-blue-50/60 border border-blue-100 rounded-xl shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#005EA8] to-[#48cae4] flex items-center justify-center shrink-0 shadow-sm">
                    <Package className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                    <h2 className="text-sm font-black text-[#0b3f6f] leading-none">Ventilation Automatique des Volumes</h2>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Lecture seule : ventilation calculée à partir des volumes et paramètres</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto space-y-2">
                {/* Actions Bar */}
                <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Info className="w-4 h-4 text-slate-400" />
                        <p className="text-[10px] leading-tight">
                            <span className="font-bold text-slate-700">Info :</span> Cette étape est en <span className="font-bold">lecture seule</span>. Les valeurs Global/Local/Axes sont calculées automatiquement selon les paramètres de l'étape précédente.
                        </p>
                    </div>
                </div>
                {/* SECTION 1: AMANA */}
                <div className="space-y-3">
                    <AmanaVolumeGrid 
                        gridValues={data.gridValues || {}} 
                        handleGridChange={null}
                    />
                </div>

                {/* SECTION 2: AUTRES PRESTATIONS */}
                <div className="space-y-3">
                    <StandardVolumeGrid 
                        gridValues={data.gridValues || {}} 
                        handleGridChange={null}
                    />
                </div>
            </div>
        </div>
    );
}
