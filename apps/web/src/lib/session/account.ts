import { type ApiResult, apiRequest } from "@/lib/api/client";
import { type Account } from "./session-store";

/** The account behind a token (GET /v1/me), read once at sign-in. */
export function fetchAccount(token: string): Promise<ApiResult<Account>> {
  return apiRequest<Account>("/v1/me", { token });
}
