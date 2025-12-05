import http from "./http";

export const fetchHistory = async (userId, { limit } = {}) => {
  const params = new URLSearchParams();
  if (limit) params.set("limit", limit);

  const query = params.toString() ? `?${params.toString()}` : "";
  return http.getJSON(`/users/${userId}/history${query}`);
};

export const addHistory = async (userId, { imageUrl }) => {
  return http.postJSON(`/users/${userId}/history`, { imageUrl });
};

export const deleteHistory = async (userId, historyId) => {
  return http.deleteJSON(`/users/${userId}/history/${historyId}`);
};

export default {
  fetchHistory,
  addHistory,
  deleteHistory,
};
