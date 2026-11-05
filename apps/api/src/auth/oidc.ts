import { type JWTVerifyGetKey, createRemoteJWKSet, jwtVerify } from "jose";
import type { TokenVerifier } from "./types.js";

export interface OidcOptions {
  issuer: string;
  audience: string;
  keys: JWTVerifyGetKey;
}

/**
 * Verifies OIDC access/ID tokens: signature, issuer, audience and expiry. Works with any
 * standards-compliant provider. Only asymmetric algorithms are accepted (no alg confusion).
 */
export function createOidcVerifier({ issuer, audience, keys }: OidcOptions): TokenVerifier {
  return async (token) => {
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience,
      algorithms: ["RS256", "ES256"],
      clockTolerance: 5,
    });
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new Error("token has no subject");
    }
    return { subject: payload.sub, claims: payload as Record<string, unknown> };
  };
}

export function createRemoteKeys(jwksUrl: string): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL(jwksUrl));
}
