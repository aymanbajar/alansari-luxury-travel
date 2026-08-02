import { getCsrfToken } from "./csrf";
import { isMockDataEnabled } from "./mockConfig";
import { mockApiRequest } from "../mocks/mockApi";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

interface ApiSuccess<TData> {
  success: true;
  data: TData;
}

type ApiResponse<TData> = ApiSuccess<TData> | ApiFailure;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export async function apiRequest<TData>(
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<TData> {
  if (isMockDataEnabled) {
    return mockApiRequest<TData>(path, init);
  }

  const method = init.method?.toUpperCase() ?? "GET";
  const csrfToken = getCsrfToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken && method !== "GET" ? { "x-csrf-token": csrfToken } : {}),
      ...init.headers
    }
  });

  if (response.status === 401 && retry && path !== "/auth/login" && path !== "/auth/refresh") {
    const refreshed = await fetch(`${apiBaseUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });

    if (refreshed.ok) {
      return apiRequest<TData>(path, init, false);
    }

    window.dispatchEvent(new Event("auth:session-expired"));
  }

  const payload = (await response.json()) as ApiResponse<TData>;
  if (!payload.success) {
    if (response.status === 401) {
      window.dispatchEvent(new Event("auth:session-expired"));
    }
    throw new ApiError(
      payload.error.message,
      response.status,
      payload.error.code,
      payload.error.details
    );
  }

  return payload.data;
}
