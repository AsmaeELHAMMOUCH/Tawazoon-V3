/**
 * EnterpriseTable - Composant de Tableau Stylisé
 * 
 * Design "Enterprise Dashboard" pour tableaux de données
 * 
 * Caractéristiques :
 * - Header sticky avec fond contrasté
 * - Zebra striping subtil
 * - Hover sur lignes
 * - Colonnes numériques alignées à droite
 * - Scroll interne avec scrollbar fine
 * - Totaux mis en évidence
 */

import React, { memo } from 'react';
import { Table as TableIcon, BarChart3, HelpCircle, Download } from 'lucide-react';
import Tooltip from '../ui/Tooltip';

const EnterpriseTable = memo(({
    title,
    subtitle,
    tooltip,
    icon: Icon = TableIcon,
    columns = [],
    data = [],
    footer = null,
    height = 380,
    onViewChange,
    currentView = 'table',
    showViewToggle = true,
    enableExport = false
}) => {
    const handleExport = async () => {
        if (!data || data.length === 0) return;

        try {
            // Dynamically import ExcelJS to avoid large bundle size if not used
            const ExcelJSModule = await import('exceljs');
            const ExcelJS = ExcelJSModule.default || ExcelJSModule;
            const FileSaverModule = await import('file-saver');
            const saveAs = FileSaverModule.saveAs || FileSaverModule.default;

            if (!ExcelJS || !saveAs) {
                throw new Error("Impossible de charger les librairies d'export.");
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet(title || 'Données');

            // --- 1. Gestion des Logos ---

            // Logo Gauche : Barid Al Maghrib
            try {
                const logoBarid = '/BaridLogo.png';
                const resp1 = await fetch(logoBarid);
                if (resp1.ok) {
                    const buff1 = await resp1.blob().then(b => b.arrayBuffer());
                    const id1 = workbook.addImage({ buffer: buff1, extension: 'png' });
                    worksheet.addImage(id1, {
                        tl: { col: 0, row: 0 },
                        ext: { width: 100, height: 50 },
                        editAs: 'oneCell'
                    });
                }
            } catch (e) {
                console.warn("Err Logo Barid", e);
            }

            // Logo Droite : Almav
            try {
                const logoAlmav = '/almavlogo.png';
                const resp2 = await fetch(logoAlmav);
                if (resp2.ok) {
                    const buff2 = await resp2.blob().then(b => b.arrayBuffer());
                    const id2 = workbook.addImage({ buffer: buff2, extension: 'png' });

                    const lastColIdx = Math.max(columns.length - 1, 4);
                    worksheet.addImage(id2, {
                        tl: { col: lastColIdx, row: 0 },
                        ext: { width: 100, height: 50 },
                        editAs: 'oneCell'
                    });
                }
            } catch (e) {
                console.warn("Err Logo Almav", e);
            }

            // --- 2. Titre et Informations ---
            worksheet.mergeCells('B2:E2');
            const titleCell = worksheet.getCell('B2');

            // Helper to ensure primitive content
            const getSafeText = (val) => {
                if (val === null || val === undefined) return "";
                if (typeof val === 'string' || typeof val === 'number') return val;
                return ""; // Ignore React Elements/Objects in Excel Header
            };

            titleCell.value = (getSafeText(title) || 'EXPORT DONNÉES').toString().toUpperCase();
            titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF005EA8' } };
            titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

            const safeSubtitle = getSafeText(subtitle);
            if (safeSubtitle) {
                worksheet.mergeCells('B3:E3');
                const subCell = worksheet.getCell('B3');
                subCell.value = safeSubtitle;
                subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF555555' } };
            }

            const daeRequest = "Demandé le : " + new Date().toLocaleString();
            worksheet.getCell('B4').value = daeRequest;
            worksheet.getCell('B4').font = { size: 9, color: { argb: 'FF888888' } };
            // --- 3. En-têtes de Colonnes (Ligne 6) ---
            const headerRowIdx = 6;
            const headerRow = worksheet.getRow(headerRowIdx);

            columns.forEach((col, idx) => {
                const cell = headerRow.getCell(idx + 1);
                cell.value = col.label;
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF005EA8' } // Bleu Barid
                };
                cell.alignment = { vertical: 'middle', horizontal: col.align || 'left' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                // Largeur de colonne approximative
                const colWidth = col.width ? parseInt(col.width) / 7 : 15; // Conversion approx px -> chars
                worksheet.getColumn(idx + 1).width = Math.max(colWidth, 15);
            });
            headerRow.height = 25;

            // --- 4. Données ---
            data.forEach((row, rIdx) => {
                const currentRow = worksheet.getRow(headerRowIdx + 1 + rIdx);
                columns.forEach((col, cIdx) => {
                    const cell = currentRow.getCell(cIdx + 1);
                    let val = row[col.key];

                    // Formattage spécial
                    if (col.exportFormat) {
                        val = col.exportFormat(val, row);
                    }

                    cell.value = val;
                    cell.alignment = { vertical: 'middle', horizontal: col.align || 'left' };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFEEEEEE' } },
                        left: { style: 'thin', color: { argb: 'FFEEEEEE' } },
                        bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } },
                        right: { style: 'thin', color: { argb: 'FFEEEEEE' } }
                    };

                    // Format numérique Excel si besoin
                    if (typeof val === 'number') {
                        cell.numFmt = '#,##0.00';
                    }
                });
            });

            // --- 5. Génération et Téléchargement ---
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `${title || 'export'}_${new Date().toISOString().slice(0, 10)}.xlsx`);

        } catch (error) {
            console.error("Erreur lors de l'export Excel:", error);
            alert("Une erreur est survenue lors de la génération de l'Excel: " + error.message);
        }
    };

    return (
        <div className="bg-white rounded border border-slate-200 overflow-hidden flex flex-col" style={{ height }}>
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-slate-600" />
                    <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-semibold text-slate-700">{title}</h3>
                        {tooltip && (
                            <Tooltip content={tooltip} position="bottom">
                                <HelpCircle className="w-3.5 h-3.5 text-[#005EA8] cursor-help" />
                            </Tooltip>
                        )}
                    </div>
                    {subtitle && (
                        <span className="text-[9px] text-slate-500 ml-1">– {subtitle}</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {enableExport && (
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
                            title="Exporter en CSV"
                        >
                            <Download className="w-3 h-3" />
                            Export
                        </button>
                    )}

                    {showViewToggle && (
                        <div className="flex rounded border border-slate-300 overflow-hidden">
                            <button
                                onClick={() => onViewChange?.('table')}
                                className={`
                    px-2 py-1 text-[10px] font-medium transition-colors flex items-center gap-1
                    ${currentView === 'table'
                                        ? 'bg-[#005EA8] text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-50'
                                    }
                  `}
                            >
                                <TableIcon className="w-3 h-3" />
                                Tableau
                            </button>
                            <button
                                onClick={() => onViewChange?.('graph')}
                                className={`
                    px-2 py-1 text-[10px] font-medium transition-colors flex items-center gap-1 border-l border-slate-300
                    ${currentView === 'graph'
                                        ? 'bg-[#005EA8] text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-50'
                                    }
                  `}
                            >
                                <BarChart3 className="w-3 h-3" />
                                Graphe
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-auto enterprise-scrollbar">
                <table className="w-full text-[10px]">
                    {/* Table Header */}
                    <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b-2 border-slate-300">
                        <tr>
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className={`
                    px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wide
                    ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                    ${col.width ? `w-[${col.width}]` : ''}
                  `}
                                    style={col.width ? { width: col.width } : {}}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    {/* Table Body */}
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-2 py-4 text-center text-slate-500 text-[10px]">
                                    Aucune donnée
                                </td>
                            </tr>
                        ) : (
                            data.map((row, rowIdx) => (
                                <tr
                                    key={rowIdx}
                                    className={`
                    border-b border-slate-100 transition-colors
                    ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                    hover:bg-blue-50/30
                  `}
                                >
                                    {columns.map((col, colIdx) => (
                                        <td
                                            key={colIdx}
                                            className={`
                        px-2 h-9 align-middle whitespace-nowrap text-[10px]
                        ${col.align === 'right' ? 'text-right font-mono' : col.align === 'center' ? 'text-center' : 'text-left'}
                        ${col.bold ? 'font-semibold' : ''}
                        ${col.color ? `text-${col.color}` : 'text-slate-700'}
                      `}
                                            title={col.ellipsis && typeof row[col.key] === 'string' ? row[col.key] : undefined}
                                        >
                                            {col.ellipsis ? (
                                                <div className="truncate max-w-xs">
                                                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                                                </div>
                                            ) : (
                                                col.render ? col.render(row[col.key], row) : row[col.key]
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>

                    {/* Table Footer */}
                    {footer && (
                        <tfoot className="bg-blue-50 border-t-2 border-blue-200 sticky bottom-0">
                            {footer}
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
});

EnterpriseTable.displayName = 'EnterpriseTable';

export default EnterpriseTable;
