import React, { useState, useEffect } from "react";
import { Package, Mail, Archive, LayoutGrid, Settings2, Info, Download, UploadCloud, AlertTriangle, FileCheck } from "lucide-react";
import * as XLSX from "xlsx";
import { n, numOrNull } from "../../utils/formatters";

// --- Styled Components ---
const SectionTitle = ({ icon: Icon, label, color = "text-[#005EA8]" }) => (
    <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className={`text-[11px] font-bold uppercase tracking-wider ${color}`}>{label}</span>
    </div>
);

const VolumeInput = ({ value, onChange, disabled }) => (
    <input
        type="number"
        min="0"
        className={`
        w-full h-7 text-[11px] text-center border rounded focus:ring-1 focus:ring-[#005EA8] focus:border-[#005EA8] outline-none transition-colors
        ${disabled ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-white border-slate-300 text-slate-700'}
      `}
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="-"
        disabled={disabled}
    />
);

export default function DirectionVolumesCard({
    onSimulate,
    loading,
    lastImportStatus
}) {
    // We keep local state for "Global" volumes if user wants to use manual input instead of file drop
    // But for Direction view, it's mostly about importing an aggregation or setting global params.
    // As per requirements: "Import Excel + template".

    // We will mimic the existing "ParametresVolume" structure but simplified/compact
    // Actually, in Direction Mode, usually we import a file that contains volumes for ALL centres.
    // The previous code had a file input. We should restore that feature properly.

    const [importMsg, setImportMsg] = useState(null);
    const fileInputRef = React.useRef(null);

    const handleDownloadTemplate = () => {
        const headers = [
            "Nom du Centre",
            "Sacs / an",
            "Colis / an",
            "Courrier Ordinaire / an",
            "Courrier Recommandé / an",
            "E-Barkia / an",
            "LRH / an",
            "Amana / an"
        ];
        const sample = [{
            "Nom du Centre": "Centre Principal",
            "Sacs / an": 1000,
            "Colis / an": 500,
            "Courrier Ordinaire / an": 50000,
            "Courrier Recommandé / an": 2000,
            "E-Barkia / an": 100,
            "LRH / an": 50,
            "Amana / an": 300
        }];
        const ws = XLSX.utils.json_to_sheet(sample, { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Modèle Volumes");
        XLSX.writeFile(wb, "modele_import_volumes.xlsx");
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                // Validate columns
                const required = ["Nom du Centre", "Sacs / an"];
                const first = data[0] || {};
                const missing = required.filter(c => !(c in first));

                if (missing.length > 0 && data.length > 0) {
                    setImportMsg({ type: 'error', text: `Colonnes manquantes: ${missing.join(', ')}` });
                    return;
                }

                // Pass data up
                onSimulate(data);
                setImportMsg({ type: 'success', text: `${data.length} lignes chargées avec succès.` });
            } catch (err) {
                console.error(err);
                setImportMsg({ type: 'error', text: "Erreur lecture fichier." });
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-50 text-[#005EA8] p-1.5 rounded">
                        <Archive size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Paramètres & Volumes</h3>
                        <p className="text-[10px] text-slate-500">Importez les données volumétriques pour la simulation</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#005EA8] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                        <Download size={14} />
                        Modèle
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-[#005EA8] hover:bg-[#0063A6] rounded-lg transition-colors shadow-sm"
                    >
                        <UploadCloud size={14} />
                        Importer Masse
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.osd" onChange={handleFileUpload} />
                </div>
            </div>

            <div className="p-4">
                {/* Feedback Message */}
                {(importMsg || lastImportStatus) && (
                    <div className={`text-[11px] px-3 py-2 rounded border mb-4 flex items-center gap-2 ${(importMsg?.type === 'error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
                        }`}>
                        {importMsg?.type === 'error' ? <AlertTriangle size={14} /> : <FileCheck size={14} />}
                        {importMsg?.text || lastImportStatus}
                    </div>
                )}

                {/* Manual Inputs / Ratios Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Just visual indicators or simple manual inputs if needed in future */}
                    <div className="col-span-3 text-[11px] text-slate-500 flex items-center gap-2 bg-slate-50 p-2 rounded">
                        <Info size={14} />
                        L'import Excel doit contenir une colonne <strong>"Nom du Centre"</strong> correspondant exactement aux libellés des centres.
                    </div>
                </div>
            </div>
        </div>
    );
}
