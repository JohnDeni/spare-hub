// Low-level fetch wrapper with token storage + auto-refresh.
// Backend: Django REST Framework + Simple JWT.
// Tokens are stored in localStorage (dev/localhost setup).

import type { TokenPair } from "./types";

const ACCESS_KEY = "sparehub.auth.access";
const REFRESH_KEY = "sparehub.auth.refresh";

// Falls back to the page's own hostname so the app keeps working when opened
// via a LAN IP (e.g. from a phone) instead of localhost/127.0.0.1 — a fixed
// VITE_API_BASE_URL would otherwise point the browser at itself.
function resolveApiBaseUrl(): string {
  const configured =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL;
  if (configured) return configured;

  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:8000`;
  }

  return "http://localhost:8000";
}

export const API_BASE_URL = resolveApiBaseUrl();

function isBrowser() {
  return typeof window !== "undefined";
}

export const tokenStore = {
  getAccess(): string | null {
    if (!isBrowser()) return null;
    try {
      return window.localStorage.getItem(ACCESS_KEY);
    } catch {
      return null;
    }
  },
  getRefresh(): string | null {
    if (!isBrowser()) return null;
    try {
      return window.localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  set(pair: TokenPair) {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(ACCESS_KEY, pair.access);
      window.localStorage.setItem(REFRESH_KEY, pair.refresh);
    } catch {
      // ignore
    }
  },
  setAccess(access: string) {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(ACCESS_KEY, access);
    } catch {
      // ignore
    }
  },
  clear() {
    if (!isBrowser()) return;
    try {
      window.localStorage.removeItem(ACCESS_KEY);
      window.localStorage.removeItem(REFRESH_KEY);
    } catch {
      // ignore
    }
  },
};

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = API_BASE_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean; // attach access token, default true
  retry?: boolean; // internal: prevent infinite refresh loop
};

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;
  try {
    const res = await fetch(buildUrl("/api/auth/token/refresh/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access?: string };
    if (!data.access) return null;
    tokenStore.setAccess(data.access);
    return data.access;
  } catch {
    return null;
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = true, retry = true, headers, ...rest } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(body !== undefined && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...((headers as Record<string, string>) ?? {}),
  };

  if (auth) {
    const access = tokenStore.getAccess();
    if (access) finalHeaders.Authorization = `Bearer ${access}`;
  }

  const res = await fetch(buildUrl(path), {
    ...rest,
    headers: finalHeaders,
    body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
  });

  if (res.status === 401 && auth && retry) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      return apiRequest<T>(path, { ...options, retry: false });
    }
    tokenStore.clear();
  }

  if (!res.ok) {
    const data = await parseBody(res);
    const message =
      (data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Request failed with ${res.status}`) as string;
    throw new ApiError(message, res.status, data);
  }

  if (res.status === 204) return null as T;
  return (await parseBody(res)) as T;
}
