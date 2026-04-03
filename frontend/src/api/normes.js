import axios from "axios";

// URL pour récupérer les normes JSON
export const fetchNormes = async () => {
    // Si la base URL est définie globalement, "/api/..." suffit.
    // Sinon on peut configurer BASE_URL.
    const response = await axios.get("/api/normes-dimensionnement/");
    return response.data; // { "rows": [...] }
};

// URL pour télécharger le fichier Excel
export const exportNormesXlsx = async () => {
    const response = await axios.get("/api/normes-dimensionnement/export-xlsx", {
        responseType: "blob",
    });
    return response;
};
