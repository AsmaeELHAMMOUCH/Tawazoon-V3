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
    <div className="h-[320px] grid place-items-center bg-gradient-to-br from-slate-50 to-white">
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
          className="mx-auto w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3"
        >
          <Play className="w-6 h-6 text-[#005EA8]" />
        </motion.div>

        <h3 className="text-lg font-semibold text-slate-900">Prêt à démarrer</h3>
        <p className="mt-1.5 text-sm text-slate-600">
          Configure les paramètres ci-dessus puis clique sur{" "}
          <span className="font-semibold text-[#005EA8]">Lancer Simulation</span>{" "}
          pour afficher les résultats ici.
        </p>

        {onSimuler && (
          <div className="mt-4">
            <button
              type="button"
              onClick={onSimuler}
              disabled={disabled}
              className="btn-cta inline-flex items-center gap-2"
              title={disabled ? "Sélectionnez un centre" : "Lancer la simulation"}
            >
              <Play className="w-4 h-4" />
              Lancer Simulation
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
