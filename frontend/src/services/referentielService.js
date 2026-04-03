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

function parseFilenameFromDisposition(disposition) {
  if (!disposition) return null;
  const match = /filename\*?=(?:UTF-8''|)("?)([^";]+)\1/i.exec(disposition);
  return match ? match[2] : null;
}

export async function fetchReferentielManifest(signal) {
  const response = await fetch(`${API_BASE_URL}/referentiel/manifest`, {
    signal,
    headers: { Accept: "application/json" },
  });
  await throwIfError(response);
  return response.json();
}

export async function downloadReferentielImage(id, signal) {
  const response = await fetch(`${API_BASE_URL}/referentiel/image/${id}/download`, {
    method: "GET",
    signal,
  });
  await throwIfError(response);
  const blob = await response.blob();
  const filename =
    parseFilenameFromDisposition(response.headers.get("content-disposition")) ||
    `referentiel-${id}.png`;
  return { blob, filename };
}
