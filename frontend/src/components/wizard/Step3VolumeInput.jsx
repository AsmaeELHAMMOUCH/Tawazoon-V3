import React, { useEffect, useRef } from "react";
import { Package, Upload, Download, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BandoengGrid from "@/components/centres_uniq/BandoengGrid";


export default function Step3VolumeInput({
    data,
    onDataChange,
    onValidationChange,
    onImportBandoeng,
    onDownloadTemplate,
}) {
    const fileInputRef = useRef(null);

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

        // Auto-calculation Logic
        const section = path[0]; // amana, cr, co
        const flow = path[1]; // depot/med or recu/arrive

        if (['amana', 'cr', 'co'].includes(section)) {
            // Global Modified -> Calculate Local & Axes
            if (lastKey === "global") {
                const globalVal = parseFloat(String(value).replace(',', '.')) || 0;

                let pctLocal = 0;
                let pctAxes = 0;

                // Decoupled Logic: Use specific percentages for each flux
                const axesKey = `${section}_pctAxesArrivee`;
                const localKey = `${section}_pctAxesDepart`;

                pctAxes = Number(data[axesKey] !== undefined ? data[axesKey] : (data.pctAxesArrivee || 0));
                pctLocal = Number(data[localKey] !== undefined ? data[localKey] : (data.pctAxesDepart || 0));

                if (current.local !== undefined && current.axes !== undefined) {
                    const localVal = Math.round(globalVal * (pctLocal / 100));
                    const axesVal = Math.round(globalVal * (pctAxes / 100));
                    current.local = localVal.toString();
                    current.axes = axesVal.toString();
                }
            }

            // Local or Axes Modified -> Recalculate Global
            if (lastKey === "local" || lastKey === "axes") {
                const localVal = parseFloat(String(current.local || 0).replace(',', '.')) || 0;
                const axesVal = parseFloat(String(current.axes || 0).replace(',', '.')) || 0;
                current.global = Math.round(localVal + axesVal).toString();
            }
        }

        onDataChange({ ...data, gridValues: newGridValues });
    };

    // Handle file import
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (onImportBandoeng) {
            onImportBandoeng(file);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Validation: at least some volume data entered
    useEffect(() => {
        const hasData = data.gridValues && Object.keys(data.gridValues).length > 0;
        onValidationChange(hasData);
    }, [data.gridValues, onValidationChange]);

    return (
        <div className="wizard-step-content space-y-4 p-4 text-xs">
            <div className="text-center mb-1">
                <h2 className="text-lg font-bold text-slate-800 mb-0">
                    Saisie des Volumes
                </h2>
                <p className="text-xs text-slate-500">
                    Saisissez manuellement ou importez les volumes depuis un fichier Excel
                </p>
            </div>

            <div className="max-w-6xl mx-auto space-y-3">
                {/* Import/Export Actions */}
                <Card className="wizard-card compact-card">
                    <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Package className="w-3.5 h-3.5" />
                                <span className="font-medium">Actions rapides</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileSelect}
                                />
                                <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    variant="outline"
                                    size="sm"
                                    className="text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200 h-7 text-xs px-2"
                                >
                                    <Upload className="w-3.5 h-3.5 mr-1" />
                                    Importer Excel
                                </Button>
                                <Button
                                    onClick={onDownloadTemplate}
                                    variant="outline"
                                    size="sm"
                                    className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 h-7 text-xs px-2"
                                >
                                    <Download className="w-3.5 h-3.5 mr-1" />
                                    Télécharger Modèle
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bandoeng Grid */}
                <Card className="wizard-card shadow-sm border border-slate-200">
                    <CardContent className="p-2 overflow-hidden rounded-lg">
                        <BandoengGrid
                            gridValues={data.gridValues || {}}
                            handleGridChange={handleGridChange}
                            pctAxesArrivee={data.pctAxesArrivee || 0}
                            pctAxesDepart={data.pctAxesDepart || 100}
                        />
                    </CardContent>
                </Card>

                {/* Info Message
                <div className="flex items-start gap-2 text-blue-600 text-[10px] p-2 bg-blue-50/50 rounded border border-blue-100">
                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                    <div>
                        <span className="font-semibold mr-1">Conseil:</span>
                        <span className="text-blue-700/80">
                            Saisie manuelle ou import Excel. Calculs auto selon % définis.
                        </span>
                    </div>
                </div> */}
            </div>
        </div>
    );
}
