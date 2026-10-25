import axios from "axios";
import { BASE_URL } from "./apiPaths";

const axiosInstance = axios.create({
  baseURL: BASE_URL, // "" (same origin) unless VITE_API_BASE_URL is set
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("token");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Login / register return 401 for wrong credentials. Those must reach the
// form so it can show "Invalid email or password" instead of reloading.
const AUTH_ENDPOINTS = ["/api/auth/login", "/api/auth/register"];

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const url = error.config?.url || "";
      const isAuthRequest = AUTH_ENDPOINTS.some((path) => url.includes(path));

      if (error.response.status === 401 && !isAuthRequest) {
        // Session expired or invalid: drop the token and go to login
        localStorage.removeItem("token");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      } else if (error.response.status === 500) {
        console.error("Server error. Please try again later.");
      }
    } else if (error.code === "ECONNABORTED") {
      console.error("Request timeout. Please try again.");
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
