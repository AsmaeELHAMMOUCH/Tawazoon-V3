import axios from "axios";

const base =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "") ||
  "http://localhost:8001";

const api = axios.create({ baseURL: base });

export const fetchMetiers = () => api.get("/api/simulateur/metiers").then((r) => r.data);
export const fetchTaches = (metierId) =>
  api.get("/api/simulateur/taches", { params: { metier_id: metierId } }).then((r) => r.data);
export const fetchAllTaches = () => api.get("/api/simulateur/taches/all").then((r) => r.data);
export const simuler = (payload) => api.post("/api/simulateur/simuler", payload).then((r) => r.data);

// Effectif global
export const simulerEffectifGlobal = (payload) =>
  api.post("/api/effectif-global/simuler", payload).then((r) => r.data);
export const exportEffectifGlobal = (params) =>
  api.get("/api/effectif-global/export", { params, responseType: "blob" });

export default api;
