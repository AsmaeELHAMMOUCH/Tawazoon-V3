import React, { useState, useRef, useMemo } from "react";
import {
    Archive, Info, Download, UploadCloud,
    AlertTriangle, FileCheck, X, ChevronRight,
    FileSpreadsheet, CheckCircle2, Play
} from "lucide-react";
import * as XLSX from "xlsx";
import { fmt } from "../../utils/formatters";

// --- Components Helpers ---

const StepIndicator = ({ step, current }) => {
    const isCompleted = step < current;
    const isCurrent = step === current;

    return (
        <div className={`flex items-center gap-2 ${isCurrent ? "text-[#005EA8]" : isCompleted ? "text-emerald-600" : "text-slate-400"}`}>
            <div className={`
                w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border
                ${isCurrent ? "border-[#005EA8] bg-blue-50" : isCompleted ? "border-emerald-600 bg-emerald-50" : "border-slate-300 bg-white"}
            `}>
                {isCompleted ? <CheckCircle2 size={14} /> : step}
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

    // Reset on open
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

                // Validation
                const required = ["Nom du Centre"]; // Minimal requirement
                const first = data[0] || {};
                const missing = required.filter(c => !(c in first));

                if (missing.length > 0) {
                    setErrors([`Colonnes manquantes : ${missing.join(', ')}`]);
                } else if (data.length === 0) {
                    setErrors(["Le fichier semble vide."]);
                } else {
                    setErrors([]);
                    setFileData(data);
                    setStep(2); // Go to Preview
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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <UploadCloud size={16} className="text-[#005EA8]" />
                        Assistant Importation
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Steps Bar */}
                <div className="px-4 py-3 bg-white border-b border-slate-100 flex justify-center gap-8">
                    <div className="flex items-center gap-2">
                        <StepIndicator step={1} current={step} />
                        <span className={`text-[10px] font-semibold uppercase ${step >= 1 ? "text-slate-700" : "text-slate-400"}`}>Téléchargement</span>
                    </div>
                    <div className="w-8 h-px bg-slate-200 self-center"></div>
                    <div className="flex items-center gap-2">
                        <StepIndicator step={2} current={step} />
                        <span className={`text-[10px] font-semibold uppercase ${step >= 2 ? "text-slate-700" : "text-slate-400"}`}>Validation</span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 min-h-[200px] flex flex-col items-center justify-center">
                    {step === 1 && (
                        <div
                            className="w-full border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center hover:border-[#005EA8]/50 hover:bg-slate-50 transition-all cursor-pointer group"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="bg-blue-50 text-[#005EA8] p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                <FileSpreadsheet size={24} />
                            </div>
                            <p className="text-sm font-medium text-slate-700 mb-1">Cliquer pour importer un fichier</p>
                            <p className="text-[10px] text-slate-400">Format accepté : .xlsx, .xls</p>
                            <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />

                            {errors.length > 0 && (
                                <div className="mt-4 bg-red-50 text-red-600 px-3 py-2 rounded text-xs flex items-center gap-2 w-full">
                                    <AlertTriangle size={14} />
                                    <span>{errors[0]}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="w-full space-y-4">
                            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-start gap-3">
                                <CheckCircle2 size={18} className="text-emerald-600 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-emerald-800">Fichier valide !</p>
                                    <p className="text-[10px] text-emerald-700 mt-0.5">
                                        Fichier : <strong>{fileName}</strong><br />
                                        Données détectées : <strong>{fileData.length} lignes</strong>
                                    </p>
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                                <p className="text-[10px] text-slate-500 font-medium mb-2 uppercase tracking-wide">Aperçu des données (3 premières lignes)</p>
                                <div className="space-y-1">
                                    {fileData.slice(0, 3).map((row, i) => (
                                        <div key={i} className="text-[10px] text-slate-600 truncate bg-white px-2 py-1 rounded border border-slate-100">
                                            {row["Nom du Centre"]} - Sacs: {row["Sacs / an"] || 0}
                                        </div>
                                    ))}
                                    {fileData.length > 3 && (
                                        <div className="text-[9px] text-slate-400 italic pl-1">
                                            + {fileData.length - 3} autres lignes...
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => setStep(1)}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                    Retour
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="flex items-center gap-2 px-4 py-1.5 bg-[#005EA8] hover:bg-[#004e8a] text-white text-xs font-bold rounded-lg shadow-sm transition-transform active:scale-95"
                                >
                                    <Play size={12} fill="currentColor" />
                                    Lancer la Simulation
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

    const handleValidateImport = (data) => {
        onSimulate(data);
        setImportMsg({ type: 'success', text: `${data.length} enregistrements importés.` });
    };

    return (
        <React.Fragment>
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
                <div className="bg-slate-50/50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-50 text-[#005EA8] p-1 rounded-md">
                            <Archive size={14} />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Imports & Volumes</h3>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-[#005EA8] bg-blue-50 hover:bg-blue-100 rounded-md transition-colors border border-blue-100"
                            title="Télécharger modèle Excel"
                        >
                            <Download size={12} />
                            Modèle
                        </button>
                    </div>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-center gap-3">
                    {/* Feedback Message */}
                    {importMsg && (
                        <div className={`text-[10px] px-2 py-1.5 rounded border flex items-center gap-2 ${(importMsg.type === 'error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                            {importMsg.type === 'error' ? <AlertTriangle size={12} /> : <FileCheck size={12} />}
                            <span className="truncate">{importMsg.text}</span>
                        </div>
                    )}

                    {!importMsg && (
                        <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 flex items-start gap-2">
                            <Info size={12} className="shrink-0 mt-0.5" />
                            <p className="leading-tight">Importez vos volumes pour mettre à jour la simulation.</p>
                        </div>
                    )}

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-bold text-white bg-[#005EA8] hover:bg-[#0063A6] rounded-lg transition-colors shadow-sm group"
                    >
                        <UploadCloud size={14} className="group-hover:scale-110 transition-transform" />
                        Nouvel Import
                    </button>

                    {loading && (
                        <div className="text-[9px] text-center text-slate-400 animate-pulse">
                            Simulation en cours...
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
