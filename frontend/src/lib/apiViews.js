import { api } from "./api";

export const apiViews = {
  centre: async (payload) => {
    return await api.viewsCentre(payload);
  },
};
