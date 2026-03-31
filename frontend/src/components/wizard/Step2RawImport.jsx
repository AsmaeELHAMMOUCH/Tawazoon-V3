import React, { useEffect, useMemo, useRef } from "react";
import { Upload, Download, FileSpreadsheet, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from "@/components/ui/table";

const toNum = (v) => parseFloat(String(v ?? "0").replace(",", ".")) || 0;
const fmt = (v) => Math.round(toNum(v)).toLocaleString("fr-FR");
const fmtInput = (v) => Math.round(toNum(v)).toLocaleString("fr-FR");
const parseInputToNumber = (value) => {
    if (value === null || value === undefined) return 0;
    const normalized = String(value)
        .replace(/\s/g, "")
        .replace(/\u00A0/g, "")
        .replace(/\u202F/g, "")
        .replace(/,/g, ".")
        .replace(/[^\d.-]/g, "");
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
};

function computeRawTotals(gridValues = {}) {
    const amanaTotal =
        toNum(gridValues?.amana?.depot?.gc?.global) +
        toNum(gridValues?.amana?.depot?.part?.global) +
        toNum(gridValues?.amana?.recu?.gc?.global) +
        toNum(gridValues?.amana?.recu?.part?.global);

    const crTotal =
        toNum(gridValues?.cr?.med?.global) +
        toNum(gridValues?.cr?.arrive?.global);

    const coTotal =
        toNum(gridValues?.co?.med?.global) +
        toNum(gridValues?.co?.arrive?.global);

    const lrhTotal = toNum(gridValues?.lrh?.med) + toNum(gridValues?.lrh?.arrive);
    const ebarkiaTotal = toNum(gridValues?.ebarkia?.med) + toNum(gridValues?.ebarkia?.arrive);

    const grandTotal = amanaTotal + crTotal + coTotal + lrhTotal + ebarkiaTotal;
    return { amanaTotal, crTotal, coTotal, lrhTotal, ebarkiaTotal, grandTotal };
}

export default function Step2RawImport({
    data,
    onDataChange,
    onValidationChange,
    onImportBandoeng,
    onDownloadTemplate,
}) {
    const fileInputRef = useRef(null);

    const hasImportedRaw = useMemo(() => {
        return !!(data?.rawGridValues && Object.keys(data.rawGridValues).length > 0);
    }, [data?.rawGridValues]);

    const totals = useMemo(() => {
        return computeRawTotals(data?.rawGridValues || data?.gridValues || {});
    }, [data?.rawGridValues, data?.gridValues]);

    useEffect(() => {
        onValidationChange(hasImportedRaw);
    }, [hasImportedRaw, onValidationChange]);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        onImportBandoeng?.(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRawValueChange = (path, value) => {
        const raw = JSON.parse(JSON.stringify(data?.rawGridValues || data?.gridValues || {}));
        let current = raw;
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            if (current[key] === undefined || current[key] === null || typeof current[key] !== "object") {
                current[key] = {};
            }
            current = current[key];
        }
        current[path[path.length - 1]] = parseInputToNumber(value);

        onDataChange?.({
            rawGridValues: raw,
            gridValues: raw,
        });
    };

    const renderEditableInput = (path) => {
        let current = data?.rawGridValues || data?.gridValues || {};
        for (const key of path) {
            current = current?.[key];
        }

        return (
            <Input
                type="text"
                inputMode="numeric"
                value={fmtInput(current)}
                onChange={(e) => handleRawValueChange(path, e.target.value)}
                className="w-28 h-7 bg-white px-2 text-center text-[11px] font-semibold text-slate-700 mx-auto"
            />
        );
    };

    return (
        <div className="wizard-step-content space-y-3 p-4 text-xs">
            <div className="flex items-center justify-center gap-3 mb-1.5 px-4 py-2 bg-gradient-to-r from-blue-50/60 via-white to-blue-50/60 border border-blue-100 rounded-xl shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#005EA8] to-[#48cae4] flex items-center justify-center shrink-0 shadow-sm">
                    <Upload className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                    <h2 className="text-sm font-black text-[#0b3f6f] leading-none">Import des Volumes</h2>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Importez ou saisissez les volumes avant le paramétrage</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <Info className="w-4 h-4 text-slate-400" />
                        <p className="text-[11px] text-slate-600">
                            Le format importé doit correspondre exactement au modèle téléchargé.
                        </p>
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
                            className="text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200 h-8 text-[11px] font-bold px-3 rounded-lg"
                        >
                            <Upload className="w-3.5 h-3.5 mr-2" />
                            IMPORTER EXCEL
                        </Button>
                        <Button
                            onClick={onDownloadTemplate}
                            variant="outline"
                            size="sm"
                            className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 h-8 text-[11px] font-bold px-3 rounded-lg"
                        >
                            <Download className="w-3.5 h-3.5 mr-2" />
                            TÉLÉCHARGER MODÈLE
                        </Button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-slate-700">
                            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                            <span className="font-bold text-[12px]">Aperçu des volumes importés/saisis</span>
                        </div>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${hasImportedRaw ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {hasImportedRaw ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                            {hasImportedRaw ? "Importé" : "En attente d'import"}
                        </div>
                    </div>

                    {/* AMANA: mêmes colonnes que le modèle Excel */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden mb-3">
                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                            AMANA
                        </div>
                        <div className="overflow-x-auto">
                            <Table className="w-full text-[11px]">
                                <TableHeader>
                                    <TableRow className="bg-white border-b border-slate-100 hover:bg-white">
                                        <TableHead className="px-2 py-2 text-left text-slate-500 font-bold"></TableHead>
                                        <TableHead className="px-2 py-2 text-center text-slate-500 font-bold w-32">Dépôt Pro</TableHead>
                                        <TableHead className="px-2 py-2 text-center text-slate-500 font-bold w-32">Dépôt Part.</TableHead>
                                        <TableHead className="px-2 py-2 text-center text-slate-500 font-bold w-32">Reçu Pro</TableHead>
                                        <TableHead className="px-2 py-2 text-center text-slate-500 font-bold w-32">Reçu Part.</TableHead>
                                        <TableHead className="px-2 py-2 text-center text-slate-500 font-bold w-28">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="border-b border-slate-100 bg-white hover:bg-white">
                                        <TableCell className="px-2 py-2 font-semibold text-slate-700">AMANA</TableCell>
                                        <TableCell className="px-2 py-2 text-center">{renderEditableInput(["amana", "depot", "gc", "global"])}</TableCell>
                                        <TableCell className="px-2 py-2 text-center">{renderEditableInput(["amana", "depot", "part", "global"])}</TableCell>
                                        <TableCell className="px-2 py-2 text-center">{renderEditableInput(["amana", "recu", "gc", "global"])}</TableCell>
                                        <TableCell className="px-2 py-2 text-center">{renderEditableInput(["amana", "recu", "part", "global"])}</TableCell>
                                        <TableCell className="px-2 py-2 text-center font-bold text-blue-700">{fmt(totals.amanaTotal)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* CR/CO/LRH/E-Barkia: mêmes colonnes que le modèle Excel */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                            Autres prestations
                        </div>
                        <div className="overflow-x-auto">
                            <Table className="w-full text-[11px]">
                                <TableHeader>
                                    <TableRow className="bg-white border-b border-slate-100 hover:bg-white">
                                        <TableHead className="px-2 py-2 text-left text-slate-500 font-bold">Prestation</TableHead>
                                        <TableHead className="px-2 py-2 text-center text-slate-500 font-bold w-32">Méd</TableHead>
                                        <TableHead className="px-2 py-2 text-center text-slate-500 font-bold w-32">Arrivé</TableHead>
                                        <TableHead className="px-2 py-2 text-center text-slate-500 font-bold w-28">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="border-b border-slate-100 bg-white hover:bg-white">
                                        <TableCell className="px-2 py-2 font-semibold text-slate-700">CR</TableCell>
                                        <TableCell className="px-2 py-2 text-center">{renderEditableInput(["cr", "med", "global"])}</TableCell>
                                        <TableCell className="px-2 py-2 text-center">{renderEditableInput(["cr", "arrive", "global"])}</TableCell>
                                        <TableCell className="px-2 py-2 text-center font-bold text-slate-800">{fmt(totals.crTotal)}</TableCell>
                                    </TableRow>
                                    <TableRow className="border-b border-slate-100 bg-white hover:bg-white">
                                        <TableCell className="px-2 py-2 font-semibold text-slate-700">CO</TableCell>
                                        <TableCell className="px-2 py-2 text-center">{renderEditableInput(["co", "med", "global"])}</TableCell>
                                        <TableCell className="px-2 py-2 text-center">{renderEditableInput(["co", "arrive", "global"])}</TableCell>
                                        <TableCell className="px-2 py-2 text-center font-bold text-slate-800">{fmt(totals.coTotal)}</TableCell>
                                    </TableRow>
                                    <TableRow className="border-b border-slate-100 bg-white hover:bg-white">
                                        <TableCell className="px-2 py-2 font-semibold text-slate-700">E-Barkia</TableCell>
                                        <TableCell className="px-2 py-2 text-center">{renderEditableInput(["ebarkia", "med"])}</TableCell>
                                        <TableCell className="px-2 py-2 text-center">{renderEditableInput(["ebarkia", "arrive"])}</TableCell>
                                        <TableCell className="px-2 py-2 text-center font-bold text-slate-800">{fmt(totals.ebarkiaTotal)}</TableCell>
                                    </TableRow>
                                    <TableRow className="border-b border-slate-100 bg-white hover:bg-white">
                                        <TableCell className="px-2 py-2 font-semibold text-slate-700">LRH</TableCell>
                                        <TableCell className="px-2 py-2 text-center">{renderEditableInput(["lrh", "med"])}</TableCell>
                                        <TableCell className="px-2 py-2 text-center">{renderEditableInput(["lrh", "arrive"])}</TableCell>
                                        <TableCell className="px-2 py-2 text-center font-bold text-slate-800">{fmt(totals.lrhTotal)}</TableCell>
                                    </TableRow>
                                    <TableRow className="bg-blue-50 hover:bg-blue-50">
                                        <TableCell className="px-2 py-2 font-black text-blue-700">TOTAL GÉNÉRAL</TableCell>
                                        <TableCell className="px-2 py-2 text-center text-blue-700 font-black" colSpan={3}>{fmt(totals.grandTotal)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
