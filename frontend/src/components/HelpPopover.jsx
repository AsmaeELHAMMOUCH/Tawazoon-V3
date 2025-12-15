// HelpPopover.jsx (exemple)
import { useState } from "react";
import { createPortal } from "react-dom";

export default function HelpPopover({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900"
      >
        {children}
      </button>

      {open &&
        createPortal(
          <div
            className="fixed z-[80] right-6 top-[88px]" // ajuste top à la hauteur de ton header
            role="dialog"
          >
            <div className="w-[380px] rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="p-4">
                <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-800">
                  <li>Choisissez les <b>Paramètres principaux</b>…</li>
                  <li>Renseignez les <b>Volumes & Productivité</b>.</li>
                  <li>Cliquez sur <b>Lancer Simulation</b>.</li>
                  <li>Basculez <b>Tableau/Graphe</b> si besoin.</li>
                </ol>
                <div className="mt-3 text-sm">
                  <div className="font-semibold mb-1">Astuces</div>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700">
                    <li>Le sélecteur <b>Actuel / Recommandé</b> change l’hypothèse.</li>
                    <li>Export <b>PDF</b> par section.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
