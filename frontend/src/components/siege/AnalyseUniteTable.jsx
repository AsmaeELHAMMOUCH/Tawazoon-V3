"use client";
import React, { memo } from "react";
import { motion } from "framer-motion";
import { Building, Search, ChevronRight, ChevronLeft } from "lucide-react";

function AnalyseUniteTable({
  Card,
  Button,
  S,
  cx,
  HeaderSort,
  sortedSiege,
  currentSiege,
  currentPage,
  rowsPerPage,
  totalPages,
  pagesToShow,
  categorieFilter,
  setCategorieFilter,
  searchRaw,
  setSearchRaw,
  setCurrentPage,
  openPostsModal,
  fmt,
  onExportExcel,
  loading, // Nouvelle prop pour gérer le loading
}) {
  /* -------------------------------------- */
  /*              CONSTANTES UI             */
  /* -------------------------------------- */
  const FONT_HEADER = "!text-[10px]";
  const FONT_CELL = "text-[11px]";
  const FONT_BADGE = "!text-[10px]";
  const FONT_PAGINATION = "text-[10px]";

  const ctrlGlass =
    "bg-white/70 backdrop-blur-md border-white/60 shadow-sm !h-8";

  const thBase = cx(S.th, `${FONT_HEADER} !py-2`);

  /* -------------------------------------- */
  /*               HANDLERS                 */
  /* -------------------------------------- */
  const handleCategorieChange = (e) => {
    setCategorieFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchRaw(e.target.value);
    setCurrentPage(1);
  };

  /* -------------------------------------- */
  /*              HEADER TABLE              */
  /* -------------------------------------- */
  const TableHeader = () => (
    <thead className="sticky top-0 z-10">
      <tr className="bg-white/75 backdrop-blur-md border-b border-slate-200">
        <th className={cx(S.th, `${FONT_HEADER} text-left !py-2`)}>
          <HeaderSort col="label">Unité</HeaderSort>
        </th>
        <th className={thBase}>Catégorie</th>
        <th className={thBase}>
          <HeaderSort col="fte">ETP actuel</HeaderSort>
        </th>
      </tr>
    </thead>
  );

  /* -------------------------------------- */
  /*                ROWS                    */
  /* -------------------------------------- */
  const TableRow = ({ siege, idx }) => {
    const isEven = idx % 2 === 0;

    return (
      <motion.tr
        key={siege.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: idx * 0.015 }}
        className={cx(
          "group transition-all",
          isEven ? "bg-white/40" : "bg-white/20",
          "hover:bg-white/80 hover:shadow-[0_6px_18px_-10px_rgba(2,6,23,0.25)]"
        )}
      >
        {/* Unité */}
        <td className="px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-1.5 rounded-full bg-gradient-to-b from-cyan-500 to-blue-600 opacity-70 group-hover:opacity-100 transition" />

              <div className="p-1 rounded-md bg-cyan-100/70 group-hover:bg-cyan-200/80 transition-colors">
                <Building className="w-3.5 h-3.5 text-cyan-800" />
              </div>

              <div className="min-w-0">
                <div
                  className={cx(
                    "font-semibold text-slate-900 truncate",
                    FONT_CELL
                  )}
                >
                  {siege.label}
                </div>
              </div>
            </div>

            <Button
              icon={ChevronRight}
              variant="ghost"
              className={cx(
                "!p-1 !h-7 !w-7 opacity-0 translate-x-1",
                "group-hover:opacity-100 group-hover:translate-x-0 transition-all"
              )}
              onClick={() => openPostsModal(siege)}
            />
          </div>
        </td>

        {/* Catégorie */}
        <td className="px-2.5 py-2 text-center">
          <span
            className={cx(
              S.pill,
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/5 ring-1 ring-slate-200/60 text-slate-800",
              FONT_BADGE
            )}
          >
            {siege.categorie}
          </span>
        </td>

        {/* FTE actuel (harmonisé) */}
        <td className="px-2.5 py-2 text-center">
          <span className="!text-[11px] font-medium text-slate-900">
            {fmt(siege.fte_actuel)}
          </span>
        </td>
      </motion.tr>
    );
  };

  /* -------------------------------------- */
  /*              PAGINATION                */
  /* -------------------------------------- */
  const Pagination = () => (
    <div className="flex items-center justify-between mt-2 px-1">
      <div className={cx(FONT_PAGINATION, "text-slate-500")}>
        {(currentPage - 1) * rowsPerPage + 1}-
        {Math.min(currentPage * rowsPerPage, sortedSiege.length)} /{" "}
        {sortedSiege.length}
      </div>

      <div className="flex items-center gap-1">
        <Button
          icon={ChevronLeft}
          variant="secondary"
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          className="!p-0.5 !h-7 !w-7 bg-white/70 backdrop-blur-md border-white/60"
        />

        {pagesToShow.map((page) => (
          <motion.button
            key={page}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentPage(page)}
            className={cx(
              "h-7 w-7 rounded-md font-semibold transition-all",
              FONT_PAGINATION,
              currentPage === page
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm"
                : "text-slate-700 bg-white/60 hover:bg-white/90"
            )}
          >
            {page}
          </motion.button>
        ))}

        <Button
          icon={ChevronRight}
          variant="secondary"
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="!p-0.5 !h-7 !w-7 bg-white/70 backdrop-blur-md border-white/60"
        />
      </div>
    </div>
  );

  /* -------------------------------------- */
  /*              LOADING STATE             */
  /* -------------------------------------- */
  const LoadingState = () => (
    <div className="flex items-center justify-center py-10">
      <div className="text-center">
        <div className="w-8 h-8 border-3 border-cyan-200 border-t-cyan-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-600 text-sm">Chargement des données...</p>
      </div>
    </div>
  );

  /* -------------------------------------- */
  /*              EMPTY STATE               */
  /* -------------------------------------- */
  const EmptyState = () => (
    <div className="text-center py-10">
      <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500 text-sm">Aucune unité trouvée</p>
      <p className="text-slate-400 text-xs mt-1">
        Essayez de modifier vos critères de recherche
      </p>
    </div>
  );

  /* -------------------------------------- */
  /*                RENDER                  */
  /* -------------------------------------- */
  return (
    <Card
      title="Analyse par Unité"
      subtitle={
        loading 
          ? "Chargement..." 
          : `${sortedSiege.length} unité${sortedSiege.length !== 1 ? 's' : ''} analysée${sortedSiege.length !== 1 ? 's' : ''}`
      }
      className="!p-0 overflow-hidden"
      actions={
        <div className="flex items-center gap-2">
          <select
            value={categorieFilter}
            onChange={handleCategorieChange}
            className={cx(S.select, ctrlGlass)}
            disabled={loading}
          >
            <option value="tous">Toutes les catégories</option>
            <option value="Direction">Directions</option>
            <option value="Division">Divisions</option>
            <option value="Service">Services</option>
            <option value="Pôle">Pôles</option>
            <option value="Autre">Autres</option>
          </select>

          <div className={cx(S.inputWrap, "relative")}>
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher..."
              className={cx(S.input, "w-56", ctrlGlass)}
              value={searchRaw}
              onChange={handleSearchChange}
              disabled={loading}
            />
          </div>

          <Button
            variant="secondary"
            onClick={onExportExcel}
            disabled={loading || sortedSiege.length === 0}
            className="!h-8 !px-2.5 !text-[10px] bg-white/70 backdrop-blur-md border-white/60 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Exporter
          </Button>
        </div>
      }
    >
      {loading ? (
        <LoadingState />
      ) : sortedSiege.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div
            className={cx(
              S.tableBox,
              "relative !rounded-2xl border border-white/70 bg-white/45 backdrop-blur-xl"
            )}
          >
            {/* Glow */}
            <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-14 -left-14 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />

            <table className="w-full">
              <TableHeader />
              <tbody className={cx("divide-y divide-slate-200/60 !text-[11px]")}>
                {currentSiege.map((siege, idx) => (
                  <TableRow key={siege.id} siege={siege} idx={idx} />
                ))}
              </tbody>
            </table>
          </div>

          <Pagination />
        </>
      )}
    </Card>
  );
}

export default memo(AnalyseUniteTable);