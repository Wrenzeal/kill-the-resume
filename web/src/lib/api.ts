import type { ResumeDraft } from "@/types/resume";

const explicitApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const fallbackLocalApiBaseUrl = "http://127.0.0.1:19304/api/v1";
const sameOriginApiBaseUrl = "/api/v1";

function stripTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function pointsToLoopback(url: string) {
  try {
    return isLoopbackHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

type ApiBaseEnvironment = {
  explicitApiBaseUrl?: string;
  pageHostname?: string;
  pageProtocol?: string;
  isBrowser?: boolean;
};

function remoteBrowserFallback(pageHostname: string, pageProtocol: string) {
  if (isLoopbackHost(pageHostname)) {
    return fallbackLocalApiBaseUrl;
  }

  if (pageProtocol === "https:") {
    return sameOriginApiBaseUrl;
  }

  return `${pageProtocol}//${pageHostname}:19304/api/v1`;
}

export function resolveApiBaseUrlForEnvironment(environment: ApiBaseEnvironment = {}) {
  const configuredApiBaseUrl = environment.explicitApiBaseUrl?.trim() || explicitApiBaseUrl || "";
  const isBrowser = environment.isBrowser ?? typeof window !== "undefined";

  if (!isBrowser) {
    return stripTrailingSlash(configuredApiBaseUrl || sameOriginApiBaseUrl);
  }

  const pageHostname = environment.pageHostname ?? window.location.hostname;
  const pageProtocol = environment.pageProtocol ?? window.location.protocol;
  const shouldUseRemoteFallback = !configuredApiBaseUrl || (pointsToLoopback(configuredApiBaseUrl) && !isLoopbackHost(pageHostname));

  if (shouldUseRemoteFallback) {
    return stripTrailingSlash(remoteBrowserFallback(pageHostname, pageProtocol));
  }

  return stripTrailingSlash(configuredApiBaseUrl);
}

function inferBrowserApiBaseUrl() {
  return resolveApiBaseUrlForEnvironment();
}

export type ApiUser = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiResumeListItem = {
  id: string;
  title: string;
  targetRole: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiResume = ApiResumeListItem & {
  userId: string;
  content: ResumeDraft;
};

export type AuthResponse = {
  token: string;
  user: ApiUser;
};

type RequestOptions = {
  token?: string | null;
  body?: unknown;
  method?: "GET" | "POST" | "PUT" | "DELETE";
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method ?? (options.body === undefined ? "GET" : "POST"),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message ?? `API request failed: ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export const apiClient = {
  register(input: { email: string; password: string; displayName: string }) {
    return request<AuthResponse>("/auth/register", { body: input });
  },
  login(input: { email: string; password: string }) {
    return request<AuthResponse>("/auth/login", { body: input });
  },
  me(token: string) {
    return request<{ user: ApiUser }>("/me", { token });
  },
  listResumes(token: string) {
    return request<{ resumes: ApiResumeListItem[] }>("/resumes", { token });
  },
  createResume(token: string, input: { title: string; targetRole: string; content: ResumeDraft }) {
    return request<{ resume: ApiResume }>("/resumes", { token, body: input });
  },
  getResume(token: string, resumeId: string) {
    return request<{ resume: ApiResume }>(`/resumes/${resumeId}`, { token });
  },
  updateResume(token: string, resumeId: string, input: { title: string; targetRole: string; content: ResumeDraft }) {
    return request<{ resume: ApiResume }>(`/resumes/${resumeId}`, { method: "PUT", token, body: input });
  },
  deleteResume(token: string, resumeId: string) {
    return request<void>(`/resumes/${resumeId}`, { method: "DELETE", token });
  },
};

export function getApiBaseUrl() {
  return inferBrowserApiBaseUrl();
}
