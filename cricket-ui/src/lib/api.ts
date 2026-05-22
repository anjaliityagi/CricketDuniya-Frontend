import axios from "axios";

export const AUTH_TOKEN_KEY = "cricket_duniya_auth_token";
export const AUTH_USER_KEY = "cricket_duniya_auth_user";

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

const basePath = import.meta.env.VITE_API_BASE_PATH ?? "/v1";
const trimmedBaseUrl = rawBaseUrl.replace(/\/$/, "");
const trimmedBasePath = basePath.replace(/^\/?/, "/").replace(/\/$/, "");
const baseURL =
  trimmedBasePath && !trimmedBaseUrl.endsWith(trimmedBasePath)
    ? `${trimmedBaseUrl}${trimmedBasePath}`
    : trimmedBaseUrl;

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  if (token) {
    config.headers.Authorization = token;
  }

  return config;
});

export default api;
