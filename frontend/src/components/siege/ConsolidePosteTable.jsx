"use client";
import React, { useMemo, useState, useEffect } from "react";
import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Carte Consolidé par poste - Siège (avec pagination)
 *
 * Props attendues :
 * - Card, Button, S, cx, fmt : mêmes helpers UI que VueSiege
 * - postTypeFilter, setPostTypeFilter
 * - buildConsolide, consLoading
 * - consolideRows, consolideTotals
 * - ExcelIcon
 * - onExportConsolideExcelProp : fonction d'export (venant de VueSiege)
 * - rowsPerPage (optionnel) : nb de lignes / page (default 10)
 */
export default function ConsolidePosteTable({
  Card,
  Button,
  S,
  cx,
  fmt,
  postTypeFilter,
  setPostTypeFilter,
  buildConsolide,
  consLoading,
  consolideRows = [],
  consolideTotals = { etp_total: 0 },
  ExcelIcon,
  onExportConsolideExcelProp,
  rowsPerPage = 10,
}) {
  const [currentPage, setCurrentPage] = useState(1);

  // 🔁 Reset page quand filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [postTypeFilter]);

  const filteredConsolideRows = useMemo(() => {
    if (postTypeFilter === "tous") return consolideRows;
    const want = postTypeFilter.toUpperCase();
    return consolideRows.filter(
      (row) => (row.type_poste || "").toUpperCase() === want
    );
  }, [consolideRows, postTypeFilter]);

  const filteredTotals = useMemo(() => {
    if (postTypeFilter === "tous") return consolideTotals;
    return filteredConsolideRows.reduce(
      (acc, row) => ({
        etp_total: acc.etp_total + (row.etp_total || 0),
      }),
      { etp_total: 0 }
    );
  }, [filteredConsolideRows, postTypeFilter, consolideTotals]);

  // ================= Pagination =================
  const totalRows = filteredConsolideRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredConsolideRows.slice(start, start + rowsPerPage);
  }, [filteredConsolideRows, currentPage, rowsPerPage]);

  // pages à afficher (max 5)
  const pagesToShow = useMemo(() => {
    const max = 5;
    if (totalPages <= max)
      return Array.from({ length: totalPages }, (_, i) => i + 1);

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + max - 1);
    const realStart = Math.max(1, end - max + 1);

    return Array.from({ length: end - realStart + 1 }, (_, i) => realStart + i);
  }, [totalPages, currentPage]);

  const startCount =
    totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endCount = Math.min(currentPage * rowsPerPage, totalRows);

  // handlers
  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const goPage = (p) => setCurrentPage(p);

  return (
    <Card
      title="Consolidé par Poste - Siège"
      subtitle="Vue agrégée des effectifs par type de poste administratif (MOI)"
      actions={
        <div className="flex items-center gap-2">
          <select
            value={postTypeFilter}
            onChange={(e) => setPostTypeFilter(e.target.value)}
            className={cx(S.select, "min-w-[135px]")}
          >
            <option value="tous">Tous les types</option>
            <option value="MOI">MOI</option>
            <option value="MOD">MOD</option>
          </select>

          <Button
            onClick={buildConsolide}
            disabled={consLoading}
            variant="secondary"
          >
            Actualiser
          </Button>

          <Button
            icon={ExcelIcon}
            onClick={onExportConsolideExcelProp}
            disabled={consLoading || consolideRows.length === 0}
          >
            Exporter
          </Button>
        </div>
      }
    >
      {consLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-600 text-sm">
              Calcul du consolidé en cours...
            </p>
          </div>
        </div>
      ) : filteredConsolideRows.length === 0 ? (
        <div className="text-center py-10">
          <BarChart3 className="w-14 h-14 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">
            Aucune donnée consolidée disponible
          </p>
        </div>
      ) : (
        <>
          <div className={S.tableBox}>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className={cx(S.th, "text-left")}>Poste</th>
                  <th className={cx(S.th, "text-center")}>Type</th>
                  <th className={cx(S.th, "text-center")}>ETP Total</th>
                  <th className={cx(S.th, "text-center")}>% Total</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {pagedRows.map((row) => {
                  const pct = filteredTotals.etp_total
                    ? (row.etp_total / filteredTotals.etp_total) * 100
                    : 0;

                  return (
                    <tr key={row.key} className="hover:bg-white transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-900 text-[13px] sm:text-[14px]">
                        {row.label}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                          {row.type_poste || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center text-[13px] sm:text-[14px] text-slate-700">
                        {fmt(row.etp_total)}
                      </td>
                      <td className="px-4 py-2.5 text-center text-[13px] sm:text-[14px] text-slate-700">
                        {pct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td className="px-4 py-3 font-extrabold text-slate-900 text-[13px] sm:text-[14px]">
                    Total Siège{" "}
                    {postTypeFilter !== "tous" && `(${postTypeFilter})`}
                  </td>
                  <td />
                  <td className="px-4 py-3 text-center text-[13px] sm:text-[14px] font-extrabold text-slate-900">
                    {fmt(filteredTotals.etp_total)}
                  </td>
                  <td className="px-4 py-3 text-center text-[13px] sm:text-[14px] text-slate-700">
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination style capture */}
          <div className="mt-3 flex items-center justify-between px-1">
            {/* gauche */}
            <div className="text-[12px] text-slate-500">
              {startCount}-{endCount} / {totalRows}
            </div>

            {/* droite */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={goPrev}
                disabled={currentPage === 1}
                className={cx(
                  "h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-700 flex items-center justify-center shadow-sm",
                  "hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                )}
                aria-label="Page précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {pagesToShow.map((p) => (
                <button
                  key={p}
                  onClick={() => goPage(p)}
                  className={cx(
                    "h-8 min-w-8 px-2 rounded-lg text-[12px] font-bold",
                    p === currentPage
                      ? "bg-[#005EA8] text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-50 border border-transparent"
                  )}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={goNext}
                disabled={currentPage === totalPages}
                className={cx(
                  "h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-700 flex items-center justify-center shadow-sm",
                  "hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                )}
                aria-label="Page suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
