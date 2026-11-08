import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { router } from "expo-router";

import {
  deleteRefreshToken,
  getRefreshToken,
  saveRefreshToken,
} from "@/auth/tokenStorage";
import { store } from "@/store";
import {
  elevationExpired,
  loggedOut,
  tokenRefreshed,
} from "@/store/authSlice";

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
});

let refreshPromise: Promise<string> | null = null;
export let refreshCount = 0;
export function getRefreshCount(): number {
  return refreshCount;
}

export function readJwtExpiration(token: string | null): number | null {
  if (!token) return null;
  try {
    const part = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    if (!part) return null;
    const padded = part.padEnd(Math.ceil(part.length / 4) * 4, "=");
    const alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let binary = "";
    for (let i = 0; i < padded.length; i += 4) {
      const a = alphabet.indexOf(padded[i]);
      const b = alphabet.indexOf(padded[i + 1]);
      const c = padded[i + 2] === "=" ? 0 : alphabet.indexOf(padded[i + 2]);
      const d = padded[i + 3] === "=" ? 0 : alphabet.indexOf(padded[i + 3]);
      const value = (a << 18) | (b << 12) | (c << 6) | d;
      binary += String.fromCharCode((value >>> 16) & 255);
      if (padded[i + 2] !== "=") {
        binary += String.fromCharCode((value >>> 8) & 255);
      }
      if (padded[i + 3] !== "=") {
        binary += String.fromCharCode(value & 255);
      }
    }
    const payload = JSON.parse(binary) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error("No hay refresh_token disponible.");

  // axios simple: no pasa por el interceptor de respuesta.
  const response = await axios.post(
    `${process.env.EXPO_PUBLIC_API_URL}/auth/refresh`,
    { refresh_token: refreshToken },
  );

  await saveRefreshToken(response.data.refresh_token as string);
  const accessToken = response.data.access_token as string;
  store.dispatch(tokenRefreshed(accessToken));
  refreshCount += 1;
  return accessToken;
}

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    if (refreshPromise) await refreshPromise;

    const headers = AxiosHeaders.from(config.headers);
    if (!headers.has("Authorization")) {
      const authState = store.getState().auth;
      let selectedToken = authState.accessToken;

      if (config.url?.includes("/api/boveda-critica") && authState.elevatedToken) {
        const exp = readJwtExpiration(authState.elevatedToken);
        if (exp && exp > Math.floor(Date.now() / 1000)) {
          selectedToken = authState.elevatedToken;
        } else {
          store.dispatch(elevationExpired());
          selectedToken = authState.accessToken;
        }
      }

      if (selectedToken) {
        headers.set("Authorization", `Bearer ${selectedToken}`);
      }
    }
    config.headers = headers;
    return config;
  },
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    if (
      !config ||
      error.response?.status !== 401 ||
      config._retry ||
      config.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken();
        const currentRefresh = refreshPromise;
        void currentRefresh.then(
          () => {
            if (refreshPromise === currentRefresh) refreshPromise = null;
          },
          () => {
            if (refreshPromise === currentRefresh) refreshPromise = null;
          },
        );
      }
      const newAccessToken = await refreshPromise;
      const headers = AxiosHeaders.from(config.headers);
      headers.set("Authorization", `Bearer ${newAccessToken}`);
      config.headers = headers;
      return api.request(config as AxiosRequestConfig);
    } catch {
      await deleteRefreshToken();
      store.dispatch(loggedOut());
      router.replace("/");
      return Promise.reject(
        new Error("Tu sesión expiró. Inicia sesión de nuevo."),
      );
    }
  },
);
