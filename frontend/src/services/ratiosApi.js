import { API_BASE_URL } from "../lib/api";

const BASE_URL = `${API_BASE_URL}/ratios-productivite`;

const defaultHeaders = { "Content-Type": "application/json" };

async function postJson(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }
  return response.json();
}

async function postBlob(path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }
  return response.blob();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatScopeLabel(scope) {
  if (scope === "global") return "résultats";
  return `volume-${scope}`;
}

export const ratiosApi = {
  simulate: (payload) => postJson("/simuler", payload),

  exportCsv: async (params, scope = "global") => {
    const payload = { ...params, scope, format: "csv" };
    const blob = await postBlob("/export-csv", payload);
    downloadBlob(blob, `ratios_productivite_${formatScopeLabel(scope)}.csv`);
  },

  exportExcel: async (params, scope = "global") => {
    const payload = { ...params, scope, format: "excel" };
    const blob = await postBlob("/export-excel", payload);
    downloadBlob(blob, `ratios_productivite_${formatScopeLabel(scope)}.xlsx`);
  },
};
