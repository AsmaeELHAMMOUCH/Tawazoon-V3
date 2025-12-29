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
import { Table as TableIcon, BarChart3, HelpCircle } from 'lucide-react';
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
    showViewToggle = true
}) => {

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
