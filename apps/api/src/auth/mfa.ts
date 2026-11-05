/**
 * Staff must have authenticated with multi-factor authentication. Uses the standard `amr`
 * claim (RFC 8176). Some providers expose MFA differently (custom claim or group): confirm
 * with the chosen identity provider and adapt here. Failing closed is intentional.
 */
export function satisfiesMfa(claims: Record<string, unknown>): boolean {
  const amr = claims.amr;
  return Array.isArray(amr) && amr.includes("mfa");
}
