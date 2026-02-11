// src/lib/api.js
const envBase = import.meta.env.VITE_API_BASE || "";
// Hack: Ignore unreachable IP in dev to use Vite proxy
const cleanBase = envBase.includes("10.10.1.151") ? "" : envBase;
const API_BASE = cleanBase ? `${cleanBase}/api` : "/api";

function getToken() {
  const t = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
  // Simple validation to avoid "[object Object]" or empty tokens
  if (t && t !== "undefined" && t !== "null" && t !== "[object Object]" && t.length > 10) {
    return t;
  }
  // If invalid, clear it
  if (t) {
    try {
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_token");
    } catch (e) { }
  }
  return null;
}

async function http(path, { method = "GET", body, signal } = {}) {
  const headers = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    signal,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  // Handle Auth Failures
  if (res.status === 401 || res.status === 422) {
    try {
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_token");
    } catch (e) { }
  }

  const raw = await res.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!res.ok) {
    let msg = (data && (data.error || data.detail || data.message)) || `HTTP ${res.status}`;
    console.error("API Error Detail:", msg, data); // <--- LOG THE DETAIL
    if (typeof msg === "object") {
      msg = JSON.stringify(msg);
    }
    throw new Error(msg);
  }
  return data;
}

// ---- Helpers de normalisation ----
function normalizeRegions(payload) {
  const list =
    Array.isArray(payload) ? payload :
      Array.isArray(payload?.regions) ? payload.regions :
        Array.isArray(payload?.items) ? payload.items :
          [];

  return list.map((r, i) => ({
    id:
      r.id ??
      r.code ??
      r.id_region ??
      r.value ??
      r.region_id ??
      i,
    label:
      r.label ??
      r.name ??
      r.nom ??
      r.nom_region ??
      r.region ??
      String(r.id ?? r.code ?? r.id_region ?? r.value ?? r.region_id ?? i),
  }));
}

function normalizeCategories(payload) {
  const list =
    Array.isArray(payload) ? payload :
      Array.isArray(payload?.categories) ? payload.categories :
        Array.isArray(payload?.items) ? payload.items :
          [];
  return list.map((c, i) => ({
    id: c.id ?? c.categorie_id ?? c.code ?? i,
    label: c.label ?? c.name ?? c.nom ?? c.nom_categorie ?? String(c.id ?? c.categorie_id ?? i),
  }));
}

function normalizeCentres(payload) {
  const list =
    Array.isArray(payload) ? payload :
      Array.isArray(payload?.centres) ? payload.centres :
        Array.isArray(payload?.items) ? payload.items :
          [];

  // DEBUG SPECIFIC FOR VALFLEURI
  const valfleuri = list.find(x => x.label && x.label.includes("VALFLEURI"));
  if (valfleuri) {
    console.log("DEBUG API VALFLEURI RAW:", valfleuri);
  }

  return list.map((c, i) => ({
    id: c.id ?? c.centre_id ?? c.code ?? i,
    label: c.label ?? c.name ?? c.nom ?? c.nom_centre ?? String(c.id ?? c.centre_id ?? c.code ?? i),
    region_id: c.region_id ?? null,
    direction_id: c.direction_id ?? null, // ✅ NEW FIELD
    categorie_id: c.categorie_id ?? null,
    categorie_id: c.categorie_id ?? null,
    id_categorisation: c.id_categorisation ?? c.categorie_id ?? null,
    categorisation_label: c.categorisation_label ?? null, // ✅ NEW FIELD
    t_aps: Number(c.t_aps ?? c.t_aps_global ?? c.aps_legacy ?? c.T_APS ?? c.aps ?? 0),
    aps: Number(c.aps ?? c.t_aps ?? c.t_aps_global ?? c.aps_legacy ?? c.T_APS ?? 0),
    cas: (c.cas !== null && c.cas !== undefined) ? Number(c.cas) : null,
  }));
}

function normalizePostes(payload) {
  const list =
    Array.isArray(payload) ? payload :
      Array.isArray(payload?.postes) ? payload.postes :
        Array.isArray(payload?.items) ? payload.items :
          [];
  return list.map((p, i) => ({
    id: p.id ?? p.poste_id ?? p.code ?? p.Code ?? i,
    label: p.label ?? p.name ?? p.nom ?? p.nom_poste ?? String(p.id ?? p.poste_id ?? p.code ?? p.Code ?? i),
    code: p.code ?? p.Code ?? null,
    centre_id: p.centre_id ?? null,
    centre_poste_id: p.centre_poste_id ?? null,
    effectif_actuel: Number(
      p.effectif_actuel ??
      p.effectif_Actuel ??      // casse différente renvoyée par certains backends
      p.effectifActuel ??       // camelCase
      p.effectifStatutaire ??   // parfois nommé ainsi
      p.effectif_statutaire ??
      p.effectif_total ??
      p.effectif ??
      p.etp_actuel ??
      p.etpActuel ??
      p.fte_actuel ??
      p.fteActuel ??
      p.etp ??
      p.fte ??
      0
    ),
    type_poste: p.type_poste ?? null,
  }));
}

function normalizeTaches(payload) {
  const list =
    Array.isArray(payload) ? payload :
      Array.isArray(payload?.taches) ? payload.taches :
        Array.isArray(payload?.items) ? payload.items :
          [];
  return list.map((t, i) => {
    // 🔴 CORRECTION : Nettoyer "minute"
    const rawUnit = t.unit ?? t.unite ?? t.unite_mesure;
    const cleanUnit = rawUnit === "minute" ? "" : (rawUnit || "");

    return {
      id: t.id ?? i,
      task: t.task ?? t.tache ?? t.nom_tache ?? t.name ?? "Tâche inconnue",
      famille: t.famille_uo ?? t.famille ?? "",
      etat: t.etat ?? "A", // ✅ Par défaut Actif
      phase: t.phase ?? t.ph ?? t.etape ?? null,
      produit: t.produit ?? "",
      base_calcul: t.base_calcul ?? null,
      nom_poste: t.nom_poste ?? t.poste_label ?? null, // ✅ Ajout du nom du poste
      type_poste: t.type_poste ?? null, // ✅ Type de poste
      unit: cleanUnit, // ✅ Unité nettoyée
      avg_sec: t.avg_sec ?? (t.moyenne_min ? t.moyenne_min * 60 : 0),
      // Pass through raw DB values for precision display
      moyenne_min: t.moyenne_min ?? 0,
      min_min: t.min_min ?? null,
      min_sec: t.min_sec ?? t.moy_sec ?? null,
      moy_sec: t.moy_sec ?? t.min_sec ?? null, // ✅ Capture moy_sec correctly
      centre_poste_id: t.centre_poste_id ?? null,
      ordre: t.ordre ?? null, // ✅ Ordre d'affichage
    };
  });
}

// ---- API publique ----
export const api = {
  /**
   * Récupère toutes les régions
   */
  regions: async () => {
    const data = await http("/regions/");
    const out = normalizeRegions(data);
    console.debug("regions(api): raw=", data, " normalized=", out);
    return out;
  },

  /**
   * Récupère les catégories (filtrées par région optionnelle)
   */
  categories: async (regionId = null) => {
    const query = regionId ? `?region_id=${encodeURIComponent(regionId)}` : "";
    const data = await http(`/categories/${query}`);
    const out = normalizeCategories(data);
    console.debug("categories(api): raw=", data, " normalized=", out);
    return out;
  },

  /**
   * Récupère les catégorisations (Classe A, B, etc.)
   */
  categorisations: async () => {
    const data = await http(`/categorisations`);
    // Réutilise normalizeCategories car structure id/label identique
    const out = normalizeCategories(data);
    console.debug("categorisations(api): raw=", data, " normalized=", out);
    return out;
  },

  /**
   * Récupère les centres (filtrés par région et/ou catégorie)
   */
  centres: async (regionId = null, categorieId = null) => {
    const params = new URLSearchParams();
    if (regionId) {
      const numericRegionId = Number(regionId);
      if (!isNaN(numericRegionId)) {
        params.append("region_id", numericRegionId);
      }
    }
    if (categorieId) {
      const numericCategorieId = Number(categorieId);
      if (!isNaN(numericCategorieId)) {
        params.append("categorie_id", numericCategorieId);
      }
    }

    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await http(`/centres/${query}`);
    const out = normalizeCentres(data);
    console.debug("centres(api):", { raw: data, normalized: out });
    return out;
  },

  /**
   * Récupère les postes d'un centre ou d'une région
   */
  postes: async (centreId = null, regionId = null) => {
    const params = new URLSearchParams();
    if (centreId) params.append("centre_id", centreId);
    if (regionId) params.append("region_id", regionId);

    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await http(`/postes${query}`);
    const out = normalizePostes(data);
    console.debug("postes(api): raw=", data, " normalized=", out);
    return out;
  },

  /**
   * Récupère les tâches avec filtres optionnels
   */
  taches: async ({ centreId, posteId, categorieId, regionId } = {}) => {
    const params = new URLSearchParams();
    if (centreId) params.append("centre_id", centreId);
    if (posteId) params.append("poste_id", posteId);
    if (categorieId) params.append("categorie_id", categorieId);
    if (regionId) params.append("region_id", regionId);

    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await http(`/taches/${query}`);
    const out = normalizeTaches(data);
    console.debug("taches(api): raw=", data, " normalized=", out);
    return out;
  },

  /**
   * Lance une simulation d'effectifs
   */
  simulate: async (payload, signal = null) => {
    // --------------------
    // Cas Direction (V2 + Legacy)
    // --------------------
    const isDirectionV2 =
      payload &&
      payload.direction_id &&
      (Array.isArray(payload.volumes) || Array.isArray(payload.volumes_matriciels)) &&
      payload.global_params;

    const isDirectionLegacy = payload?.mode === "direction";

    if (isDirectionV2 || isDirectionLegacy) {
      const body = isDirectionV2
        ? {
          direction_id: Number(payload.direction_id),
          mode: payload.mode === "recommande" ? "recommande" : "actuel",
          global_params: {
            productivite: Number(payload.global_params?.productivite ?? 100),
            heures_par_jour: Number(payload.global_params?.heures_par_jour ?? 7.5),
            idle_minutes: Number(payload.global_params?.idle_minutes ?? 0),
          },
          // Si volumes_matriciels est déjà dans le payload (nouveau format)
          ...(payload.volumes_matriciels && payload.volumes_matriciels.length > 0
            ? {
              volumes_matriciels: payload.volumes_matriciels.map((v) => ({
                centre_id: v.centre_id ? Number(v.centre_id) : null,
                centre_label: v.centre_label ?? null,
                flux_id: v.flux_id !== null && v.flux_id !== undefined ? Number(v.flux_id) : null,
                sens_id: Number(v.sens_id),
                segment_id: Number(v.segment_id),
                volume: Number(v.volume ?? 0),
              })),
            }
            : {}),
          // Si volumes classiques avec flux_id (détection automatique)
          ...(payload.volumes && payload.volumes.length > 0 && payload.volumes[0].flux_id !== undefined
            ? {
              volumes_matriciels: payload.volumes.map((v) => ({
                centre_id: v.centre_id ? Number(v.centre_id) : null,
                centre_label: v.centre_label ?? null,
                flux_id: v.flux_id !== null && v.flux_id !== undefined ? Number(v.flux_id) : null,
                sens_id: Number(v.sens_id),
                segment_id: Number(v.segment_id),
                volume: Number(v.volume ?? 0),
              })),
            }
            : {}),
          // Si volumes classiques sans flux_id (ancien format)
          ...(payload.volumes && payload.volumes.length > 0 && !payload.volumes[0].flux_id && !payload.volumes_matriciels
            ? {
              volumes: payload.volumes.map((v) => ({
                centre_id: v.centre_id ? Number(v.centre_id) : null,
                centre_label: v.centre_label ?? null,
                sacs: Number(v.sacs ?? 0),
                colis: Number(v.colis ?? 0),
                courrier_ordinaire: Number(v.courrier_ordinaire ?? 0),
                courrier_recommande: Number(v.courrier_recommande ?? 0),
                ebarkia: Number(v.ebarkia ?? 0),
                lrh: Number(v.lrh ?? 0),
                amana: Number(v.amana ?? 0),
              })),
            }
            : {}),
        }
        : {
          direction_id: Number(payload.direction_id),
          mode: "actuel",
          global_params: {
            productivite: Number(payload.productivite ?? 100),
            heures_par_jour: Number(payload.heures_net ?? 7.5),
            idle_minutes: Number(payload.idle_minutes ?? 0),
          },
          volumes: (payload.imported_volumes || []).map((v) => ({
            centre_id: v.centre_id ? Number(v.centre_id) : null,
            centre_label: v.centre_label || v.label || null,
            sacs: Number(v.sacs ?? 0),
            colis: Number(v.colis ?? 0),
            courrier_ordinaire: Number(v.courrier_ordinaire ?? v.courrier ?? 0),
            courrier_recommande: Number(v.courrier_recommande ?? 0),
            ebarkia: Number(v.ebarkia ?? 0),
            lrh: Number(v.lrh ?? 0),
            amana: Number(v.amana ?? 0),
          })),
        };

      console.debug("simulate(api) [DIRECTION V2]: body=", body);
      return await http("/simulation/direction/v2", { method: "POST", body, signal });
    }

    // --------------------
    // Cas Centre
    // --------------------
    if (!payload || !payload.centre_id) {
      throw new Error("centre_id est requis pour la simulation");
    }

    // Correction : Mappage des volumes (VueCentre envoie un format mixte)
    const vol = payload.volumes || {};

    // 1. Volumes Journaliers (SACS, COLIS)
    const volumesJournaliers = {
      sacs: Number(vol.sacs ?? vol.SACS ?? 0),
      colis: Number(vol.colis ?? vol.COLIS ?? 0),
      courriers_par_sac: vol.courriers_par_sac ? Number(vol.courriers_par_sac) : undefined,
      colis_amana_par_sac: vol.colis_amana_par_sac ? Number(vol.colis_amana_par_sac) : undefined,
      colis_par_collecte: vol.colis_par_collecte ? Number(vol.colis_par_collecte) : undefined
    };

    // 2. Volumes Annuels (AMANA, CO, CR, etc.)
    const volumesAnnuels = {
      courrier_ordinaire: Number(vol.CO ?? vol.courrier_ordinaire ?? 0),
      courrier_recommande: Number(vol.CR ?? vol.courrier_recommande ?? 0),
      ebarkia: Number(vol.EBARKIA ?? vol.ebarkia ?? 0),
      lrh: Number(vol.LRH ?? vol.lrh ?? 0),
      amana: Number(vol.AMANA ?? vol.amana ?? 0)
    };

    const body = {
      centre_id: Number(payload.centre_id),
      poste_id: payload.poste_id ? Number(payload.poste_id) : null,
      productivite: Number(payload.productivite ?? 85),
      heures_net: payload.heures_net ? Number(payload.heures_net) : null,
      idle_minutes: payload.idle_minutes ? Number(payload.idle_minutes) : 0,
      volumes: volumesJournaliers,
      volumes_annuels: volumesAnnuels
    };

    console.log('\n' + '='.repeat(80));
    console.log('📤 [FRONTEND - API] Envoi de la simulation au backend');
    console.log('='.repeat(80));
    console.log('📍 Centre ID:', body.centre_id);
    console.log('📍 Poste ID:', body.poste_id);
    console.log('⚙️  Productivité:', body.productivite + '%');
    console.log('⏱️  Heures nettes:', body.heures_net + 'h');
    console.log('💤 Idle minutes:', body.idle_minutes + ' min');
    console.log('\n📦 Volumes Journaliers:');
    console.log('   - sacs:', volumesJournaliers.sacs);
    console.log('   - colis:', volumesJournaliers.colis);
    console.log('   - courriers_par_sac:', volumesJournaliers.courriers_par_sac);
    console.log('   - colis_amana_par_sac:', volumesJournaliers.colis_amana_par_sac);
    console.log('   - colis_par_collecte:', volumesJournaliers.colis_par_collecte);
    console.log('\n📅 Volumes Annuels:');
    console.log('   - courrier_ordinaire:', volumesAnnuels.courrier_ordinaire);
    console.log('   - courrier_recommande:', volumesAnnuels.courrier_recommande);
    console.log('   - ebarkia:', volumesAnnuels.ebarkia);
    console.log('   - lrh:', volumesAnnuels.lrh);
    console.log('   - amana:', volumesAnnuels.amana);
    console.log('\n🔍 Payload Original Reçu:');
    console.log('   payload.volumes:', payload.volumes);
    console.log('='.repeat(80) + '\n');

    console.debug("simulate(api): payload sent to backend=", body);
    const data = await http("/simulate", { method: "POST", body, signal });

    console.log('\n' + '='.repeat(80));
    console.log('✅ [FRONTEND - API] Réponse reçue du backend');
    console.log('='.repeat(80));
    console.log('📊 Résultat:', data);
    console.log('='.repeat(80) + '\n');

    console.debug("simulate(api): response from backend=", data);
    return data;
  },

  /**
   * Simulation Data-Driven pour un intervenant
   */
  simulateDataDriven: async (centrePosteId, volumesUI, params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = `/simulation-dd/intervenant/${centrePosteId}${query ? '?' + query : ''}`;
    return await http(url, { method: "POST", body: volumesUI });
  },

  /**
   * Simulation Data-Driven pour un centre
   */
  simulateDataDrivenCentre: async (centreId, volumesUI, params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = `/simulation-dd/centre/${centreId}${query ? '?' + query : ''}`;
    return await http(url, { method: "POST", body: volumesUI });
  },

  /**
   * Calcul des Paramètres Globaux
   */
  globalParams: async (payload) => {
    return await http("/global-params", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * Récupère les détails d'un centre
   */
  getCentre: async (centreId) => {
    if (!centreId) throw new Error("centreId requis");
    // Utilisation de la route de liste avec filtre car /centres/{id} n'existe pas
    const data = await http(`/centres?centre_id=${encodeURIComponent(centreId)}`);
    const list = normalizeCentres(data);
    console.debug("getCentre(api): raw=", data, " normalized=", list[0]);
    return list[0] || null;
  },

  /**
   * Récupère les associations centre-poste avec effectifs
   */
  centrePostes: async (centreId = null, posteId = null) => {
    const params = new URLSearchParams();
    if (centreId) params.append("centre_id", centreId);
    if (posteId) params.append("poste_id", posteId);

    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await http(`/centre-postes/${query}`);
    console.debug("centrePostes(api): raw=", data);
    return data;
  },

  /*
   * Authentification
   */
  login: async (credentials) => {
    const data = await http("/login", {
      method: "POST",
      body: credentials,
    });
    return data;
  },

  logout: async () => {
    try {
      await http("/logout", { method: "POST" });
    } catch { }
  },

  me: async () => {
    return await http("/user/me");
  },

  /*
   * Activités
   */
  activites: async () => {
    return await http("/activites");
  },

  /*
   * Vues spécifiques (Siege, etc.)
   */
  analyseUnite: async () => {
    return await http("/analyse-unite");
  },

  consolideSiege: async () => {
    return await http("/consolide-siege");
  },

  siegePostes: async (uniteId) => {
    return await http(`/siege-postes?unite_id=${encodeURIComponent(uniteId)}`);
  },

  /*
   * Direction / VueDirection
   */
  directions: async () => {
    return await http("/directions");
  },

  centresByDirection: async (directionId) => {
    return await http(`/directions/${encodeURIComponent(directionId)}/centres`);
  },

  postesByCentre: async (centreId) => {
    return await http(`/postes?centre_id=${encodeURIComponent(centreId)}`);
  },

  consolidePostes: async ({ scope, direction_id } = {}) => {
    const p = new URLSearchParams();
    if (scope) p.append("scope", scope);
    if (direction_id) p.append("direction_id", direction_id);
    return await http(`/consolide-postes?${p.toString()}`);
  },

  viewsCentre: async (payload) => {
    return await http("/views/centre", {
      method: "POST",
      body: payload,
    });
  },

  vueCentreOptimisee: async (payload) => {
    return await http("/vue-centre-optimisee", {
      method: "POST",
      body: payload,
    });
  },

  vueIntervenantDetails: async (centreId) => {
    return await http(`/vue-intervenant-details?centre_id=${encodeURIComponent(centreId)}`);
  },

  /**
   * Historique des simulations
   */
  getSimulationHistory: async ({ centre_id, user_id, limit, offset } = {}) => {
    const params = new URLSearchParams();
    if (centre_id) params.append("centre_id", centre_id);
    if (user_id) params.append("user_id", user_id);
    if (limit) params.append("limit", limit);
    if (offset) params.append("offset", offset);

    const query = params.toString() ? `?${params.toString()}` : "";
    return await http(`/history${query}`);
  },

  getSimulationReplay: async (simulationId) => {
    return await http(`/replay/${simulationId}`);
  },

  exportHistoryExcel: async ({ centre_id } = {}) => {
    const params = new URLSearchParams();
    if (centre_id) params.append("centre_id", centre_id);

    // On veut le blob, pas JSON
    const t = getToken();
    const headers = {};
    if (t) headers.Authorization = `Bearer ${t}`;

    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE}/export/history/excel${query}`, {
      method: "GET",
      headers
    });

    if (!res.ok) throw new Error("Erreur export Excel");
    return await res.blob();
  },

  // --- Bandoeng Simulation ---
  simulateBandoengDirect: async (payload) => {
    return await http("/bandoeng/simulate-bandoeng", { method: "POST", body: payload });
  },

  downloadBandoengVolumesTemplate: async () => {
    const t = getToken();
    const headers = {};
    if (t) headers.Authorization = `Bearer ${t}`;

    const res = await fetch(`${API_BASE}/bandoeng/import-template`, {
      method: "GET",
      headers
    });

    if (!res.ok) throw new Error("Erreur téléchargement modèle");
    const blob = await res.blob();

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Modele_Import_Volumes_Bandoeng.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  importBandoengVolumes: async (file) => {
    const t = getToken();
    const headers = {};
    if (t) headers.Authorization = `Bearer ${t}`;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/bandoeng/import/volume-grid`, {
      method: "POST",
      headers,
      body: formData
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Erreur import volumes");
    }
    return await res.json();
  },

  // --- National Simulation ---
  nationalSimulation: (params) => http("/national", { method: "POST", body: params }),
  importVolumesRef: (data) => http("/volumes/import-ref", { method: "POST", body: data }),

  /**
   * Mise à jour de la catégorisation d'un centre
   * @param {Array} postes - Liste optionnelle de {centre_poste_id, etp_arrondi}
   */
  updateCentreCategorisation: async (centreId, categorisationId, postes = [], volumes = null) => {
    return await http(`/centres/${centreId}/categorisation`, {
      method: "PUT",
      body: {
        categorisation_id: Number(categorisationId),
        postes: postes,
        volumes: volumes
      },
    });
  },

  /**
   * Récupère les volumes de référence d'un centre
   */
  getCentreVolumes: async (centreId) => {
    return await http(`/centres/${centreId}/volumes`);
  },

  /**
   * Mise à jour de la typologie d'un centre (AM, CCC, etc.)
   */
  updateCentreTypology: async (centreId, typologyId) => {
    return await http(`/centres/${centreId}/typologie`, {
      method: "PUT",
      body: {
        typology_id: Number(typologyId),
      },
    });
  },

  /**
   * Sauvegarde une simulation pour la catégorisation
   */
  saveCategSimulation: async (data) => {
    return await http("/categorisation/save-simulation", {
      method: "POST",
      body: data,
    });
  },

  /**
   * Récupère la dernière simulation de catégorisation pour un centre
   */
  getLatestCategSimulation: async (centreId) => {
    return await http(`/categorisation/latest/${centreId}`);
  },

  /**
   * Taches Management
   */
  createTache: (data) => http('/taches', { method: 'POST', body: data }),
  updateTache: (id, data) => http(`/taches/${id}`, { method: 'PUT', body: data }),
  deleteTache: (id) => http(`/taches/${id}`, { method: 'DELETE' }),
  deleteTachesByCentre: (centreId) => http(`/taches/centre/${centreId}`, { method: 'DELETE' }),

  importTaches: async (centreId, file, posteId = null) => {
    const t = getToken();
    const headers = {};
    if (t) headers.Authorization = `Bearer ${t}`;

    const formData = new FormData();
    formData.append('file', file);

    let url = `${API_BASE}/taches/import/${centreId}`;
    if (posteId) url += `?poste_id=${posteId}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Import Failed");
    }
    return await res.json();
  },

  /**
   * Health check
   */
  updateCentreDetail: async (centreId, payload) => {
    return await http(`/builder/update/${centreId}`, { method: 'PUT', body: payload });
  },

  ping: async () => {
    return await http("/ping");
  },
};

// Export par défaut pour compatibilité
export default api;

// Export des méthodes individuelles pour l'import destructuré
export const {
  downloadBandoengVolumesTemplate,
  importBandoengVolumes
} = api;
