// src/components/DataTable.jsx
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useState, useMemo } from "react"

export default function DataTable({ columns, data, className = "" }) {
  const [sorting, setSorting] = useState([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className={`rounded-lg border border-slate-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th
                    key={h.id}
                    className={`px-3 py-2 select-none ${h.column.getCanSort() ? "cursor-pointer" : ""} ${h.column.columnDef.meta?.thClass ?? ""}`}
                    onClick={h.column.getToggleSortingHandler()}
                    title={h.column.getCanSort() ? "Trier" : ""}
                  >
                    <div className="inline-flex items-center gap-1">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {{
                        asc: "▲",
                        desc: "▼",
                      }[h.column.getIsSorted()] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={columns.length}>
                  Aucune donnée.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(r => (
                <tr key={r.id} className="odd:bg-white even:bg-slate-50">
                  {r.getVisibleCells().map(c => (
                    <td key={c.id} className={`px-3 py-2 ${c.column.columnDef.meta?.tdClass ?? ""}`}>
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
