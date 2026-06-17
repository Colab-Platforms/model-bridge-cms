import axios from "axios";

function getDeviceName(): string {
  if (typeof window === "undefined") return "Server";
  const ua = navigator.userAgent;
  const browser = /Edg/i.test(ua) ? "Edge"
    : /Chrome/i.test(ua) ? "Chrome"
      : /Firefox/i.test(ua) ? "Firefox"
        : /Safari/i.test(ua) ? "Safari"
          : "Browser";
  const os = /Windows/i.test(ua) ? "Windows"
    : /Macintosh/i.test(ua) ? "Mac"
      : /Linux/i.test(ua) ? "Linux"
        : /Android/i.test(ua) ? "Android"
          : /iPhone|iPad/i.test(ua) ? "iOS"
            : "Unknown";
  return `${browser} on ${os}`;
}


const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach token on every request
api.interceptors.request.use((config) => {

  const raw = typeof window !== "undefined" ? localStorage.getItem("auth-storage") : null;
  const token = raw ? JSON.parse(raw)?.state?.accessToken : null;

  if (token) config.headers.Authorization = `Bearer ${token}`;

  const authPaths = ["/auth/login", "/auth/register", "/auth/refresh"];
  if (typeof window !== "undefined" && authPaths.some((p) => config.url?.endsWith(p))) {
    config.headers["x-device-name"] = getDeviceName();
  }


  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => {
    if (res.data && "status" in res.data && "data" in res.data) {
      res.data = res.data.data; // Unwrap ApiEnvelope
    }
    return res;
  },
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const raw = localStorage.getItem("auth-storage");
        const refreshToken = raw ? JSON.parse(raw)?.state?.refreshToken : null;
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          { refreshToken },
          { headers: { "x-device-name": getDeviceName() } }
        );
        const newAccessToken =
          data?.data?.tokens?.accessToken ?? data?.data?.accessToken;
        if (newAccessToken && raw) {
          const parsed = JSON.parse(raw);
          parsed.state.accessToken = newAccessToken;
          localStorage.setItem("auth-storage", JSON.stringify(parsed));
          original.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(original);
        }
      } catch {
        localStorage.removeItem("auth-storage");
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;