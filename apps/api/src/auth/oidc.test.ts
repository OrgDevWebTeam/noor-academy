import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { createOidcVerifier } from "./oidc.js";

const issuer = "https://idp.example.com/";
const audience = "noor-api";

type PrivateKey = Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
let privateKey: PrivateKey;
let otherKey: PrivateKey;
let verify: ReturnType<typeof createOidcVerifier>;

interface TokenOptions {
  issuer?: string;
  audience?: string;
  subject?: string | null;
  expiresAt?: number;
  key?: PrivateKey;
}

async function makeToken(options: TokenOptions = {}): Promise<string> {
  const jwt = new SignJWT({ amr: ["mfa"] })
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setIssuer(options.issuer ?? issuer)
    .setAudience(options.audience ?? audience)
    .setIssuedAt()
    .setExpirationTime(options.expiresAt ?? Math.floor(Date.now() / 1000) + 300);
  if (options.subject !== null) jwt.setSubject(options.subject ?? "user-1");
  return jwt.sign(options.key ?? privateKey);
}

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  otherKey = (await generateKeyPair("RS256")).privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  verify = createOidcVerifier({ issuer, audience, keys: createLocalJWKSet({ keys: [jwk] }) });
});

describe("createOidcVerifier", () => {
  it("accepts a valid token and returns subject and claims", async () => {
    const result = await verify(await makeToken());
    expect(result.subject).toBe("user-1");
    expect(result.claims.amr).toEqual(["mfa"]);
  });

  it("rejects a wrong issuer", async () => {
    await expect(
      verify(await makeToken({ issuer: "https://evil.example.com/" })),
    ).rejects.toThrow();
  });

  it("rejects a wrong audience", async () => {
    await expect(verify(await makeToken({ audience: "someone-else" }))).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const expired = Math.floor(Date.now() / 1000) - 600;
    await expect(verify(await makeToken({ expiresAt: expired }))).rejects.toThrow();
  });

  it("rejects a token signed by an unknown key", async () => {
    await expect(verify(await makeToken({ key: otherKey }))).rejects.toThrow();
  });

  it("rejects a token without a subject", async () => {
    await expect(verify(await makeToken({ subject: null }))).rejects.toThrow(/subject/);
  });

  it("rejects garbage", async () => {
    await expect(verify("not-a-jwt")).rejects.toThrow();
  });
});
