/** Why a request failed, in terms a screen can act on. Never shown to users as text. */
export type ApiErrorKind =
  | "invalid"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "locked"
  | "rate-limited"
  | "server"
  | "network";

/** A failed request. `status` and `code` are missing when the server never answered. */
export type ApiError = {
  kind: ApiErrorKind;
  status?: number;
  /** The API's own error code, such as "invalid_pin". */
  code?: string;
};

/** The data on success, or the reason on failure. Check `ok` before reading `data`. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/** What `apiRequest` sends besides the path. */
export type ApiRequestOptions = {
  method?: "GET" | "POST";
  /** The signed-in account's bearer token. Every API route except health needs one (ADR-0006). */
  token: string;
  body?: unknown;
};

// Empty means same origin: the Vite dev server proxies /v1 to the API.
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? "");

const KIND_BY_STATUS: Partial<Record<number, ApiErrorKind>> = {
  400: "invalid",
  401: "unauthorized",
  403: "forbidden",
  404: "not-found",
  409: "conflict",
  422: "invalid",
  423: "locked",
  429: "rate-limited",
};

/** The error kind for an HTTP status that is not a success. */
export function errorKind(status: number): ApiErrorKind {
  return KIND_BY_STATUS[status] ?? (status >= 500 ? "server" : "invalid");
}

async function errorCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "error" in body) {
      return typeof body.error === "string" ? body.error : undefined;
    }
  } catch {
    // Not JSON: the status alone describes the error.
  }
  return undefined;
}

/**
 * Calls the Noor API and returns a result instead of throwing, so every screen handles failure
 * on purpose. Response bodies are trusted to match `T`: the API validates what it sends, and the
 * schema library stays out of the browser bundle.
 */
export async function apiRequest<T>(
  path: string,
  { method = "GET", token, body }: ApiRequestOptions,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: { kind: "network" } };
  }

  if (!response.ok) {
    const error: ApiError = { kind: errorKind(response.status), status: response.status };
    const code = await errorCode(response);
    return { ok: false, error: code ? { ...error, code } : error };
  }
  // 204 No Content has no body to read.
  if (response.status === 204) return { ok: true, data: undefined as T };
  return { ok: true, data: (await response.json()) as T };
}
