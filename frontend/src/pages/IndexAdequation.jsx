import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function IndexAdequation() {
  const location = useLocation();
  const navigate = useNavigate();
  const centreLabel = location.state?.centreLabel || "Centre non selectionne";
  const centreId = location.state?.centreId;

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Index Adequation
            </h1>
            <p className="text-sm text-slate-500">
              Page d'analyse par centre.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Retour
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Centre selectionne
          </div>
          <div className="text-lg font-semibold text-slate-800">
            {centreLabel}
          </div>
          {centreId ? (
            <div className="text-xs text-slate-400">ID: {centreId}</div>
          ) : null}
        </div>

        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-sm text-slate-600">
          Contenu a definir pour l'indice d'adequation.
        </div>
      </div>
    </div>
  );
}

