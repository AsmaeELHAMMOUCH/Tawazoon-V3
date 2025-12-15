import { useState, useCallback, useEffect } from "react";
import { normalizeCentre } from "../utils/formatters"; // Correct import path

export function useDirectionData(api) {
  const [directions, setDirections] = useState([]);
  const [selectedDirection, setSelectedDirection] = useState(null);
  const [centres, setCentres] = useState([]);
  
  // Loading states
  const [loading, setLoading] = useState({
    dirs: false,
    centres: false,
    sim: false,
    consolide: false,
  });
  
  const [error, setError] = useState(null);

  // Consolidation state
  const [consolidation, setConsolidation] = useState({
    rows: [],
    totals: { etp_total: 0, etp_requis: 0, ecart: 0 }
  });

  // 1. Fetch Consolidation (Defined first to be used in others)
  const fetchConsolidation = useCallback(async (dirId, scope = "direction") => {
      setLoading(prev => ({...prev, consolide: true}));
      try {
          const res = await api.consolidePostes({ direction_id: dirId, scope });
          // Format expected: { rows: [], totals: {} }
           let rows = [];
           let totals = { etp_total: 0, etp_requis: 0, ecart: 0 };

           if (res && res.rows) {
               rows = res.rows;
               if (res.totals) totals = res.totals;
           } else if (Array.isArray(res)) {
               rows = res;
               totals = {
                   etp_total: rows.reduce((s, r) => s + (r.etp_total || 0), 0),
                   etp_requis: rows.reduce((s, r) => s + (r.etp_requis || 0), 0),
                   ecart: rows.reduce((s, r) => s + (r.ecart || 0), 0),
               };
           }
           setConsolidation({ rows, totals });
      } catch (err) {
          console.error("Consolidation fetch error", err);
          // Fallback handled in component or empty state
          setConsolidation({ rows: [], totals: { etp_total: 0, etp_requis: 0, ecart: 0 } });
      } finally {
          setLoading(prev => ({...prev, consolide: false}));
      }
  }, [api]);

  // 2. Fetch Directions on Mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(prev => ({ ...prev, dirs: true }));
      try {
        const data = await api.directions();
        if (mounted) setDirections(data || []);
      } catch (err) {
        console.error("Failed to fetch directions", err);
        if (mounted) setError("Impossible de charger les directions.");
      } finally {
        if (mounted) setLoading(prev => ({ ...prev, dirs: false }));
      }
    })();
    return () => { mounted = false; };
  }, [api]);

  // 3. Select Direction -> Fetch Centres
  const selectDirection = useCallback(async (dirId) => {
    setSelectedDirection(dirId);
    if (!dirId) {
      setCentres([]);
      setConsolidation({ rows: [], totals: { etp_total: 0, etp_requis: 0, ecart: 0 } });
      return;
    }

    setLoading(prev => ({ ...prev, centres: true }));
    setError(null);

    try {
      const data = await api.centresByDirection(dirId);
      const normalized = (Array.isArray(data) ? data : []).map(normalizeCentre);
      setCentres(normalized);
      
      // Also fetch consolidation if available immediately? 
      // Usually done separately or after simulation. 
      // Let's trigger it now to have initial state.
      // We assume runSimulation will refresh everything, but initial view needs data.
      await fetchConsolidation(dirId, "direction");

    } catch (err) {
      console.error("Failed to fetch centres for direction", dirId, err);
      setError("Erreur lors du chargement des centres.");
      setCentres([]);
    } finally {
      setLoading(prev => ({ ...prev, centres: false }));
    }
  }, [api, fetchConsolidation]);

  // 4. Run Simulation
  const runSimulation = useCallback(async (payload) => {
    setLoading(prev => ({ ...prev, sim: true }));
    setError(null);
    try {
      // payload: { direction_id, imported_volumes, productivite_pct, heures_net_jour... }
      const res = await api.simulate(payload);
      
      // The backend returns { par_direction: [ { direction_id, label, heures, fte_calcule, fte_arrondi }, ... ], totaux: ... }
      // In 'table' mode (Excel import), 'direction_id' in the response corresponds to the Centre ID.
      // We merge these results into our existing 'centres' list.
      
      if (res && res.par_direction) {
         setCentres(prevCentres => {
             // Create a map of results for quick lookup
             const resultMap = new Map(res.par_direction.map(r => [r.direction_id, r])); // direction_id holds Centre ID in table mode
             
             return prevCentres.map(centre => {
                 const simResult = resultMap.get(centre.id);
                 if (simResult) {
                     return {
                         ...centre,
                         // Update calculated fields
                         etp_calcule: simResult.fte_calcule,
                         etp_arrondi: simResult.fte_arrondi,
                         heures: simResult.heures,
                         // Recalculate ecart
                         ecart: (simResult.fte_arrondi || 0) - (centre.fte_actuel || 0)
                     };
                 }
                 return centre;
             });
         });
      }
      
      // Refresh consolidation after simulation
      if (payload.direction_id) {
          await fetchConsolidation(payload.direction_id, "direction");
      }

      return res;
    } catch (err) {
      console.error("Simulation failed", err);
      setError("Erreur lors de la simulation direction.");
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, sim: false }));
    }
  }, [api, fetchConsolidation]);

  return {
    directions,
    selectedDirection,
    centres,
    consolidation,
    loading,
    error,
    actions: {
      selectDirection,
      runSimulation,
      fetchConsolidation
    }
  };
}
