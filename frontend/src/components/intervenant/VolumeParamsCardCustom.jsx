"use client";
import React, { useState, useEffect } from "react";
import {
    Package,
    Download,
    FileUp,
    Gauge,
    Box,
    ShieldCheck,
    Microscope,
    Archive,
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const formatThousands = (value) => {
    if (value === "" || value === null || value === undefined) return "";
    const str = String(value).replace(/\s+/g, "");
    if (str === "" || isNaN(Number(str))) return "";
    return Number(str).toLocaleString("fr-FR").replace(/\u202F/g, " ");
};

const unformat = (str) => str.replace(/\s+/g, "");

export default function VolumeParamsCardCustom({
    Card,
    Input,
    loading,

    // States globaux
    amana,
    setAmana,
    colisAmanaParSac,
    setColisAmanaParSac,

    // Grille
    volumesFluxGrid,
    setVolumesFluxGrid,

    // Action
    onSimuler,
    centre,
    simDirty,

    // Paramètres Amana spécialisés
    edPercent,
    setEdPercent,
    pctRetenue,
    setPctRetenue,
    pctEchantillon,
    setPctEchantillon,
    pctSac,
    setPctSac,
}) {
    const baseInputClass =
        "text-xs text-center !px-1.5 !py-1 leading-none h-8 font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-300 disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed w-full";

    const tableInputStyle = { height: "30px", width: "100%" };

    // --- State Local pour Import / Export ---
    const [customGrid, setCustomGrid] = useState(() => {
        const arr = volumesFluxGrid?.arrivee?.amana || {};
        const dep = volumesFluxGrid?.depart?.amana || {};
        return {
            amana: {
                import: arr.part || "",
                export: dep.global || "",
            },
        };
    });

    // Synchro vers le parent
    useEffect(() => {
        if (setVolumesFluxGrid) {
            setVolumesFluxGrid({
                arrivee: { amana: { part: customGrid.amana.import } },
                depart: { amana: { global: customGrid.amana.export } },
                depotRecup: volumesFluxGrid?.depotRecup || {},
            });
        }
    }, [customGrid, setVolumesFluxGrid]);

    const updateCustom = (key, field, val) => {
        setCustomGrid((prev) => ({
            ...prev,
            [key]: { ...prev[key], [field]: val },
        }));
    };

    // --- Composant Input Milliers ---
    function ThousandInput({ value, onChange, className, ...rest }) {
        const [local, setLocal] = useState(() => formatThousands(value));

        useEffect(() => {
            setLocal(formatThousands(value));
        }, [value]);

        const handleChange = (e) => {
            setLocal(e.target.value.replace(/[^\d\s]/g, ""));
        };

        const handleBlur = () => {
            const num = unformat(local) === "" ? undefined : parseFloat(unformat(local));
            onChange && onChange(Number.isNaN(num) ? undefined : num);
            setLocal(formatThousands(num));
        };

        return (
            <Input
                value={local}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`${baseInputClass} ${className || ""}`}
                {...rest}
            />
        );
    }

    // --- Composant Paramètre Footer ---
    const ParamItem = ({
        label,
        value,
        onChange,
        icon: Icon,
        tone = "blue",
        isPercent = false,
    }) => {
        const toneStyles = {
            blue: "bg-blue-50 text-[#005EA8]",
            orange: "bg-orange-50 text-orange-600",
            emerald: "bg-emerald-50 text-emerald-700",
            indigo: "bg-indigo-50 text-indigo-700",
            purple: "bg-purple-50 text-purple-700",
        };

        return (
            <div className="flex items-center gap-1.5 min-w-[110px] flex-1">
                <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm ${toneStyles[tone]}`}
                >
                    <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col w-full items-center">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-tight text-center">
                        {label}
                    </label>
                    <div className="flex items-center justify-center w-full">
                        <input
                            type="number"
                            value={value ?? ""}
                            onChange={(e) =>
                                onChange(e.target.value === "" ? 0 : Number(e.target.value))
                            }
                            className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none w-full text-center"
                        />
                        {isPercent && (
                            <span className="text-[10px] text-slate-400 font-bold ml-0.5">%</span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // --- Excel Functions ---
    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Volumes");
        worksheet.columns = [
            { header: "Flux", key: "flux", width: 20 },
            { header: "Global", key: "global", width: 15 },
            { header: "Import", key: "import", width: 15 },
            { header: "Export", key: "export", width: 15 },
        ];
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        headerRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF005EA8" },
        };
        worksheet.addRow({
            flux: "Amana",
            global: amana || 0,
            import: customGrid.amana.import || 0,
            export: customGrid.amana.export || 0,
        });
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), "Modele_Volumes_Custom.xlsx");
    };

    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);
            const worksheet = workbook.getWorksheet(1);
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return;
                const fluxLabel = String(row.getCell(1).value || "").trim().toUpperCase();
                if (fluxLabel === "AMANA") {
                    const g = row.getCell(2).value;
                    const i = row.getCell(3).value;
                    const e = row.getCell(4).value;
                    if (g !== null) setAmana(Number(g));
                    updateCustom("amana", "import", i);
                    updateCustom("amana", "export", e);
                }
            });
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-3">
            {/* 📥 Barre d'outils Import / Export - Exactement comme VolumeParamsCard */}
            <div className="flex justify-end gap-2 mb-2">
                <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-50 hover:text-slate-800 transition-colors text-xs font-medium shadow-sm"
                >
                    <Download className="w-3.5 h-3.5" />
                    Modèle Excel
                </button>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded hover:bg-emerald-100 transition-colors text-xs font-semibold shadow-sm cursor-pointer">
                    <FileUp className="w-3.5 h-3.5" />
                    Importer Volumes
                    <input
                        type="file"
                        accept=".xlsx"
                        className="hidden"
                        onChange={handleImportExcel}
                    />
                </label>
            </div>

            {/* 2️⃣ Le Tableau Principal - Conteneur identique à VolumeParamsCard */}
            <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg p-2">
                <div className="rounded-lg border border-slate-200/60 bg-white shadow-sm overflow-hidden flex-1">
                    <table className="w-full text-[11px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                                <th className="px-4 py-2 text-left">Flux</th>
                                <th className="px-2 py-2 text-center w-32">Global</th>
                                <th className="px-2 py-2 text-center w-32 bg-blue-50/50 text-blue-700">
                                    Import
                                </th>
                                <th className="px-2 py-2 text-center w-32 bg-amber-50/50 text-amber-700">
                                    Export
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            <tr className="group hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-2 font-bold text-slate-600 flex items-center gap-2">
                                    <Package className="w-3.5 h-3.5 text-[#005EA8]" />
                                    Amana
                                </td>
                                <td className="px-2 py-1.5 ">
                                    <ThousandInput
                                        value={amana}
                                        onChange={setAmana}
                                        className="!font-bold !text-slate-900"
                                        style={tableInputStyle}
                                    />
                                </td>
                                <td className="px-2 py-1.5 bg-blue-50/5">
                                    <ThousandInput
                                        value={customGrid.amana.import}
                                        onChange={(v) => updateCustom("amana", "import", v)}
                                        className="!text-blue-700"
                                        style={tableInputStyle}
                                    />
                                </td>
                                <td className="px-2 py-1.5 bg-amber-50/5">
                                    <ThousandInput
                                        value={customGrid.amana.export}
                                        onChange={(v) => updateCustom("amana", "export", v)}
                                        className="!text-amber-700"
                                        style={tableInputStyle}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 3️⃣ Footer Sticky : 5 Paramètres Additionnels */}
            <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border border-slate-200/60 shadow-lg rounded-lg px-3 py-2 mt-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    {/* 1. Nbr Colis /Sac */}
                    <ParamItem
                        label="Nbr Colis /Sac"
                        value={colisAmanaParSac}
                        onChange={setColisAmanaParSac}
                        icon={Box}
                        tone="orange"
                    />

                    <div className="w-px h-8 bg-slate-100 hidden lg:block" />

                    {/* 2. % Retenue */}
                    <ParamItem
                        label="% Retenue"
                        value={pctRetenue}
                        onChange={setPctRetenue}
                        icon={ShieldCheck}
                        tone="purple"
                        isPercent
                    />

                    <div className="w-px h-8 bg-slate-100 hidden lg:block" />

                    {/* 3. % échantillon */}
                    <ParamItem
                        label="% échantillon"
                        value={pctEchantillon}
                        onChange={setPctEchantillon}
                        icon={Microscope}
                        tone="indigo"
                        isPercent
                    />

                    <div className="w-px h-8 bg-slate-100 hidden lg:block" />

                    {/* 4. % ED */}
                    <ParamItem
                        label="% ED"
                        value={edPercent}
                        onChange={setEdPercent}
                        icon={Archive}
                        tone="blue"
                        isPercent
                    />

                    <div className="w-px h-8 bg-slate-100 hidden lg:block" />

                    {/* 5. % SAC */}
                    <ParamItem
                        label="% SAC"
                        value={pctSac}
                        onChange={setPctSac}
                        icon={Package}
                        tone="emerald"
                        isPercent
                    />

                    {/* Bouton Simulation */}
                    <div className="flex items-center gap-4 ml-auto pl-4 border-l border-slate-100">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                État
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                                {loading?.simulation
                                    ? "Calcul..."
                                    : simDirty
                                        ? "Modifié"
                                        : "À jour"}
                            </span>
                        </div>
                        <button
                            onClick={onSimuler}
                            disabled={!centre || loading?.simulation}
                            className="px-5 py-2 rounded-full font-bold text-xs bg-gradient-to-r from-[#005EA8] to-blue-600 text-white hover:scale-105 active:scale-95 shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            <Gauge className="w-4 h-4" />
                            {loading?.simulation ? "CALCUL..." : "LANCER SIMULATION"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
