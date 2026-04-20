import axios, { AxiosRequestConfig } from "axios";

type RetryableRequestConfig = AxiosRequestConfig & { _retry?: boolean };

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Helper function to get CSRF token from cookies
const getCSRFToken = (): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(^|;)\s*csrf_token\s*=\s*([^;]+)/);
  return match ? match[2] : null;
};

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add CSRF token to request headers for state-changing methods
api.interceptors.request.use((config) => {
  if (config.method && ["post", "put", "delete", "patch"].includes(config.method.toLowerCase())) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !String(originalRequest.url || "").includes("/auth/refresh") &&
      !String(originalRequest.url || "").includes("/auth/login")
    ) {
      originalRequest._retry = true;
      try {
        await api.post("/auth/refresh");
        return api(originalRequest);
      } catch {
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);
