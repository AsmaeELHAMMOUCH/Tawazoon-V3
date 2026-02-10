import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour persister les paramètres de simulation dans le localStorage
 * @param {string} key - Clé de stockage dans le localStorage
 * @param {*} initialValue - Valeur initiale si aucune valeur n'est trouvée
 * @returns {[*, function]} - [valeur, setter]
 */
export function usePersistedState(key, initialValue) {
  // Initialiser l'état avec la valeur du localStorage ou la valeur initiale
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Erreur lors de la lecture de ${key} depuis localStorage:`, error);
      return initialValue;
    }
  });

  // Sauvegarder dans le localStorage à chaque changement
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Erreur lors de la sauvegarde de ${key} dans localStorage:`, error);
    }
  }, [key, value]);

  return [value, setValue];
}

/**
 * Hook pour persister tous les paramètres de simulation
 */
export function useSimulationParams() {
  // Sélections
  const [region, setRegion] = usePersistedState('sim_region', '');
  const [centre, setCentre] = usePersistedState('sim_centre', '');
  const [poste, setPoste] = usePersistedState('sim_poste', '__ALL__');

  // Paramètres de performance
  const [productivite, setProductivite] = usePersistedState('sim_productivite', 100);
  const [idleMinutes, setIdleMinutes] = usePersistedState('sim_idleMinutes', 0);
  const [tauxComplexite, setTauxComplexite] = usePersistedState('sim_tauxComplexite', 1.0);
  const [natureGeo, setNatureGeo] = usePersistedState('sim_natureGeo', 1.0);

  // Paramètres ED et ratios
  const [edPercent, setEdPercent] = usePersistedState('sim_edPercent', 60);
  const [colisAmanaParSac, setColisAmanaParSac] = usePersistedState('sim_colisAmanaParSac', 10);
  const [courriersParSac, setCourriersParSac] = usePersistedState('sim_courriersParSac', 4500);
  const [colisParCollecte, setColisParCollecte] = usePersistedState('sim_colisParCollecte', 1);

  // 🆕 Axes vs Distribution (pourcentages UI 0-100)
  const [pctAxesArrivee, setPctAxesArrivee] = usePersistedState('sim_pctAxesArrivee', 40);
  const [pctAxesDepart, setPctAxesDepart] = usePersistedState('sim_pctAxesDepart', 30);

  // 🆕 Amana Specific (Image Request)
  const [pctRetenue, setPctRetenue] = usePersistedState('sim_pctRetenue', 1);
  const [pctEchantillon, setPctEchantillon] = usePersistedState('sim_pctEchantillon', 5);
  const [pctSac, setPctSac] = usePersistedState('sim_pctSac', 60);

  // 🆕 Collecte et Retour
  const [pctCollecte, setPctCollecte] = usePersistedState('sim_pctCollecte', 5.0);

  const [pctRetour, setPctRetour] = usePersistedState('sim_pctRetour', 0.0);
  const [pctInternational, setPctInternational] = usePersistedState('sim_pctInternational', 0.0);

  // 🆕 Shift
  const [shift, setShift] = usePersistedState('sim_shift', 1);

  // Helpers UI (sacs)
  const [nbrCoSac, setNbrCoSac] = usePersistedState('sim_nbrCoSac', 4500);
  const [nbrCrSac, setNbrCrSac] = usePersistedState('sim_nbrCrSac', 500);
  // 🆕 Helpers UI (caisson)
  const [crParCaisson, setCrParCaisson] = usePersistedState('sim_crParCaisson', 500);

  // Volumes journaliers (legacy)
  const [sacs, setSacs] = usePersistedState('sim_sacs', 0);
  const [colis, setColis] = usePersistedState('sim_colis', 0);
  const [courrier, setCourrier] = usePersistedState('sim_courrier', 0);
  const [scelle, setScelle] = usePersistedState('sim_scelle', 0);

  // Volumes annuels
  const [courrierOrdinaire, setCourrierOrdinaire] = usePersistedState('sim_courrierOrdinaire', 0);
  const [courrierRecommande, setCourrierRecommande] = usePersistedState('sim_courrierRecommande', 0);
  const [ebarkia, setEbarkia] = usePersistedState('sim_ebarkia', 0);
  const [lrh, setLrh] = usePersistedState('sim_lrh', 0);
  const [amana, setAmana] = usePersistedState('sim_amana', 0);

  // 🆕 Grille détaillée des volumes par flux/segment (pour VolumeParamsCard & BandoengGrid)
  const [volumesFluxGrid, setVolumesFluxGrid] = usePersistedState('sim_volumesFluxGrid', {
    amana: {
      depot: {
        gc: { global: "", local: "", axes: "" },
        part: { global: "", local: "", axes: "" }
      },
      recu: {
        gc: { global: "", local: "", axes: "" },
        part: { global: "", local: "", axes: "" }
      }
    },
    cr: {
      med: { global: "", local: "", axes: "" },
      arrive: { global: "", local: "", axes: "" }
    },
    co: {
      med: { global: "", local: "", axes: "" },
      arrive: { global: "", local: "", axes: "" }
    },
    ebarkia: { med: "", arrive: "" },
    lrh: { med: "", arrive: "" }
  });

  // 🆕 État détaillé pour le grid Bandoeng (Structure complexe)
  const [bandoengGridValues, setBandoengGridValues] = usePersistedState('sim_bandoeng_grid_values', {
    amana: {
      depot: {
        gc: { global: "", local: "", axes: "" },
        part: { global: "", local: "", axes: "" }
      },
      recu: {
        gc: { global: "", local: "", axes: "" },
        part: { global: "", local: "", axes: "" }
      }
    },
    cr: {
      med: { global: "", local: "", axes: "" },
      arrive: { global: "", local: "", axes: "" }
    },
    co: {
      med: { global: "", local: "", axes: "" },
      arrive: { global: "", local: "", axes: "" }
    },
    ebarkia: { med: "", arrive: "" },
    lrh: { med: "", arrive: "" }
  });

  return {
    // Sélections
    region, setRegion,
    centre, setCentre,
    poste, setPoste,

    // Performance
    productivite, setProductivite,
    idleMinutes, setIdleMinutes,
    tauxComplexite, setTauxComplexite,
    natureGeo, setNatureGeo,

    // ED et ratios
    edPercent, setEdPercent,
    colisAmanaParSac, setColisAmanaParSac,
    courriersParSac, setCourriersParSac,
    colisParCollecte, setColisParCollecte,
    nbrCoSac, setNbrCoSac,
    nbrCrSac, setNbrCrSac,
    crParCaisson, setCrParCaisson,

    // 🆕 Axes
    pctAxesArrivee, setPctAxesArrivee,
    pctAxesDepart, setPctAxesDepart,

    // 🆕 Collecte et Retour
    pctCollecte, setPctCollecte,
    pctRetour, setPctRetour,
    pctInternational, setPctInternational,
    shift, setShift,

    // 🆕 Amana Specific
    pctRetenue, setPctRetenue,
    pctEchantillon, setPctEchantillon,
    pctSac, setPctSac,

    // Volumes journaliers
    sacs, setSacs,
    colis, setColis,
    courrier, setCourrier,
    scelle, setScelle,

    // Volumes annuels
    courrierOrdinaire, setCourrierOrdinaire,
    courrierRecommande, setCourrierRecommande,
    ebarkia, setEbarkia,
    lrh, setLrh,
    amana, setAmana,

    // Grille flux/segment
    volumesFluxGrid, setVolumesFluxGrid,
    // 🆕 Grille Bandoeng
    bandoengGridValues, setBandoengGridValues,
  };
}
