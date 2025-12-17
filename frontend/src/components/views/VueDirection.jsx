"use client";
import React, { useState } from "react";
import { useDirectionData } from "../../hooks/useDirectionData";
import { useSimulation } from "../../context/SimulationContext";

// Components
import DirectionHeader from "../direction/DirectionHeader";
import DirectionVolumesCard from "../direction/DirectionVolumesCard";
import DirectionCentresTable from "../direction/DirectionCentresTable";
import DirectionDonutsRow from "../direction/DirectionDonutsRow";
import DirectionConsolideTable from "../direction/DirectionConsolideTable";
import DirectionPostesModal from "../direction/DirectionPostesModal";
import { normalizePoste } from "../../utils/formatters";

// ---------- Helpers ----------
const toNumber = (v, fallback = 0) => {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  const s = String(v).trim().replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
};

const normKey = (k) => String(k || "").toLowerCase().trim();

export default function VueDirection({ api }) {
  // 1. Data Hook
  const {
    directions,
    selectedDirection,
    centres,
    consolidation,
    loading,
    error,
    actions
  } = useDirectionData(api);

  // 2. Global Context
  const { productivite, heuresNet } = useSimulation();

  // 3. Local State for UI
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState(null);
  const [centrePostes, setCentrePostes] = useState([]);
  const [loadingPostes, setLoadingPostes] = useState(false);

  // 4. Handlers
  const handleSelectDirection = (id) => {
    actions.selectDirection(id);
  };

  /**
   * importedData: rows from Excel parser (array of objects)
   * Must be transformed into DirectionSimRequest.volumes (CentreVolume[])
   */
  const handleSimulate = async (importedData) => {
    if (!selectedDirection) {
      alert("Veuillez sélectionner une Direction d'abord.");
      return;
    }

    // Build volumes[] expected by backend
    const volumes = Array.isArray(importedData)
      ? importedData.map((row) => {
        const v = {
          centre_id: undefined,
          centre_label: undefined,
          sacs: 0,
          colis: 0,
          courrier_ordinaire: 0,
          courrier_recommande: 0,
          ebarkia: 0,
          lrh: 0,
          amana: 0
        };

        Object.keys(row || {}).forEach((k) => {
          const key = normKey(k);
          const val = row[k];

          // centre identity
          if (
            key.includes("nom du centre") ||
            (key.includes("nom") && key.includes("centre")) ||
            key.includes("centre") ||
            key.includes("site")
          ) {
            v.centre_label = String(val ?? "").trim();
            return;
          }

          if (key === "id" || key === "centre_id" || key.includes("code")) {
            v.centre_id = toNumber(val, undefined);
            return;
          }

          // volumes
          if (key.includes("sac")) v.sacs = toNumber(val, 0);
          else if (key.includes("colis")) v.colis = toNumber(val, 0);
          else if (key.includes("ordinaire")) v.courrier_ordinaire = toNumber(val, 0);
          else if (key.includes("recommande")) v.courrier_recommande = toNumber(val, 0);
          else if (key.includes("ebarkia")) v.ebarkia = toNumber(val, 0);
          else if (key.includes("lrh") || key.includes("24")) v.lrh = toNumber(val, 0);
          // Ordre important: amana par sac vs amana volume annuel
          else if (key.includes("colis_amana") && key.includes("sac")) v.colis_amana_par_sac = toNumber(val, null);
          else if (key.includes("amana")) v.amana = toNumber(val, 0);
          else if (key.includes("courrier") && key.includes("sac")) v.courriers_par_sac = toNumber(val, null);
        });

        // fallback: if you used "label" column in your excel parser
        if (!v.centre_label && row?.label) v.centre_label = String(row.label).trim();

        return v;
      })
      : [];

    // IMPORTANT: backend mode must be "actuel" or "recommande"
    // If you have a toggle in UI, plug it here. For now: default "actuel".
    const payload = {
      direction_id: Number(selectedDirection),
      mode: "actuel",
      global_params: {
        productivite: toNumber(productivite, 100),
        heures_par_jour: toNumber(heuresNet, 7.5),
        idle_minutes: 0
      },
      volumes
    };

    await actions.runSimulation(payload);
  };

  const openDetail = async (centre) => {
    setSelectedCentre(centre);
    setDetailModalOpen(true);
    setCentrePostes([]);
    setLoadingPostes(true);

    try {
      if (typeof api.postesByCentre === "function") {
        const res = await api.postesByCentre(centre.id);
        const normalized = (Array.isArray(res) ? res : []).map(normalizePoste);
        setCentrePostes(normalized);
      } else {
        console.warn("api.postesByCentre is not defined");
        setCentrePostes([]);
      }
    } catch (err) {
      console.error("Error fetching postes", err);
    } finally {
      setLoadingPostes(false);
    }
  };

  // 5. KPIs Construction
  const kpis =
    consolidation?.totals && consolidation.totals.nb_centres > 0
      ? {
        nb_centres: consolidation.totals.nb_centres,
        etp_actuel: consolidation.totals.etp_total || consolidation.totals.etp_actuel,
        etp_calcule: consolidation.totals.etp_requis || consolidation.totals.etp_calcule,
        ecart: consolidation.totals.ecart
      }
      : {
        nb_centres: centres.length,
        etp_actuel: centres.reduce((s, c) => s + (c.fte_actuel || 0), 0),
        etp_calcule: centres.reduce((s, c) => s + (c.etp_calcule || 0), 0),
        ecart: centres.reduce((s, c) => s + (c.ecart || 0), 0)
      };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-10 space-y-6" style={{ zoom: 0.9 }}>
      <main className="px-6 max-w-[1600px] mx-auto">
        <DirectionHeader
          directions={directions}
          selectedId={selectedDirection}
          onSelect={handleSelectDirection}
          kpis={kpis}
        />

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-200 text-sm mb-4">
            {error}
          </div>
        )}

        {selectedDirection && (
          <>
            <div className="mb-6">
              <DirectionVolumesCard onSimulate={handleSimulate} loading={loading.sim} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <DirectionCentresTable
                  centres={centres}
                  loading={loading.centres || loading.sim}
                  onOpenDetail={openDetail}
                />
              </div>

              <div className="xl:col-span-1">
                <DirectionDonutsRow centres={centres} charts={consolidation.charts} />
              </div>
            </div>

            {consolidation.rows && consolidation.rows.length > 0 && (
              <div className="mt-6">
                <DirectionConsolideTable
                  rows={consolidation.rows}
                  totals={consolidation.totals}
                  loading={loading.consolide}
                />
              </div>
            )}
          </>
        )}

        <DirectionPostesModal
          open={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          centre={selectedCentre}
          postes={centrePostes}
        />
      </main>
    </div>
  );
}
