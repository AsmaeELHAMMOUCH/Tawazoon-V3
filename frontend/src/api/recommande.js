import axios from "axios";
import { API_BASE_URL } from "../lib/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token interceptor
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const fetchMetiersRecommande = async () => {
  const response = await api.get("/recommande/metiers");
  return response.data;
};

export const fetchTachesRecommande = async (metierId) => {
  const response = await api.get(`/recommande/metiers/${metierId}/taches`);
  return response.data;
};

export const fetchAllTachesRecommande = async () => {
  const response = await api.get("/recommande/taches/all");
  return response.data;
};

export const simulerRecommande = async (payload) => {
  const response = await api.post("/recommande/simuler", payload);
  return response.data;
};

export const fetchGraphData = async (metierId) => {
  const response = await api.get(`/recommande/graphe/${metierId}`);
  return response.data;
};

export const fetchRecommandeLogos = async () => {
  const response = await api.get("/recommande/logos");
  return response.data;
};

// --- GLOBAL RECOMMANDÉ ---
export const simulerGlobalRecommande = async (payload) => {
  const response = await api.post("/recommande/global/simuler", payload);
  return response.data;
};

export const exportGlobalRecommandeCsv = async (simulationId) => {
  const response = await api.get(`/recommande/global/${simulationId}/export-csv`, {
    responseType: "blob",
  });
  return response.data;
};

export const getGlobalRecommandeGraph = async (simulationId) => {
  const response = await api.get(`/recommande/global/${simulationId}/graph`);
  return response.data;
};

// --- NORMES DE DIMENSIONNEMENT RECOMMANDÉ ---
export const fetchNormesRecommandees = async () => {
  const response = await api.get("/recommande/normes");
  return response.data;
};

export const exportNormesRecommandeesCsv = async () => {
  const response = await api.get("/recommande/normes/export-xlsx", {
    responseType: "blob",
  });
  return response.data;
};

// --- COMPARAISON ACTUEL VS RECOMMANDÉ ---
export const simulerComparaisonActuelReco = async (payload) => {
  const response = await api.post("/comparaison/actuel-vs-recommande/simuler", payload);
  return response.data;
};

export const exportComparaisonActuelReco = async (params) => {
  const queryString = new URLSearchParams(params).toString();
  const response = await api.get(`/comparaison/actuel-vs-recommande/export?${queryString}`, {
    responseType: "blob",
  });
  return response.data;
};

// --- CAPACITÉ NOMINALE RECOMMANDÉ ---
export const fetchCapaciteNominaleRec = async () => {
  const response = await api.get("/recommande/capacite-nominale");
  return response.data;
};

export const exportCapaciteNominaleRecCsv = async () => {
  const response = await api.get("/recommande/capacite-nominale/export", {
    responseType: "blob",
  });
  return response.data;
};

// --- SCHÉMA PROCESS RECOMMANDÉ ---
export const fetchSchemaManifestRec = async () => {
    const response = await api.get("/recommande/schema-process");
    return response.data;
};

export const exportSchemaImageRec = async () => {
    const response = await api.get("/recommande/schema-process/image/download", {
        responseType: "blob"
    });
    return response.data;
};

// --- CHRONOGRAMME RECOMMANDÉ ---
export const fetchChronogrammeTachesRec = async () => {
  const response = await api.get("/recommande-chronogramme/taches");
  return response.data;
};

export const exportChronogrammeTachesRecCsv = async () => {
  const response = await api.get("/recommande-chronogramme/export-csv", {
    responseType: "blob",
  });
  return response.data;
};

export const fetchChronogrammePositionsRec = async () => {
  const response = await api.get("/recommande-chronogramme/positions");
  return response.data;
};

export const fetchChronogrammeGraphDataRec = async () => {
  const response = await api.get("/recommande-chronogramme/positions/graph");
  return response.data;
};
