import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 12_000,
});

export const tokenApi = {
  createToken: async (payload) => {
    const response = await api.post("/tokens/create", payload);
    return response.data;
  },
  getMyToken: async (tokenNumber) => {
    const response = await api.get(`/tokens/my/${tokenNumber}`);
    return response.data;
  },
  getQueue: async () => {
    const response = await api.get("/tokens/queue");
    return response.data;
  },
  cancelMyToken: async (tokenNumber) => {
    const response = await api.patch(`/tokens/my/${tokenNumber}/cancel`);
    return response.data;
  },
};

export const adminApi = {
  getQueue: async () => {
    const response = await api.get("/admin/queue");
    return response.data;
  },
  updateTokenStatus: async (tokenId, status) => {
    const response = await api.patch(`/admin/tokens/${tokenId}/status`, {
      status,
    });
    return response.data;
  },
  prioritizeToken: async (tokenId, boost = 2) => {
    const response = await api.patch(`/admin/tokens/${tokenId}/prioritize`, {
      boost,
    });
    return response.data;
  },
  getStats: async () => {
    const response = await api.get("/admin/stats");
    return response.data;
  },
  getAnalytics: async (hours = 24) => {
    const response = await api.get("/admin/analytics", {
      params: { hours },
    });
    return response.data;
  },
  getEvents: async (params = {}) => {
    const response = await api.get("/admin/events", { params });
    return response.data;
  },
  getFlow: async () => {
    const response = await api.get("/admin/flow");
    return response.data;
  },
  updateFlow: async (payload) => {
    const response = await api.patch("/admin/flow", payload);
    return response.data;
  },
  advanceQueue: async () => {
    const response = await api.post("/admin/flow/advance");
    return response.data;
  },
};

export default api;
