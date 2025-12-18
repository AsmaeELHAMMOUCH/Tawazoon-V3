import React, { useState, useRef, useMemo } from "react";
import {
    Archive, Download, UploadCloud,
    AlertTriangle, FileCheck, X, CheckCircle2, Play, FileSpreadsheet
} from "lucide-react";
import * as XLSX from "xlsx";
import { fmt } from "../../utils/formatters";

// --- Components Helpers ---

const StepIndicator = ({ step, current }) => {
    const isCompleted = step < current;
    const isCurrent = step === current;

    return (
        <div className={`flex items-center gap-1.5 ${isCurrent ? "text-[#005EA8]" : isCompleted ? "text-emerald-600" : "text-slate-400"}`}>
            <div className={`
                w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border
                ${isCurrent ? "border-[#005EA8] bg-blue-50" : isCompleted ? "border-emerald-600 bg-emerald-50" : "border-slate-300 bg-white"}
            `}>
                {isCompleted ? <CheckCircle2 size={10} /> : step}
            </div>
        </div>
    );
};

const ImportModal = ({ isOpen, onClose, onValidate }) => {
    const [step, setStep] = useState(1);
    const [fileData, setFileData] = useState([]);
    const [fileName, setFileName] = useState("");
    const [errors, setErrors] = useState([]);
    const fileInputRef = useRef(null);

    React.useEffect(() => {
        if (isOpen) {
            setStep(1);
            setFileData([]);
            setErrors([]);
            setFileName("");
        }
    }, [isOpen]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                const required = ["Nom du Centre"];
                const first = data[0] || {};
                const missing = required.filter(c => !(c in first));

                if (missing.length > 0) {
                    setErrors([`Colonnes manquantes : ${missing.join(', ')}`]);
                } else if (data.length === 0) {
                    setErrors(["Le fichier semble vide."]);
                } else {
                    setErrors([]);
                    setFileData(data);
                    setStep(2);
                }
            } catch (err) {
                setErrors(["Erreur de lecture du fichier Excel."]);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleConfirm = () => {
        onValidate(fileData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <UploadCloud size={14} className="text-[#005EA8]" />
                        Assistant Importation
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Steps */}
                <div className="px-3 py-2 bg-white border-b border-slate-100 flex justify-center gap-6">
                    <div className="flex items-center gap-1.5">
                        <StepIndicator step={1} current={step} />
                        <span className={`text-[9px] font-semibold uppercase ${step >= 1 ? "text-slate-700" : "text-slate-400"}`}>Fichier</span>
                    </div>
                    <div className="w-6 h-px bg-slate-200 self-center"></div>
                    <div className="flex items-center gap-1.5">
                        <StepIndicator step={2} current={step} />
                        <span className={`text-[9px] font-semibold uppercase ${step >= 2 ? "text-slate-700" : "text-slate-400"}`}>Validation</span>
                    </div>
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col items-center justify-center min-h-[160px]">
                    {step === 1 && (
                        <div
                            className="w-full border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center hover:border-[#005EA8]/50 hover:bg-slate-50 transition-all cursor-pointer group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="bg-blue-50 text-[#005EA8] p-2 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                <FileSpreadsheet size={20} />
                            </div>
                            <p className="text-xs font-medium text-slate-700 mb-0.5">Cliquez pour choisir un fichier</p>
                            <p className="text-[9px] text-slate-400">Excel (.xlsx) uniquement</p>
                            <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />

                            {errors.length > 0 && (
                                <div className="mt-3 bg-red-50 text-red-600 px-2 py-1.5 rounded text-[10px] flex items-center gap-1.5 w-full">
                                    <AlertTriangle size={12} />
                                    <span>{errors[0]}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="w-full space-y-3">
                            <div className="bg-emerald-50 border border-emerald-100 rounded-md p-2 flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-emerald-600 mt-0.5" />
                                <div>
                                    <p className="text-[11px] font-bold text-emerald-800">Prêt à importer</p>
                                    <p className="text-[10px] text-emerald-700">
                                        <strong>{fileData.length}</strong> lignes détectées.
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-between gap-2 mt-4">
                                <button
                                    onClick={() => setStep(1)}
                                    className="px-3 py-1.5 text-[10px] font-medium text-slate-500 hover:bg-slate-50 rounded border border-slate-200 transition-colors"
                                >
                                    Retour
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#005EA8] hover:bg-[#004e8a] text-white text-[10px] font-bold rounded shadow-sm transition-transform active:scale-95"
                                >
                                    <Play size={10} fill="currentColor" />
                                    Importer
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function DirectionVolumesCard({
    onSimulate,
    loading,
    lastImportStatus
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [importMsg, setImportMsg] = useState(lastImportStatus ? { type: 'success', text: lastImportStatus } : null);

    const handleDownloadTemplate = () => {
        const headers = ["Nom du Centre", "Sacs / an", "Colis / an", "Courrier Ordinaire / an", "Courrier Recommandé / an", "E-Barkia / an", "LRH / an", "Amana / an"];
        const sample = [{ "Nom du Centre": "Centre Principal", "Sacs / an": 1000, "Colis / an": 500 }];
        const ws = XLSX.utils.json_to_sheet(sample, { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Modèle");
        XLSX.writeFile(wb, "modele_volumes.xlsx");
    };

    const handleValidateImport = (data) => {
        onSimulate(data);
        setImportMsg({ type: 'success', text: `${data.length} volumes mis à jour` });
    };

    return (
        <React.Fragment>
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
                {/* Header Compact */}
                <div className="bg-slate-50/50 px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Archive size={14} className="text-[#005EA8]" />
                        <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">Imports</h3>
                    </div>
                    <button
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-1 text-[9px] font-semibold text-slate-400 hover:text-[#005EA8] transition-colors"
                        title="Télécharger le modèle"
                    >
                        <Download size={10} />
                        Modèle
                    </button>
                </div>

                {/* Body Compact */}
                <div className="p-2 flex-1 flex flex-col justify-center gap-2">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        disabled={loading}
                        className="flex-1 w-full min-h-[50px] border border-dashed border-blue-200 bg-blue-50/30 hover:bg-blue-50/80 rounded-lg flex flex-col items-center justify-center gap-1 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="bg-white p-1 rounded-full shadow-sm border border-blue-100 group-hover:scale-110 transition-transform">
                            <UploadCloud size={14} className="text-[#005EA8]" />
                        </div>
                        <span className="text-[10px] font-bold text-[#005EA8]">
                            Importer un fichier
                        </span>
                    </button>

                    {/* Status Message */}
                    {importMsg ? (
                        <div className={`text-[9px] px-2 py-1 rounded border flex items-center gap-1.5 ${(importMsg.type === 'error') ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            }`}>
                            {importMsg.type === 'error' ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                            <span className="truncate font-medium">{importMsg.text}</span>
                        </div>
                    ) : (
                        <div className="text-[9px] text-center text-slate-400 py-1">
                            Aucun import récent
                        </div>
                    )}
                </div>
            </div>

            <ImportModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onValidate={handleValidateImport}
            />
        </React.Fragment>
    );
}
