import type { Role } from "@noor/contracts";

export interface VerifiedToken {
  /** Stable identity-provider user id (`sub`). Never used as our own user id. */
  subject: string;
  claims: Record<string, unknown>;
}

/** Verifies a bearer token or throws. */
export type TokenVerifier = (token: string) => Promise<VerifiedToken>;

export interface AuthContext {
  /** Our own internal user id (separate from the provider's subject, so providers can change). */
  userId: string;
  subject: string;
  roles: readonly Role[];
  familyId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}
