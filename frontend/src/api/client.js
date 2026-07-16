import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

api.interceptors.response.use(
  res => res,
  err => {
    // Only fire auth:expired for 401s on protected routes, not on /login itself
    if (err.response?.status === 401 && !err.config?.url?.includes("/auth/login")) {
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
    return Promise.reject(err);
  }
);

export default api;
