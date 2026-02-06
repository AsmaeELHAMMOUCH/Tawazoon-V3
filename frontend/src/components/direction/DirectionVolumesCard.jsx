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

                let centersFound = [];
                const fluxMap = { "AMANA": 1, "CO": 2, "CR": 3, "E-BARKIA": 4, "LRH": 5 };

                // MAPPING DES PARAMÈTRES (Libellé Excel -> Clé Simulation)
                const paramMap = {
                    "Productivité": "productivite",
                    "Temps Mort": "temps_mort",
                    "Compl. Circulaire": "coeff_circ",
                    "Compl. Géographique": "coeff_geo",
                    "Capacité Nette": "capacite_nette",
                    "Nb Colis/Sac": "colis_amana_par_sac",
                    "% En Dehors": "ed_percent",
                    "% Axes Arrivée": "pct_axes_arr",
                    "% Axes Départ": "pct_axes_dep",
                    "% Collecte": "pct_collecte",
                    "% Retour": "pct_retour",
                    "Nb CO/Sac": "courriers_co_par_sac",
                    "Nb CR/Sac": "courriers_cr_par_sac",
                    "CR/Caisson": "cr_par_caisson"
                };

                wb.SheetNames.forEach(sheetName => {
                    if (sheetName === "Guide") return; // Ignorer feuille guide

                    const ws = wb.Sheets[sheetName];
                    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
                    if (!data || data.length === 0) return;

                    let currentCentre = null;
                    let lastSection = ""; // 'A'=Arr, 'B'=Guichet, 'C'=Dep, 'D'=Params

                    // Helper Nettoyage
                    const cleanVal = (v) => {
                        if (typeof v === 'number') return v;
                        if (!v) return 0;
                        const s = String(v).replace(/\s/g, '').replace(',', '.').replace('%', '');
                        return parseFloat(s) || 0;
                    };

                    for (let i = 0; i < data.length; i++) {
                        const row = data[i];
                        const cell0 = String(row[0] || "").trim();
                        const cell0Upper = cell0.toUpperCase();

                        // 1. DÉTECTION NOUVEAU CENTRE
                        // Regex pour détecter "Nom du Centre" ou "Centre" de manière souple
                        const isCentreHeader = /^(nom\s*du\s*centre|centre)\s*[:]/i.test(cell0);

                        if (isCentreHeader || (cell0Upper.startsWith("CENTRE") && !sheetName.includes("Import"))) {
                            // Sauvegarde du précédent
                            if (currentCentre) centersFound.push(currentCentre);

                            let rawName = cell0.replace(/^(nom\s*du\s*centre|centre)\s*[:]/i, "").trim();

                            // Si le nom est dans la colonne suivante (B)
                            if ((!rawName || rawName === "") && row[1]) {
                                rawName = String(row[1]).trim();
                            }

                            let cid = null;
                            let cname = rawName;

                            // Extraction ID améliorée : Cherche "(ID: 123)" ou "ID:123" ou just "123" à la fin si format strict
                            const idMatch = rawName.match(/\(ID:\s*(\d+)\)/i);
                            if (idMatch) {
                                cid = parseInt(idMatch[1], 10);
                                cname = rawName.replace(idMatch[0], "").trim();
                            }

                            currentCentre = { centre_id: cid, nom_centre: cname || "Centre Inconnu", volumes: [], params: {} };
                            lastSection = "";
                            continue;
                        }

                        // Fallback: Si pas de "Nom du Centre" mais structure flux, on crée un container basé sur le nom de l'onglet
                        if (!currentCentre && (fluxMap[cell0Upper] || /FLUX\s*ARRIV(E|É)E/i.test(cell0))) {
                            // Essayer de récupérer l'ID depuis le nom de l'onglet genre "Rabat (ID: 12)"
                            let sheetCid = null;
                            let sheetCname = sheetName;
                            const sheetIdMatch = sheetName.match(/\(ID:\s*(\d+)\)/i);
                            if (sheetIdMatch) {
                                sheetCid = parseInt(sheetIdMatch[1], 10);
                                sheetCname = sheetName.replace(sheetIdMatch[0], "").trim();
                            }
                            currentCentre = { centre_id: sheetCid, nom_centre: sheetCname, volumes: [], params: {} };
                        }

                        if (!currentCentre) continue;

                        // 2. DÉTECTION SECTIONS (Insensible à la casse et accents)
                        if (/FLUX\s*ARRIV(E|É)E/i.test(cell0)) { lastSection = 'A'; continue; }
                        if (/GUICHET/i.test(cell0)) { lastSection = 'B'; continue; }
                        if (/FLUX\s*D(E|É)PART/i.test(cell0)) { lastSection = 'C'; continue; }
                        if (/PARAM(E|È)TRE/i.test(cell0)) { lastSection = 'D'; continue; }

                        // 3. PARSING FLUX (A ou C)
                        const fluxId = fluxMap[cell0Upper];
                        if (fluxId) {
                            // Lecture des 5 segments (Colonnes B à F -> indices 1 à 5)
                            const vals = [1, 2, 3, 4, 5].map(idx => cleanVal(row[idx]));
                            const hasVal = vals.some(v => v > 0);

                            if (hasVal) {
                                if (lastSection === 'C') {
                                    // Section C: Flux Départ (Valeurs en 1-5)
                                    vals.forEach((v, idx) => {
                                        if (v > 0) currentCentre.volumes.push({ flux_id: fluxId, sens_id: 3, segment_id: idx + 1, volume: v });
                                    });
                                } else {
                                    // Section A ou Format Wide: Flux Arrivée (Valeurs en 1-5)
                                    vals.forEach((v, idx) => {
                                        if (v > 0) currentCentre.volumes.push({ flux_id: fluxId, sens_id: 1, segment_id: idx + 1, volume: v });
                                    });

                                    // Si Format Wide (Colonne 8-12 pour Départ)
                                    if (lastSection !== 'A' && lastSection !== 'C') {
                                        [8, 9, 10, 11, 12].forEach((colIdx, segIdx) => {
                                            const v = cleanVal(row[colIdx]);
                                            if (v > 0) currentCentre.volumes.push({ flux_id: fluxId, sens_id: 3, segment_id: segIdx + 1, volume: v });
                                        });
                                    }
                                }
                            }

                            // Si Format Wide (Guichet sur la ligne du flux?) -> rare mais possible
                            // Ici on ignore pour éviter doublons avec Section B
                            continue;
                        }

                        // 4. PARSING GUICHET (Section B, ligne "Volume")
                        if (lastSection === 'B' && cell0 === "Volume") {
                            const dep = cleanVal(row[1]);
                            const rec = cleanVal(row[2]);
                            if (dep > 0) currentCentre.volumes.push({ sens_id: 2, segment_id: 6, volume: dep });
                            if (rec > 0) currentCentre.volumes.push({ sens_id: 2, segment_id: 7, volume: rec });
                            continue;
                        }

                        // 5. PARSING PARAMÈTRES (Section D ou Lignes isolées)
                        const pKey = Object.keys(paramMap).find(k => cell0.startsWith(k));
                        if (pKey) {
                            const val = cleanVal(row[1]);
                            currentCentre.params[paramMap[pKey]] = val;
                        }
                    }

                    // Push le dernier
                    if (currentCentre) centersFound.push(currentCentre);
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
                                            <p className="text-[9px] text-slate-500">{centre.volumes?.length || 0} volumes extraits</p>
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
        try {
            // Créer un nouveau workbook
            const wb = XLSX.utils.book_new();

            // Préparer les données du template avec les centres de la direction
            const templateData = [
                // Titre
                ["IMPORT VOLUMES - CENTRES DE LA DIRECTION"],
                ["Remplissez les volumes pour chaque centre ci-dessous"],
                ["Les centres sont pré-remplis avec les centres de votre direction"],
                [],
            ];

            // Ajouter chaque centre
            centres.forEach((centre, index) => {
                if (index > 0) {
                    templateData.push([]);
                    templateData.push([]);
                }

                templateData.push([`=== CENTRE ${index + 1} ===`]);
                templateData.push(["Nom du Centre:", `${centre.label || centre.nom || ""} (ID: ${centre.id})`]);
                templateData.push([]);

                // SECTION A : FLUX ARRIVÉE
                templateData.push(["A) FLUX ARRIVÉE"]);
                templateData.push(["FLUX \\ SEGMENT", "GLOBAL", "PART.", "PRO", "DIST.", "AXES"]);
                templateData.push(["Amana", "", "", "", "", ""]);
                templateData.push(["CO", "", "", "", "", ""]);
                templateData.push(["CR", "", "", "", "", ""]);
                templateData.push(["E-Barkia", "", "", "", "", ""]);
                templateData.push(["LRH", "", "", "", "", ""]);
                templateData.push([]);

                // SECTION B : GUICHET
                templateData.push(["B) GUICHET"]);
                templateData.push(["OPÉRATION", "DÉPÔT", "RÉCUP."]);
                templateData.push(["Volume", "", ""]);
                templateData.push([]);

                // SECTION C : FLUX DÉPART
                templateData.push(["C) FLUX DÉPART"]);
                templateData.push(["FLUX \\ SEGMENT", "GLOBAL", "PART.", "PRO", "DIST.", "AXES"]);
                templateData.push(["Amana", "", "", "", "", ""]);
                templateData.push(["CO", "", "", "", "", ""]);
                templateData.push(["CR", "", "", "", "", ""]);
                templateData.push(["E-Barkia", "", "", "", "", ""]);
                templateData.push(["LRH", "", "", "", "", ""]);
            });

            // Si aucun centre, ajouter un exemple
            if (centres.length === 0) {
                templateData.push(["=== CENTRE EXEMPLE ==="]);
                templateData.push(["Nom du Centre:", "Centre Exemple"]);
                templateData.push([]);
                templateData.push(["A) FLUX ARRIVÉE"]);
                templateData.push(["FLUX \\ SEGMENT", "GLOBAL", "PART.", "PRO", "DIST.", "AXES"]);
                templateData.push(["Amana", "", "", "", "", ""]);
                templateData.push(["CO", "", "", "", "", ""]);
                templateData.push(["CR", "", "", "", "", ""]);
                templateData.push(["E-Barkia", "", "", "", "", ""]);
                templateData.push(["LRH", "", "", "", "", ""]);
                templateData.push([]);
                templateData.push(["B) GUICHET"]);
                templateData.push(["OPÉRATION", "DÉPÔT", "RÉCUP."]);
                templateData.push(["Volume", "", ""]);
                templateData.push([]);
                templateData.push(["C) FLUX DÉPART"]);
                templateData.push(["FLUX \\ SEGMENT", "GLOBAL", "PART.", "PRO", "DIST.", "AXES"]);
                templateData.push(["Amana", "", "", "", "", ""]);
                templateData.push(["CO", "", "", "", "", ""]);
                templateData.push(["CR", "", "", "", "", ""]);
                templateData.push(["E-Barkia", "", "", "", "", ""]);
                templateData.push(["LRH", "", "", "", "", ""]);
            }

            // Créer la feuille
            const ws = XLSX.utils.aoa_to_sheet(templateData);

            // Définir les largeurs de colonnes
            ws['!cols'] = [
                { wch: 20 },  // A
                { wch: 12 },  // B
                { wch: 12 },  // C
                { wch: 12 },  // D
                { wch: 12 },  // E
                { wch: 12 },  // F
            ];

            // Ajouter la feuille au workbook
            XLSX.utils.book_append_sheet(wb, ws, "Import Volumes");

            // Créer la feuille "Guide"
            const guideData = [
                ["GUIDE DE REMPLISSAGE"],
                [],
                ["1. CENTRES PRÉ-REMPLIS"],
                ["", "Les centres de votre direction sont déjà listés."],
                ["", "Vous n'avez qu'à remplir les volumes pour chaque centre."],
                [],
                ["2. STRUCTURE DES DONNÉES"],
                ["", "Pour chaque centre, 3 sections :"],
                [],
                ["A) FLUX ARRIVÉE", "Matrice 5 flux × 5 segments"],
                ["", "  Flux : Amana, CO, CR, E-Barkia, LRH"],
                ["", "  Segments : GLOBAL, PART., PRO, DIST., AXES"],
                [],
                ["B) GUICHET", "2 opérations uniquement"],
                ["", "  - DÉPÔT : Volume des dépôts"],
                ["", "  - RÉCUP. : Volume des récupérations"],
                [],
                ["C) FLUX DÉPART", "Même matrice que Flux Arrivée"],
                ["", "  Flux : Amana, CO, CR, E-Barkia, LRH"],
                ["", "  Segments : GLOBAL, PART., PRO, DIST., AXES"],
                [],
                ["3. RÈGLES DE SAISIE"],
                ["", "✓ NE PAS modifier les noms de centres"],
                ["", "✓ Saisir uniquement des nombres entiers ou décimaux"],
                ["", "✓ Laisser vide si volume = 0"],
                ["", "✓ Ne pas modifier la structure du tableau"],
                [],
                ["4. MAPPING DES SEGMENTS"],
                ["GLOBAL", "Volume global non segmenté"],
                ["PART.", "Segment Particuliers"],
                ["PRO", "Segment Professionnels"],
                ["DIST.", "Segment Distribution"],
                ["AXES", "Segment Axes"],
            ];

            const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
            wsGuide['!cols'] = [
                { wch: 25 },
                { wch: 50 },
            ];
            XLSX.utils.book_append_sheet(wb, wsGuide, "Guide");

            // Télécharger le fichier
            const directionName = centres.length > 0 ? centres[0].direction || "Direction" : "Direction";
            XLSX.writeFile(wb, `Template_Volumes_${directionName}_${new Date().toISOString().split('T')[0]}.xlsx`);

        } catch (error) {
            console.error('Erreur lors de la génération du template:', error);
        }
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
