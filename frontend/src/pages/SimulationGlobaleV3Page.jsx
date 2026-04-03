import React, { useState, useEffect, useMemo } from "react";
import {
    ArrowLeft,
    Play,
    FileSpreadsheet,
    FileBox,
    BarChart3,
    Settings2,
    Table as TableIcon,
    HelpCircle,
    Loader2,
    TrendingDown,
    TrendingUp,
    Minus,
    Check,
    Calculator
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import EsignLayout from "../components/EsignLayout";
import ReactECharts from "echarts-for-react";
import { runSimulationGlobaleV3 } from "../api/simulationGlobale";
import { createA4 } from "../components/utils/pdf";

/**
 * Page de Simulation Globale (Tableau de Bord Global)
 * Migration complète du module PyQt5 vers React.
 */
export default function SimulationGlobaleV3Page() {
    const navigate = useNavigate();

    // État des paramètres
    const [params, setParams] = useState({
        sacs: 50,
        dossiers_mois: 6500,
        productivite: 100
    });

    // Données de simulation
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showChart, setShowChart] = useState(false);

    const roundValue = (value) => {
        if (typeof value !== "number" || Number.isNaN(value)) return value;
        return Math.round(value);
    };

    const formatDecimal = (value, decimals = 2) => {
        if (typeof value !== "number" || Number.isNaN(value)) return (0).toFixed(decimals);
        return value.toFixed(decimals);
    };

    // Valeurs calculées en temps réel (pour l'affichage des paramètres)
    const statsParams = useMemo(() => {
        return {
            dossiers_jour: (params.dossiers_mois / 22).toFixed(2),
            heures_net_jour: ((8 * params.productivite) / 100).toFixed(2)
        };
    }, [params]);

    const totalActuelRounded = useMemo(() => {
        if (!data?.rows) return 0;
        return data.rows.reduce((acc, row) => {
            const value = typeof row.actuel === "number" ? row.actuel : 0;
            return acc + roundValue(value);
        }, 0);
    }, [data]);

    const totalCalculeRounded = useMemo(() => {
        if (!data?.rows) return 0;
        return data.rows.reduce((acc, row) => {
            const value = typeof row.calcule === "number" ? row.calcule : 0;
            return acc + roundValue(value);
        }, 0);
    }, [data]);

    const totalRecommandeSum = useMemo(() => {
        if (!data?.rows) return 0;
        return data.rows.reduce((acc, row) => {
            const value = typeof row.recommande === "number" ? row.recommande : 0;
            return acc + roundValue(value);
        }, 0);
    }, [data]);

    const totalEcartCalcActuelRounded = useMemo(() => {
        return totalCalculeRounded - totalActuelRounded;
    }, [totalCalculeRounded, totalActuelRounded]);

    const totalEcartRecoActuelRounded = useMemo(() => {
        return totalRecommandeSum - totalActuelRounded;
    }, [totalRecommandeSum, totalActuelRounded]);

    const totalEcartRecoCalculeRounded = useMemo(() => {
        return totalRecommandeSum - totalCalculeRounded;
    }, [totalRecommandeSum, totalCalculeRounded]);

    const [exportLoading, setExportLoading] = useState(false);

    // Lancer la simulation
    const handleRun = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await runSimulationGlobaleV3(params);
            setData(res);
        } catch (err) {
            console.error(err);
            setError("Erreur lors du calcul de la simulation.");
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        if (!data) return;
        setExportLoading(true);
        try {
            const ExcelJSModule = await import("exceljs");
            const ExcelJS = ExcelJSModule.default || ExcelJSModule;
            const FileSaverModule = await import("file-saver");
            const saveAs = FileSaverModule.saveAs || FileSaverModule.default;
            if (!ExcelJS || !saveAs) {
                throw new Error("Impossible de charger les librairies d'export.");
            }

            const workbook = new ExcelJS.Workbook();
            workbook.creator = "Simulateur RH";
            workbook.created = new Date();

            const sheet = workbook.addWorksheet("Simulation Globale V3");
            sheet.properties.defaultRowHeight = 16;
            sheet.pageSetup = {
                paperSize: 9, // A4
                orientation: "landscape",
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0
            };

            sheet.mergeCells("A1:G1");
            const titleCell = sheet.getCell("A1");
            titleCell.value = "Simulation Globale V3";
            titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FF005EA8" } };
            titleCell.alignment = { horizontal: "left", vertical: "middle" };

            const now = new Date();
            const dateLabel = now.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
            const timeLabel = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
            const subtitleCell = sheet.getCell("A2");
            subtitleCell.value = `Exporté le ${dateLabel} à ${timeLabel}`;
            subtitleCell.font = { name: "Calibri", size: 10, color: { argb: "FF4B5563" } };
            subtitleCell.alignment = { horizontal: "left", vertical: "middle" };

            sheet.addRow([]);

            const summaryItems = [
                ["Sacs / Jour", params.sacs],
                ["Dossiers / Mois", params.dossiers_mois],
                ["Productivité (%)", `${params.productivite}%`],
                ["Dossiers / Jour (calculé)", statsParams.dossiers_jour],
                ["Heures Net / Jour", statsParams.heures_net_jour]
            ];

            summaryItems.forEach(([label, value]) => {
                const row = sheet.addRow([label, value]);
                row.getCell(1).font = { bold: true, name: "Calibri" };
                row.getCell(2).alignment = { horizontal: "left" };
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: "thin" },
                        left: { style: "thin" },
                        bottom: { style: "thin" },
                        right: { style: "thin" }
                    };
                });
            });

            sheet.addRow([]);

            const tableColumns = [
                { header: "Position", key: "position", width: 32 },
                { header: "Actuel", key: "actuel", width: 16 },
                { header: "Calculé", key: "calcule", width: 16 },
                { header: "Recommandé", key: "recommande", width: 20 },
                { header: "Δ Calc/Act", key: "ecart_calc_actuel", width: 18 },
                { header: "Δ Rec/Act", key: "ecart_reco_actuel", width: 18 },
                { header: "Δ Rec/Calc", key: "ecart_reco_calcule", width: 18 }
            ];

            sheet.columns = tableColumns;

            const headerRow = sheet.addRow(tableColumns.map((col) => col.header));
            headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Calibri" };
            headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF005EA8" } };
            headerRow.height = 20;
            headerRow.eachCell((cell) => {
                cell.alignment = { horizontal: "center", vertical: "middle" };
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };
            });

            const addBorderAndAlign = (row) => {
                row.eachCell((cell, colNumber) => {
                    const alignment =
                        colNumber === 1
                            ? { horizontal: "left" }
                            : { horizontal: "right" };
                    cell.alignment = alignment;
                    cell.border = {
                        top: { style: "thin" },
                        left: { style: "thin" },
                        bottom: { style: "thin" },
                        right: { style: "thin" }
                    };
                });
            };

            (data?.rows || []).forEach((rowData) => {
                const excelRow = sheet.addRow({
                    position: rowData.position,
                    actuel: roundValue(rowData.actuel),
                    calcule: roundValue(rowData.calcule),
                    recommande: rowData.recommande,
                    ecart_calc_actuel: roundValue(rowData.calcule) - roundValue(rowData.actuel),
                    ecart_reco_actuel: roundValue(rowData.recommande) - roundValue(rowData.actuel),
                    ecart_reco_calcule: roundValue(rowData.recommande) - roundValue(rowData.calcule)
                });
                addBorderAndAlign(excelRow);
            });

            const total = data.total;
            const totalRow = sheet.addRow({
                position: "TOTAL GÉNÉRAL",
                actuel: totalActuelRounded,
                calcule: totalCalculeRounded,
                recommande: totalRecommandeSum,
                ecart_calc_actuel: totalEcartCalcActuelRounded,
                ecart_reco_actuel: totalEcartRecoActuelRounded,
                ecart_reco_calcule: totalEcartRecoCalculeRounded
            });
            totalRow.font = { bold: true, name: "Calibri" };
            totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EFF7" } };
            addBorderAndAlign(totalRow);

            ["actuel", "calcule", "recommande", "ecart_calc_actuel", "ecart_reco_actuel", "ecart_reco_calcule"].forEach(
                (key) => {
                    const column = sheet.getColumn(key);
                    const integerCols = new Set(["recommande", "ecart_calc_actuel", "ecart_reco_actuel", "ecart_reco_calcule"]);
                    column.numFmt = integerCols.has(key) ? "#,##0" : "#,##0.00";
                }
            );

            const headerRangeStart = `A${headerRow.number}`;
            const headerRangeEnd = `G${headerRow.number}`;
            sheet.views = [{ state: "frozen", ySplit: headerRow.number }];
            sheet.autoFilter = {
                from: headerRangeStart,
                to: headerRangeEnd
            };

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            });
            saveAs(blob, `simulation_globale_v3_${new Date().toISOString().split("T")[0]}.xlsx`);
        } catch (error) {
            console.error("Export Excel error:", error);
        } finally {
            setExportLoading(false);
        }
    };

    const handleExportPdf = async () => {
        if (!data) return;
        setExportLoading(true);
        try {
            const pdf = createA4();
            const margin = 15;
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const usableWidth = pageWidth - margin * 2;
            let cursorY = margin;

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(16);
            pdf.text("Simulation Globale V3", margin, cursorY);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
            const now = new Date();
            const dateLabel = now.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
            const timeLabel = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
            pdf.text(`Exporté le ${dateLabel} à ${timeLabel}`, margin, cursorY + 8);
            cursorY += 14;

            const summaryItems = [
                ["Sacs / Jour", params.sacs],
                ["Dossiers / Mois", params.dossiers_mois],
                ["Productivité (%)", `${params.productivite}%`],
                ["Dossiers / Jour (calculé)", statsParams.dossiers_jour],
                ["Heures Net / Jour", statsParams.heures_net_jour]
            ];

            summaryItems.forEach(([label, value]) => {
                pdf.text(`${label} : ${value}`, margin, cursorY);
                cursorY += 6;
            });
            cursorY += 4;

            const columns = [
                { key: "position", label: "Position", width: 55, align: "left" },
                { key: "actuel", label: "Actuel", width: 18, align: "right", decimals: 0 },
                { key: "calcule", label: "Calculé", width: 18, align: "right", decimals: 0 },
                { key: "recommande", label: "Recommandé", width: 22, align: "right", decimals: 0 },
                { key: "ecart_calc_actuel", label: "Δ Calc/Act", width: 20, align: "right", showSign: true, decimals: 0 },
                { key: "ecart_reco_actuel", label: "Δ Rec/Act", width: 20, align: "right", showSign: true, decimals: 0 },
                { key: "ecart_reco_calcule", label: "Δ Rec/Calc", width: 20, align: "right", showSign: true, decimals: 0 }
            ];

            const headerHeight = 8;
            const rowHeight = 8;

            const addTableHeader = () => {
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(9);
                pdf.setTextColor(255, 255, 255);
                pdf.setFillColor(0, 94, 168);
                let x = margin;
                columns.forEach((column) => {
                    pdf.rect(x, cursorY, column.width, headerHeight, "F");
                    pdf.text(column.label, x + column.width / 2, cursorY + headerHeight / 2 + 1, { align: "center" });
                    x += column.width;
                });
                cursorY += headerHeight;
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(0, 0, 0);
            };

            if (cursorY + headerHeight > pageHeight - margin) {
                pdf.addPage();
                cursorY = margin;
            }
            addTableHeader();

            const createNewPage = () => {
                pdf.addPage();
                cursorY = margin;
                addTableHeader();
            };

            const ensureSpaceForRow = (height) => {
                if (cursorY + height > pageHeight - margin) {
                    createNewPage();
                }
            };

            const formatValue = (value, column) => {
                if (typeof value !== "number") {
                    return value ?? "";
                }
                const decimals = typeof column?.decimals === "number" ? column.decimals : 2;
                const formatted = value.toFixed(decimals);
                if (column?.showSign && value > 0) {
                    return `+${formatted}`;
                }
                return formatted;
            };

            const renderRow = (rowData, { isTotal = false } = {}) => {
                if (isTotal) {
                    pdf.setFillColor(245, 245, 245);
                    pdf.rect(margin, cursorY, usableWidth, rowHeight, "F");
                    pdf.setFont("helvetica", "bold");
                }
                let x = margin;
                const textY = cursorY + rowHeight - 2;
                columns.forEach((column) => {
                    const textValue = `${formatValue(rowData[column.key], column)}`;
                    const textOptions = {
                        align: column.align,
                        maxWidth: column.width - 1
                    };
                    const textX = column.align === "right" ? x + column.width - 0.5 : x + 0.5;
                    pdf.text(textValue, textX, textY, textOptions);
                    x += column.width;
                });
                if (isTotal) {
                    pdf.setFont("helvetica", "normal");
                    pdf.setFillColor(255, 255, 255);
                }
                cursorY += rowHeight;
            };

            (data?.rows || []).forEach((row) => {
                ensureSpaceForRow(rowHeight);
                const normalizedRow = {
                    ...row,
                    calcule: roundValue(row.calcule),
                    actuel: roundValue(row.actuel),
                    recommande: row.recommande,
                    ecart_calc_actuel: roundValue(row.calcule) - roundValue(row.actuel),
                    ecart_reco_actuel: roundValue(row.recommande) - roundValue(row.actuel),
                    ecart_reco_calcule: roundValue(row.recommande) - roundValue(row.calcule)
                };
                renderRow(normalizedRow);
            });

            ensureSpaceForRow(rowHeight);
            const totalRowData = {
                ...data.total,
                calcule: totalCalculeRounded,
                actuel: totalActuelRounded,
                recommande: totalRecommandeSum,
                ecart_calc_actuel: totalEcartCalcActuelRounded,
                ecart_reco_actuel: totalEcartRecoActuelRounded,
                ecart_reco_calcule: totalEcartRecoCalculeRounded
            };
            renderRow(totalRowData, { isTotal: true });

            pdf.save(`simulation_globale_v3_${new Date().toISOString().split("T")[0]}.pdf`);
        } catch (error) {
            console.error("Export PDF error:", error);
        } finally {
            setExportLoading(false);
        }
    };

    // Lancer au chargement initial
    useEffect(() => {
        handleRun();
    }, []);

    // Configuration du graphique
    const chartOption = useMemo(() => {
        if (!data || !data.rows) return {};

        const chartItems = [...data.rows].map(item => ({
            position: item.position,
            actuel: roundValue(item.actuel),
            calcule: roundValue(item.calcule),
            recommande: roundValue(item.recommande)
        }));

        // Ajouter le total à la fin du graphique pour l'aligner avec le tableau
        chartItems.push({
            position: "TOTAL",
            actuel: totalActuelRounded,
            calcule: totalCalculeRounded,
            recommande: totalRecommandeSum
        });

        return {
            tooltip: {
                trigger: "axis",
                axisPointer: { type: "shadow" }
            },
            legend: {
                data: ["Actuel", "Calculé", "Recommandé"],
                bottom: 0,
                icon: "roundRect"
            },
            grid: {
                left: "3%",
                right: "4%",
                bottom: "15%",
                top: "5%",
                containLabel: true
            },
            xAxis: {
                type: "category",
                data: chartItems.map(item => item.position),
                axisLabel: {
                    interval: 0,
                    rotate: 35,
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: '#64748b'
                }
            },
            yAxis: {
                type: "value",
                name: "ETP",
                nameTextStyle: { fontWeight: 'bold' }
            },
            series: [
                {
                    name: "Actuel",
                    type: "bar",
                    data: chartItems.map(item => item.actuel),
                    itemStyle: { color: "#94a3b8" },
                    label: { show: true, position: 'top', fontSize: 9 }
                },
                {
                    name: "Calculé",
                    type: "bar",
                    data: chartItems.map(item => item.calcule),
                    itemStyle: { color: "#3b82f6" },
                    label: { show: true, position: 'top', fontSize: 9 }
                },
                {
                    name: "Recommandé",
                    type: "bar",
                    data: chartItems.map(item => item.recommande),
                    itemStyle: {
                        color: (params) => params.dataIndex === chartItems.length - 1 ? "#1e40af" : "#005EA8"
                    },
                    label: { show: true, position: 'top', fontSize: 9, fontWeight: 'bold' }
                }
            ]
        };
    }, [data, totalActuelRounded, totalCalculeRounded, totalRecommandeSum]);

    return (
        <EsignLayout activeKey="Tableau de Bord Global" className="bg-slate-50/50">
            <div className="w-full max-w-[1600px] mx-auto p-4 space-y-6 animate-in fade-in duration-500">

                {/* Premium Header */}
                <div className="relative overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200/60 p-4">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -mr-20 -mt-20 opacity-70" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center flex-col md:flex-row gap-3 text-center md:text-left">
                            <button
                                onClick={() => navigate(-1)}
                                className="mr-2 p-2 hover:bg-slate-50 rounded-lg transition-all border border-transparent hover:border-slate-100 group"
                            >
                                <ArrowLeft size={18} className="text-slate-400 group-hover:text-blue-600" />
                            </button>
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-slate-900">
                                    Tableau de Bord Global
                                </h1>
                                <p className="text-slate-500 mt-0.5 text-xs max-w-xl">
                                    Résultats de la simulation : Vue Globale et Comparaison des Effectifs.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stepper de Progression */}
                <div className="relative py-2 max-w-2xl mx-auto w-full">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 rounded-full z-0" />
                    <div
                        className="absolute top-1/2 left-0 h-0.5 bg-green-500 -translate-y-1/2 rounded-full z-0 transition-all duration-700 ease-out"
                        style={{ width: data ? '100%' : '50%' }}
                    />

                    <div className="relative z-10 flex justify-between w-full px-4">
                        {/* Étape 1 */}
                        <div className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => !loading && handleRun()}>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center border-4 border-white shadow-md transition-all duration-500 ${data ? 'bg-blue-600 text-white ring-2 ring-blue-50 group-hover:bg-blue-700' : 'bg-[#005EA8] text-white ring-2 ring-blue-100'}`}>
                                {data ? (
                                    <div className="relative">
                                        <Check size={16} strokeWidth={3} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 group-hover:opacity-0" />
                                        <Settings2 size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                    </div>
                                ) : <Settings2 size={16} />}
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 bg-white px-2.5 py-1 rounded-full shadow-sm border border-slate-100">
                                1. Paramètres
                            </span>
                        </div>

                        {/* Étape 2 */}
                        <div className={`flex flex-col items-center gap-2 transition-all duration-500 ${data ? 'scale-105 opacity-100' : 'scale-90 opacity-40 grayscale'}`}>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center border-4 border-white shadow-md transition-all duration-500 ${data ? 'bg-green-600 text-white ring-2 ring-green-100' : 'bg-slate-100 text-slate-400'}`}>
                                <BarChart3 size={16} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 bg-white px-2.5 py-1 rounded-full shadow-sm border border-slate-100">
                                2. Résultats
                            </span>
                        </div>
                    </div>
                </div>

                {/* Barre d'outils Unique (Paramètres + Actions) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-2 flex flex-wrap items-end gap-3 transition-all hover:shadow-md">

                    {/* Input: Sacs */}
                    <div className="flex-1 min-w-[80px] max-w-[120px] space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Sacs / J</label>
                        <input
                            type="number"
                            value={params.sacs}
                            onChange={(e) => setParams({ ...params, sacs: parseInt(e.target.value) || 0 })}
                            className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-[#005EA8] outline-none transition-all font-bold text-slate-700 text-center text-xs shadow-inner"
                        />
                    </div>

                    {/* Input: Dossiers */}
                    <div className="flex-1 min-w-[100px] max-w-[140px] space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Dossiers / M</label>
                        <input
                            type="number"
                            value={params.dossiers_mois}
                            onChange={(e) => setParams({ ...params, dossiers_mois: parseInt(e.target.value) || 0 })}
                            className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-[#005EA8] outline-none transition-all font-bold text-slate-700 text-center text-xs shadow-inner"
                        />
                    </div>

                    {/* Input: Productivité */}
                    <div className="flex-1 min-w-[80px] max-w-[100px] space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Prod. (%)</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={params.productivite}
                                onChange={(e) => setParams({ ...params, productivite: parseInt(e.target.value) || 0 })}
                                className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-[#005EA8] outline-none transition-all font-bold text-slate-700 text-center text-xs shadow-inner pr-5"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[9px]">%</span>
                        </div>
                    </div>

                    {/* Readonly: Stats */}
                    <div className="flex items-end gap-2 px-3 border-l border-r border-slate-100 h-8 mb-0.5">
                        <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Dos./Jour</p>
                            <p className="text-[11px] font-black text-[#005EA8]">{statsParams.dossiers_jour}</p>
                        </div>
                        <div className="w-px h-4 bg-slate-100" />
                        <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">H.Net/Jour</p>
                            <p className="text-[11px] font-black text-emerald-600">{statsParams.heures_net_jour}</p>
                        </div>
                    </div>

                    {/* Boutons d'action */}
                    <div className="flex items-center gap-2 ml-auto h-8">
                        <button
                            onClick={handleRun}
                            disabled={loading}
                            className="h-full flex items-center gap-2 px-4 bg-gradient-to-br from-[#005EA8] to-blue-800 text-white rounded-lg font-black text-[10px] uppercase tracking-widest shadow-md shadow-blue-500/10 hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
                        >
                            {loading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                            Calculer
                        </button>

                        <button
                            onClick={() => setShowChart(!showChart)}
                            className={`h-full flex items-center gap-2 px-3 bg-white border rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${showChart ? "text-blue-700 border-blue-200 bg-blue-50" : "text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                        >
                            <BarChart3 size={12} />
                            Analyse
                        </button>

                        <div className="flex gap-1">
                            <button
                                onClick={handleExportExcel}
                                disabled={exportLoading || !data}
                                className="h-8 w-8 flex items-center justify-center bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all shadow-sm disabled:opacity-50"
                                title="Excel"
                            >
                                {exportLoading ? <Loader2 size={12} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                            </button>
                            <button
                                onClick={handleExportPdf}
                                disabled={exportLoading || !data}
                                className="h-8 w-8 flex items-center justify-center bg-rose-50 text-rose-700 rounded-lg border border-rose-100 hover:bg-rose-100 transition-all shadow-sm disabled:opacity-50"
                                title="PDF"
                            >
                                {exportLoading ? <Loader2 size={12} className="animate-spin" /> : <FileBox size={14} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dashboard Area with Ref for PDF Capture */}
                <div className="space-y-6">

                    {/* Tableau de résultats */}
                    <div className="bg-white rounded-2xl shadow-[0_4px_20px_-1px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 text-slate-800 font-bold text-sm">
                            <TableIcon size={18} className="text-[#005EA8]" />
                            DÉTAIL DES EFFECTIFS PAR POSITION
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white sticky top-0 z-10">
                                    <tr className="border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white">Position</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Actuel</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center bg-blue-50/30">Calculé</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center bg-[#005EA8]/5">Recommandé</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">∆ Calc/Act</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">∆ Rec/Act</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">∆ Rec/Calc</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <Loader2 className="w-10 h-10 text-[#005EA8] animate-spin" />
                                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Calcul en cours...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (data?.rows || []).map((row, idx) => (
                                        <tr key={idx} className="group hover:bg-slate-50/80 transition-all">
                                            <td className="px-6 py-3 font-bold text-slate-700 text-xs border-r border-slate-50">
                                                {row.position}
                                            </td>
                                            <td className="px-6 py-3 text-center text-xs font-mono font-medium text-slate-500">
                                                {roundValue(row.actuel)}
                                            </td>
                                            <td className="px-6 py-3 text-center text-xs font-mono font-bold text-blue-600 bg-blue-50/20 group-hover:bg-blue-50/40">
                                                {roundValue(row.calcule)}
                                            </td>
                                            <td className="px-6 py-3 text-center text-xs font-mono font-black text-[#005EA8] bg-[#005EA8]/5 group-hover:bg-[#005EA8]/10 transition-colors">
                                                {roundValue(row.recommande)}
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs font-mono">
                                                <EcartDisplay value={roundValue(row.calcule) - roundValue(row.actuel)} decimals={0} />
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs font-mono">
                                                <EcartDisplay value={roundValue(row.recommande) - roundValue(row.actuel)} decimals={0} />
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs font-mono">
                                                <EcartDisplay value={roundValue(row.recommande) - roundValue(row.calcule)} decimals={0} />
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Ligne TOTAL */}
                                    {data && (
                                        <tr className="bg-blue-50/80 border-t-2 border-blue-100 text-blue-900 font-black sticky bottom-0 backdrop-blur-md">
                                            <td className="px-6 py-4 text-[10px] uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                TOTAL GÉNÉRAL
                                            </td>
                                            <td className="px-6 py-4 text-center font-mono text-xs">{roundValue(totalActuelRounded)}</td>
                                            <td className="px-6 py-4 text-center font-mono text-xs text-blue-700">{roundValue(totalCalculeRounded)}</td>
                                            <td className="px-6 py-4 text-center font-mono text-xs text-blue-800">{roundValue(totalRecommandeSum)}</td>
                                            <td className="px-4 py-4 text-center font-mono text-xs">
                                                {totalEcartCalcActuelRounded >= 0 ? "+" : ""}{totalEcartCalcActuelRounded}
                                            </td>
                                            <td className="px-4 py-4 text-center font-mono text-xs">
                                                {totalEcartRecoActuelRounded >= 0 ? "+" : ""}{totalEcartRecoActuelRounded}
                                            </td>
                                            <td className="px-4 py-4 text-center font-mono text-xs">
                                                {totalEcartRecoCalculeRounded >= 0 ? "+" : ""}{totalEcartRecoCalculeRounded}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section Graphique (Conditionnel) - Déplacée après le tableau */}
                    {showChart && data && (
                        <div className="bg-white rounded-2xl shadow-[0_4px_20px_-1px_rgba(0,0,0,0.05)] border border-slate-200 p-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-black text-slate-800 text-sm uppercase flex items-center gap-2">
                                    <BarChart3 size={18} className="text-[#005EA8]" />
                                    Comparaison des Effectifs (ETP)
                                </h3>
                            </div>
                            <div className="h-[400px]">
                                <ReactECharts option={chartOption} style={{ height: '100%' }} />
                            </div>
                        </div>
                    )}



                </div>
            </div>
        </EsignLayout>
    );
}

// Petit composant pour afficher les écarts avec icône et couleur
function EcartDisplay({ value, decimals = 2 }) {
    const hasNumber = typeof value === "number" && !Number.isNaN(value);
    const formatValue = (input) => {
        if (!hasNumber) return "0.00";
        return input.toFixed(decimals);
    };

    if (hasNumber && value > 0) {
        return (
            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                <TrendingUp size={12} />
                +{formatValue(value)}
            </span>
        );
    }
    if (hasNumber && value < 0) {
        return (
            <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                <TrendingDown size={12} />
                {formatValue(value)}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-slate-400">
            <Minus size={12} />
            {formatValue(0)}
        </span>
    );
}
