import axios from "axios";

export const fetchChronogrammeTaches = async () => {
  const response = await axios.get("/api/chronogramme/taches");
  return response.data;
};

export const exportChronogrammeTachesCsv = async () => {
  return axios.get("/api/chronogramme/taches/export-csv", {
    responseType: "arraybuffer",
  });
};

export const exportChronogrammeTachesXlsx = async () => {
  return axios.get("/api/chronogramme/taches/export-xlsx", {
    responseType: "arraybuffer",
  });
};

export const refreshChronogrammeCache = async () => {
  return axios.post("/api/chronogramme/taches/refresh-cache");
};

export const fetchChronogrammePositions = async () => {
  const response = await axios.get("/api/chronogramme/positions");
  return response.data;
};
