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

export const ImportModal = ({ isOpen, onClose, onValidate }) => {
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

                wb.SheetNames.forEach(sheetName => {
                    if (sheetName === "Guide") return;

                    const ws = wb.Sheets[sheetName];
                    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
                    if (!data || data.length < 10) return;

                    const cleanVal = (v) => {
                        if (typeof v === 'number') return v;
                        if (!v) return 0;
                        const s = String(v).replace(/\s/g, '').replace(',', '.').replace('%', '');
                        return parseFloat(s) || 0;
                    };
                    const valRowCol = (r, c) => cleanVal(data[r]?.[c]);

                    const a1 = String(data[0]?.[0] || "");
                    let cid = null;
                    let cname = sheetName;
                    const idMatch = a1.match(/ID\s*:\s*(\d+)/i);
                    if (idMatch) cid = parseInt(idMatch[1], 10);
                    const nameMatch = a1.match(/CENTRE\s*:\s*(.*?)\s*\|/i);
                    if (nameMatch) cname = nameMatch[1].trim();

                    const grid_values = {
                        amana: {
                            depot: {
                                gc:   { global: valRowCol(4, 1), local: valRowCol(4, 2), axes: valRowCol(4, 3) },
                                part: { global: valRowCol(4, 4), local: valRowCol(4, 5), axes: valRowCol(4, 6) }
                            },
                            recu: {
                                gc:   { global: valRowCol(4, 7), local: valRowCol(4, 8), axes: valRowCol(4, 9) },
                                part: { global: valRowCol(4, 10), local: valRowCol(4, 11), axes: valRowCol(4, 12) }
                            }
                        },
                        cr: {
                            med:    { global: valRowCol(5, 1), local: valRowCol(5, 2), axes: valRowCol(5, 3) },
                            arrive: { global: valRowCol(5, 7), local: valRowCol(5, 8), axes: valRowCol(5, 9) }
                        },
                        co: {
                            med:    { global: valRowCol(6, 1), local: valRowCol(6, 2), axes: valRowCol(6, 3) },
                            arrive: { global: valRowCol(6, 7), local: valRowCol(6, 8), axes: valRowCol(6, 9) }
                        },
                        ebarkia: { med: valRowCol(7, 1), arrive: valRowCol(7, 7) },
                        lrh:     { med: valRowCol(8, 1), arrive: valRowCol(8, 7) }
                    };

                    const params = {};
                    for (let r = 11; r < data.length; r++) {
                        const key = String(data[r]?.[0] || "").trim();
                        const v = data[r]?.[2];
                        if (key && !key.startsWith("SECTION")) {
                             params[key] = cleanVal(v);
                        }
                    }

                    centersFound.push({
                         centre_id: cid,
                         nom_centre: cname,
                         volumes: [], // Non utilisé par process_national_simulation
                         grid_values: grid_values,
                         params: params,
                         _vCount: true
                    });
                });

                if (centersFound.length === 0) {
                    setErrors(["Aucun centre ou donnée valide trouvé."]);
                    return;
                }

                setErrors([]);
                setFileData(centersFound);
                setStep(2);

            } catch (err) {
                console.error("Erreur Import:", err);
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
                            <div className="bg-emerald-50 border border-emerald-100 rounded-md p-2 flex flex-col gap-2">
                                <div className="flex items-center gap-2 border-b border-emerald-200/50 pb-2">
                                    <CheckCircle2 size={16} className="text-emerald-600" />
                                    <div className="flex-1">
                                        <p className="text-[11px] font-bold text-emerald-800">Prêt à importer</p>
                                        <p className="text-[9px] text-emerald-600 font-medium">{fileData.length} centre(s) détecté(s)</p>
                                    </div>
                                </div>

                                <div className="max-h-[240px] overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                                    {fileData.map((centre, idx) => (
                                        <div key={idx} className="pl-2 border-l-2 border-emerald-300 py-1 bg-white/40 rounded-r hover:bg-emerald-100/40 transition-colors">
                                            <p className="text-[10px] font-bold text-slate-700 truncate">{centre.nom_centre}</p>
                                            <p className="text-[9px] text-slate-500">{centre._vCount ? "Volumes extraits avec succès" : (centre.volumes?.length || 0) + " volumes extraits"}</p>
                                        </div>
                                    ))}
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
    lastImportStatus,
    centres = [] // Ajout des centres en props
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [importMsg, setImportMsg] = useState(lastImportStatus ? { type: 'success', text: lastImportStatus } : null);

    const handleDownloadTemplate = () => {
        const directionId = centres.length > 0 ? (centres[0].direction_id || centres[0].region_id) : null;
        let url = `/api/template/national`;
        if (directionId) url = `/api/template/regional?region_id=${directionId}`;
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
        window.open(`${API_URL}${url}`, '_blank');
    };

    const handleValidateImport = (data) => {
        onSimulate(data);
        setImportMsg({ type: 'success', text: `${data.length} volumes mis à jour` });
    };

    return (
        <React.Fragment>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 relative overflow-hidden group">
                <div className="flex items-center justify-between gap-2 relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-50 p-1.5 rounded-lg border border-blue-100 shadow-sm shrink-0">
                            <Archive size={14} className="text-[#005EA8]" />
                        </div>
                        <div className="hidden 2xl:block">
                            <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide leading-none mb-0.5">Import</h4>
                            <p className="text-[9px] text-slate-400 font-medium">Volumes</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleDownloadTemplate} className="p-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-white hover:border-[#005EA8] hover:text-[#005EA8] text-slate-500 transition-all" title="Télécharger Modèle Excel">
                            <FileSpreadsheet size={14} />
                        </button>
                        <button onClick={() => setIsModalOpen(true)} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#005EA8] hover:bg-[#004e8a] text-white rounded-md shadow-sm hover:shadow transition-all active:scale-95 text-[10px] font-bold">
                            {loading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UploadCloud size={12} />}
                            <span className="hidden xl:inline">Importer</span>
                        </button>
                    </div>
                </div>
                {importMsg && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-[1px] flex items-center justify-center z-20 animate-in fade-in duration-300" onClick={() => setImportMsg(null)}>
                        <div className={`text-[9px] font-bold flex items-center gap-1 cursor-pointer ${importMsg.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                            {importMsg.type === 'error' ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                            {importMsg.text}
                        </div>
                    </div>
                )}
            </div>

            <ImportModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onValidate={handleValidateImport}
            />
        </React.Fragment>
    );
}
