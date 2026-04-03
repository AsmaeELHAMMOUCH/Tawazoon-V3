import axios from "axios";

// Récupérer les données de capacité nominale
export const fetchCapaciteNominale = async () => {
    const response = await axios.get("/api/capacite-nominale/");
    return response.data; // { rows: [], total: {} }
};

// Télécharger l'export Excel
export const exportCapaciteNominaleXlsx = async () => {
    const response = await axios.get("/api/capacite-nominale/export-xlsx", {
        responseType: "blob",
    });
    return response;
};
