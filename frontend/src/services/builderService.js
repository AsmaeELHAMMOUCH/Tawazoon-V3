import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export const builderService = {
  getRefPostes: async () => {
    const res = await axios.get(`${API_URL}/api/builder/ref/postes`);
    return res.data;
  },
  getRefProduits: async () => {
    const res = await axios.get(`${API_URL}/api/builder/ref/produits`);
    return res.data;
  },
  getRefFamilles: async () => {
    const res = await axios.get(`${API_URL}/api/builder/ref/familles`);
    return res.data;
  },
  getRefTaches: async (produit, famille) => {
    const res = await axios.get(`${API_URL}/api/builder/ref/taches`, {
        params: { produit, famille }
    });
    return res.data;
  },
  createCentre: async (payload) => {
      const res = await axios.post(`${API_URL}/api/builder/create`, payload);
      return res.data;
  },
  getRegions: async () => {
      const res = await axios.get(`${API_URL}/api/regions`);
      return res.data;
  },
  getRefCategories: async () => {
      const res = await axios.get(`${API_URL}/api/builder/ref/categories`);
      return res.data;
  },
  getRefDirections: async () => {
      const res = await axios.get(`${API_URL}/api/builder/ref/directions`);
      return res.data;
  },
  importTaches: async (centreId, file) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API_URL}/api/taches/import/${centreId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
  },
  findSimilarCentre: async (categorieId) => {
      const res = await axios.get(`${API_URL}/api/builder/find_similar/${categorieId}`);
      return res.data;
  }
};
