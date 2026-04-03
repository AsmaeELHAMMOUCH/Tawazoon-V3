import axios from "axios";

const RAW_BASE = import.meta.env.VITE_API_URL || "http://localhost:8001";
const API_URL = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;

export const runSimulationGlobaleV3 = async (params) => {
  const response = await axios.post(`${API_URL}/simulation/globale/v3/run`, params);
  return response.data;
};

// Placeholder for future export endpoints
export const exportSimulationGlobaleExcel = async (params) => {
  const qs = new URLSearchParams(params).toString();
  const response = await axios.get(`${API_URL}/simulation/globale/v3/export/excel?${qs}`, {
    responseType: 'blob'
  });
  return response.data;
};

export const exportSimulationGlobalePdf = async (params) => {
  // We will handle PDF generation in the frontend using jsPDF
  console.log("PDF generation will be handled in frontend", params);
};
