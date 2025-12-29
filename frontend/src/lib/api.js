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
    } catch (e) {}
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
    } catch (e) {}
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
    categorie_id: c.categorie_id ?? null,
    id_categorisation: c.id_categorisation ?? c.categorie_id ?? null,
  }));
}

function normalizePostes(payload) {
  const list =
    Array.isArray(payload) ? payload :
    Array.isArray(payload?.postes) ? payload.postes :
    Array.isArray(payload?.items) ? payload.items :
    [];
  return list.map((p, i) => ({
    id: p.id ?? p.poste_id ?? p.code ?? i,
    label: p.label ?? p.name ?? p.nom ?? p.nom_poste ?? String(p.id ?? p.poste_id ?? p.code ?? i),
    centre_id: p.centre_id ?? null,
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
      phase: t.phase ?? t.ph ?? t.etape ?? null,
      unit: cleanUnit, // ✅ Unité nettoyée
      avg_sec: t.avg_sec ?? (t.moyenne_min ? t.moyenne_min * 60 : 0),
      centre_poste_id: t.centre_poste_id ?? null,
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
    const data = await http(`/postes/${query}`);
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
      Array.isArray(payload.volumes) &&
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
            volumes: (payload.volumes || []).map((v) => ({
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
      return await http("/simulation/direction", { method: "POST", body, signal });
    }

    // --------------------
    // Cas Centre
    // --------------------
    if (!payload || !payload.centre_id) {
      throw new Error("centre_id est requis pour la simulation");
    }

    const body = {
      centre_id: Number(payload.centre_id),
      poste_id: payload.poste_id ? Number(payload.poste_id) : null,
      productivite: Number(payload.productivite ?? 85),
      heures_net: payload.heures_net ? Number(payload.heures_net) : null,
      volumes: {
        sacs: Number(payload.volumes?.sacs ?? 0),
        colis: Number(payload.volumes?.colis ?? 0),
        courrier: Number(payload.volumes?.courrier ?? 0),
        scelle: Number(payload.volumes?.scelle ?? 0),
      },
    };

    console.debug("simulate(api): payload=", body);
    const data = await http("/simulate", { method: "POST", body, signal });
    console.debug("simulate(api): response=", data);
    return data;
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
    const data = await http(`/centres/${encodeURIComponent(centreId)}`);
    console.debug("getCentre(api): raw=", data);
    return data;
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
    } catch {}
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
   * Health check
   */
  ping: async () => {
    return await http("/ping");
  },
};

// Export par défaut pour compatibilité
export default api;