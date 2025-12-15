// src/lib/mockDirectionBAM.js
// Mock construit à partir de ta feuille "Organisation régionale BAM"
// (extrait visible sur la capture). Tu pourras enrichir en ajoutant d'autres DR.

export function mockDirectionSim() {
  // Référentiel de productivité (minutes / unité)
  const MIN_BY_UNIT = {
    sacs: 2,        // 2 min par sac
    colis: 1.2,     // 1.2 min par colis
    courrier: 0.08, // 0.08 min par pli
  };

  // === Directions & centres (fidèles à la capture) ===========================
  // NB: L’Excel répète les lignes par centre — ici on déduplique et on conserve
  // l’essentiel (libellés + types).
  const DIRECTIONS = [
    {
      id: 1,
      code: "DR-MARRAKECH-AGADIR",
      label: "DIRECTION RÉGIONALE MARRAKECH-AGADIR",
      region: "AGADIR",
      centres: [
        // Centre de traitement & distribution (vue plusieurs fois sur la feuille)
        {
          id: 1001,
          label: "AGADIR CENTRE DE TRAITEMENT ET DISTRIBUTION",
          type1: "CENTRE DE TRAITEMENT ET DISTRIBUTION",
          type2: "CENTRE DE TRAITEMENT ET DISTRIBUTION",
        },
        // Bloc "CENTRE MESSAGERIE" (vue sur de nombreuses lignes)
        {
          id: 1002,
          label: "AGADIR CENTRE MESSAGERIE",
          type1: "CENTRE MESSAGERIE",
          type2: "CENTRE MESSAGERIE",
        },
        // Lignes "Autre"
        {
          id: 1003,
          label: "AIT BAHA (AGADIR)",
          type1: "Autre",
          type2: "CENTRE DE DISTRIBUTION",
        },
        {
          id: 1004,
          label: "AIT MELLOUL  CENTRE DE DISTRIBUTION",
          type1: "CENTRE DE DISTRIBUTION",
          type2: "CENTRE DE DISTRIBUTION",
        },
      ],
    },
    // ➜ Si ton Excel contient d’autres DR (Casablanca, Rabat, …),
    //    ajoute-les simplement ici avec la même structure.
  ];

  // utilitaire de calcul d'heures
  const hoursFromVolumes = (v) => {
    const mins =
      (Number(v.sacs || 0) * MIN_BY_UNIT.sacs) +
      (Number(v.colis || 0) * MIN_BY_UNIT.colis) +
      (Number(v.courrier || 0) * MIN_BY_UNIT.courrier) +
      (Number(v.scelles || 0) * MIN_BY_UNIT.scelles);
    return mins / 60;
  };

  return {
    // === Lookups =============================================================
    async directions() {
      // on retourne les directions (id + label) — ce dont ton écran a besoin
      await new Promise((r) => setTimeout(r, 80));
      return DIRECTIONS.map((d) => ({ id: d.id, label: d.label, region: d.region }));
    },

    async centres(directionId) {
      await new Promise((r) => setTimeout(r, 80));
      const d = DIRECTIONS.find((x) => x.id === Number(directionId));
      return d?.centres ?? [];
    },

    // === Simulation ==========================================================
    // Prend en charge 3 modes: "single" | "uniform" | "table"
    // - single  : { direction_id, volume }
    // - uniform : { vol_unique }  -> clone sur toutes les DR
    // - table   : { volumes_par_direction: [{direction_id, sacs, colis, courrier, scelles}, ...] }
    async simulate(payload) {
      await new Promise((r) => setTimeout(r, 120));
      const { mode, heures_net_jour = 8 } = payload || {};
      let rows = [];

      if (mode === "single") {
        const d = DIRECTIONS.find((x) => x.id === Number(payload.direction_id));
        const v = payload.volume || { sacs: 0, colis: 0, courrier: 0, scelles: 0 };
        rows = [{ direction_id: d?.id ?? 0, label: d?.label ?? "—", ...v }];
      }

      if (mode === "uniform") {
        const vu = payload.vol_unique || { sacs: 0, colis: 0, courrier: 0, scelles: 0 };
        rows = DIRECTIONS.map((d) => ({ direction_id: d.id, label: d.label, ...vu }));
      }

      if (mode === "table") {
        const table = Array.isArray(payload.volumes_par_direction)
          ? payload.volumes_par_direction
          : [];
        rows = DIRECTIONS.map((d) => {
          const found = table.find((x) => Number(x.direction_id) === d.id) || {};
          return { direction_id: d.id, label: d.label, ...found };
        });
      }

      const par_direction = rows.map((r) => {
        const heures = hoursFromVolumes(r);
        const fte_calc = heures / Math.max(0.0001, Number(heures_net_jour));
        return {
          direction_id: r.direction_id,
          label: r.label,
          heures: +heures.toFixed(2),
          fte_calcule: +fte_calc.toFixed(2),
          fte_arrondi: Math.ceil(fte_calc),
        };
      });

      const heures_total = par_direction.reduce((s, d) => s + d.heures, 0);
      const fte_total = par_direction.reduce((s, d) => s + d.fte_calcule, 0);
      const fte_total_arrondi = par_direction.reduce((s, d) => s + d.fte_arrondi, 0);

      return {
        par_direction,
        totaux: {
          heures_total: +heures_total.toFixed(2),
          fte_total: +fte_total.toFixed(2),
          fte_total_arrondi,
          heures_net_jour,
        },
      };
    },
  };
}

// Backward-compat alias expected by VueDirection.jsx
export function makeMockApiBAM() {
  return mockDirectionSim();
}
