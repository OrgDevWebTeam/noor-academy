import { type ApiResult, apiRequest } from "@/lib/api/client";

/** A child profile as the API returns it. */
export type ChildProfile = {
  id: string;
  displayName: string;
  birthYear: number;
  hasPin: boolean;
};

export type NewChild = { displayName: string; birthYear: number };

/** Outcome of checking a child's PIN on the profile picker (G08). */
export type PinCheck = "accepted" | "wrong-pin" | "locked" | "no-pin" | "failed";

/** The family's children (GET /v1/children). */
export async function listChildren(token: string): Promise<ApiResult<ChildProfile[]>> {
  const result = await apiRequest<{ children: ChildProfile[] }>("/v1/children", { token });
  return result.ok ? { ok: true, data: result.data.children } : result;
}

/** Adds a child to the signed-in parent's family (POST /v1/children). */
export async function createChild(
  token: string,
  child: NewChild,
): Promise<ApiResult<ChildProfile>> {
  const result = await apiRequest<{ child: ChildProfile }>("/v1/children", {
    method: "POST",
    token,
    body: child,
  });
  return result.ok ? { ok: true, data: result.data.child } : result;
}

/** Sets or replaces a child's PIN. The server stores only a hash. */
export function setChildPin(
  token: string,
  childId: string,
  pin: string,
): Promise<ApiResult<undefined>> {
  return apiRequest<undefined>(`/v1/children/${childId}/pin`, {
    method: "POST",
    token,
    body: { pin },
  });
}

/** What G08 shows for the API's answer to a PIN check. */
export function toPinCheck(result: ApiResult<unknown>): PinCheck {
  if (result.ok) return "accepted";
  // The fifth wrong PIN in a row locks the profile for 15 minutes and answers 423 (FR-AUTH-002).
  if (result.error.kind === "locked") return "locked";
  if (result.error.code === "invalid_pin") return "wrong-pin";
  if (result.error.code === "pin_not_set") return "no-pin";
  return "failed";
}

/** Checks a child's PIN on the server; the browser never keeps it. */
export async function verifyChildPin(
  token: string,
  childId: string,
  pin: string,
): Promise<PinCheck> {
  const result = await apiRequest<{ ok: true }>(`/v1/children/${childId}/pin/verify`, {
    method: "POST",
    token,
    body: { pin },
  });
  return toPinCheck(result);
}
