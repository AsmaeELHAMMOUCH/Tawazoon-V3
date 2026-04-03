import { API_BASE_URL } from "../lib/api";

function throwIfError(response) {
  if (response.ok) {
    return response;
  }
  return response.text().then((body) => {
    const message = body?.trim() || `HTTP ${response.status}`;
    throw new Error(message);
  });
}

export async function fetchSchemaProcessManifest(signal) {
  const response = await fetch(`${API_BASE_URL}/schema-process/manifest`, {
    signal,
    headers: { Accept: "application/json" },
  });
  await throwIfError(response);
  return response.json();
}

function parseFilenameFromDisposition(disposition) {
  if (!disposition) return null;
  const match = /filename\*?=(?:UTF-8''|)("?)([^";]+)\1/i.exec(disposition);
  return match ? match[2] : null;
}

export async function downloadSchemaProcessImage(id, signal) {
  const response = await fetch(`${API_BASE_URL}/schema-process/image/${id}/download`, {
    method: "GET",
    signal,
  });
  await throwIfError(response);
  const blob = await response.blob();
  const filename = parseFilenameFromDisposition(response.headers.get("content-disposition")) || `schema-${id}.png`;
  return { blob, filename };
}
