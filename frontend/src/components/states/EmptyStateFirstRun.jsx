import React from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";

// Variants d'animation
const fadeCard = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" },
};

const floatIcon = {
  initial: { y: 0 },
  animate: { y: [0, -4, 0] },
  transition: { duration: 2, ease: "easeInOut", repeat: Infinity },
};

export function EmptyStateFirstRun({ onSimuler, disabled }) {
  return (
    <div className="h-full grid place-items-center bg-gradient-to-br from-slate-50 to-white">
      <motion.div
        initial={fadeCard.initial}
        animate={fadeCard.animate}
        transition={fadeCard.transition}
        className="text-center max-w-md px-6 py-6 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,.06)]"
      >
        <motion.div
          initial={floatIcon.initial}
          animate={floatIcon.animate}
          transition={floatIcon.transition}
          className="mx-auto w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-2"
        >
          <Play className="w-5 h-5 text-indigo-600" />
        </motion.div>

        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Prêt à démarrer</h3>
        <p className="mt-1 text-xs text-slate-500">
          Configure les paramètres ci-dessus puis clique sur{" "}
          <span className="font-semibold text-indigo-600">Lancer Simulation</span>{" "}
          pour afficher les résultats ici.
        </p>

        {onSimuler && (
          <div className="mt-3">
            <button
              type="button"
              onClick={onSimuler}
              disabled={disabled}
              className="px-4 py-1.5 rounded-full font-bold text-xs bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 mx-auto disabled:opacity-50 disabled:pointer-events-none disabled:bg-slate-300"
              title={disabled ? "Sélectionnez un centre" : "Lancer la simulation"}
            >
              <Play className="w-3 h-3 fill-current" />
              Lancer Simulation
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
