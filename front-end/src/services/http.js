import axios from "axios";

const RAW_BASE = import.meta.env.VITE_API_URL;
const BASE_URL = String(RAW_BASE).replace(/\/+$/, "");

let AUTH_TOKEN = "";

// Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
});

// ----- Interceptors -----

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  if (!config.headers.Accept) config.headers.Accept = "application/json";

  if (AUTH_TOKEN) {
    config.headers.Authorization = `Bearer ${AUTH_TOKEN}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    const payload = res?.data;
    if (payload && typeof payload === "object") {
      if (payload.status === "success") {
        return payload.data !== undefined ? payload.data : payload;
      }
      if (payload.data !== undefined) return payload.data;
    }
    return payload ?? res;
  },
  (error) => {
    const resp = error?.response;
    const data = resp?.data;

    let message =
      data?.message || data?.error || error?.message || "Request failed";

    if (typeof data === "object") {
      if (data?.errors && Array.isArray(data.errors) && data.errors.length) {
        message = data.errors[0]?.message || message;
      }
      if (data?.details && typeof data.details === "string") {
        message = data.details || message;
      }
    }
    error.message = message;
    return Promise.reject(error);
  }
);

// ----- Helpers -----

const getJSON = async (url, config) => {
  const data = await api.get(url, config);
  return data;
};

const postJSON = async (url, body, config) => {
  const data = await api.post(url, body, {
    ...(config || {}),
    headers: { ...(config?.headers || {}), "Content-Type": "application/json" },
  });
  return data;
};

const patchJSON = async (url, body, config) => {
  const data = await api.patch(url, body, {
    ...(config || {}),
    headers: { ...(config?.headers || {}), "Content-Type": "application/json" },
  });
  return data;
};

const deleteJSON = async (url, config) => {
  const data = await api.delete(url, config);
  return data;
};

// multipart/form-data — FormData sẽ tự set boundary
const postForm = async (url, formData, config) => {
  const data = await api.post(url, formData, {
    ...(config || {}),
    headers: {
      ...(config?.headers || {}),
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

const putForm = async (url, formData, config) => {
  const data = await api.put(url, formData, {
    ...(config || {}),
    headers: {
      ...(config?.headers || {}),
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

const patchForm = async (url, formData, config) => {
  const data = await api.patch(url, formData, {
    ...(config || {}),
    headers: {
      ...(config?.headers || {}),
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

// ----- Token controls -----
const setToken = (t) => {
  AUTH_TOKEN = t || "";
};
const clearToken = () => {
  AUTH_TOKEN = "";
};

// Export
const http = {
  BASE_URL,
  getJSON,
  postJSON,
  patchJSON,
  deleteJSON,
  postForm,
  putForm,
  patchForm,
  setToken,
  clearToken,
};

export default http;
