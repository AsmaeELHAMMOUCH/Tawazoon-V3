import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8001",
});

export const simulerComparaison = (payload) =>
  api.post("/api/comparaison-effectif/simuler", payload).then((r) => r.data);

export const exportComparaisonXlsx = (params) =>
  api.get("/api/comparaison-effectif/export-xlsx", { params, responseType: "blob" });

export default api;
