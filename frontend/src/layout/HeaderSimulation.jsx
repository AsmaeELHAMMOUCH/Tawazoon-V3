"use client";
import React, { useMemo } from "react";
import { motion } from "framer-motion";

const SCOPE_LABEL = {
  poste: "Par Intervenant",
  centre: "Par Centre",
  direction: "Par Direction",
  siege: "Niveau Siège",
  national: "Niveau National",
};

const scopeToLabel = (s) =>
  SCOPE_LABEL[String(s || "").toLowerCase()] ?? "Flux en Cascade";

export default function HeaderSimulation({ mode, setMode, scope }) {
  const scopeLabel = useMemo(() => scopeToLabel(scope), [scope]);

  return (
    <div className="relative bg-white rounded-2xl shadow-md px-3 py-2 md:py-1.5 border border-slate-200">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-3 md:gap-0">
        {/* TITRE compact */}
        <div className="flex flex-col justify-center min-w-0 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-[#005EA8] rounded-full shrink-0" />
            <motion.h1
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35 }}
              className="text-xs md:text-[13px] font-semibold text-slate-800 leading-tight truncate"
              title={`Simulation des Effectifs – ${scopeLabel}`}
            >
              Simulation des Effectifs –{" "}
              <span className="text-[#005EA8] font-bold block md:inline">{scopeLabel}</span>
            </motion.h1>
          </div>

          <p className="text-[10px] text-slate-500 ml-3 mt-0.5 font-medium leading-tight">
            Analyse détaillée •{" "}
            {mode === "recommande" ? "Processus Recommandé" : "Processus Actuel"}
          </p>
        </div>

        {/* TOGGLE encore plus light */}
        <div className="bg-slate-50 p-1 rounded-lg border border-slate-200 shrink-0 w-full md:w-auto">
          <div className="flex items-center gap-1 justify-center md:justify-start">
            {["actuel", "recommande"].map((m) => (
              <motion.button
                key={m}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setMode(m)}
                className={`cursor-pointer px-3 py-1 rounded-md text-[11px] font-semibold transition-all
                  flex-1 md:flex-none md:min-w-[90px] text-center
                  ${mode === m
                    ? "bg-[#005EA8] text-white shadow-[0_3px_8px_rgba(0,94,168,0.25)]"
                    : "bg-white text-slate-600 hover:text-[#005EA8] hover:bg-blue-50"
                  }`}
              >
                {m === "actuel" ? "Actuel" : "Recommandé"}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
