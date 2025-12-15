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

  const handleSimulate = async (importedData) => {
    if (!selectedDirection) {
      alert("Veuillez sélectionner une Direction d'abord.");
      return;
    }

    let cleanImports = null;

    if (importedData && Array.isArray(importedData)) {
      cleanImports = importedData.map(row => {
        // Normalize keys approx
        const r = {};
        Object.keys(row).forEach(k => {
          const lowerK = k.toLowerCase();
          if (lowerK.includes("sac")) r.sacs = Number(row[k]) || 0;
          else if (lowerK.includes("colis")) r.colis = Number(row[k]) || 0;
          else if (lowerK.includes("scelle")) r.scelles = Number(row[k]) || 0;
          else if (lowerK.includes("ordinaire") || lowerK.includes("courrier")) r.courrier = (r.courrier || 0) + (Number(row[k]) || 0);
          else if (lowerK.includes("nom") || lowerK.includes("centre")) r.label = String(row[k]).trim();
        });

        // Find ID
        const match = centres.find(c =>
          (c.label || "").toLowerCase() === (r.label || "").toLowerCase()
        );
        if (match) r.id = match.id;

        return r;
      }).filter(r => r.id); // Only keep recognized centres
    }

    const payload = {
      mode: "direction", // explicit mode
      direction_id: selectedDirection,
      productivite: Number(productivite || 100),
      heures_net: Number(heuresNet || 7.5),
      imported_volumes: cleanImports
    };

    await actions.runSimulation(payload);
  };

  const openDetail = async (centre) => {
    setSelectedCentre(centre);
    setDetailModalOpen(true);
    setCentrePostes([]);
    setLoadingPostes(true);

    try {
      if (typeof api.postesByCentre === 'function') {
        const res = await api.postesByCentre(centre.id);
        // Normalize posts
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
  const kpis = {
    nb_centres: centres.length,
    etp_actuel: centres.reduce((s, c) => s + (c.fte_actuel || 0), 0),
    etp_calcule: centres.reduce((s, c) => s + (c.etp_calcule || 0), 0),
    ecart: centres.reduce((s, c) => s + (c.ecart || 0), 0)
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-10 space-y-6" style={{ zoom: 0.9 }}>


      <main className="px-6 max-w-[1600px] mx-auto">

        {/* Header & Selection */}
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
            {/* Volumes Import */}
            <div className="mb-6">
              <DirectionVolumesCard
                onSimulate={handleSimulate}
                loading={loading.sim}
              />
            </div>

            {/* Main Data: Centres list & Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              {/* Left: Table Centres */}
              <div className="xl:col-span-2">
                <DirectionCentresTable
                  centres={centres}
                  loading={loading.centres || loading.sim}
                  onOpenDetail={openDetail}
                />
              </div>

              {/* Right: Donuts / Charts */}
              <div className="xl:col-span-1">
                <DirectionDonutsRow centres={centres} />
              </div>
            </div>

            {/* Consolidation */}
            <div className="mt-6">
              <DirectionConsolideTable
                rows={consolidation.rows}
                totals={consolidation.totals}
                loading={loading.consolide}
              />
            </div>
          </>
        )}

        {/* Modal Detail */}
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
