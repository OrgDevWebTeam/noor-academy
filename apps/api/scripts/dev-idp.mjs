// LOCAL-ONLY test identity provider. Serves a JWKS and mints signed test tokens so you can
// exercise the real token verification path without Cognito/Auth0/Keycloak.
//
//   node scripts/dev-idp.mjs
//   curl "http://127.0.0.1:4010/token?sub=alice"            -> parent token
//   curl "http://127.0.0.1:4010/token?sub=dev-teacher&mfa=1" -> token that satisfies staff MFA
//
// API settings (.env):
//   OIDC_ISSUER_URL=http://127.0.0.1:4010/
//   OIDC_AUDIENCE=noor-api
//   OIDC_JWKS_URL=http://127.0.0.1:4010/jwks.json
import { createServer } from "node:http";
import { SignJWT, exportJWK, generateKeyPair } from "jose";

if (process.env.APP_ENV && process.env.APP_ENV !== "local") {
  console.error("dev-idp is for local use only.");
  process.exit(1);
}

const PORT = 4010;
const issuer = `http://127.0.0.1:${PORT}/`;
const audience = "noor-api";

// A new key on every start. Restart the API after restarting this script.
const { publicKey, privateKey } = await generateKeyPair("RS256");
const jwk = { ...(await exportJWK(publicKey)), kid: "dev-1", alg: "RS256", use: "sig" };

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", issuer);

  if (url.pathname === "/jwks.json") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ keys: [jwk] }));
    return;
  }

  if (url.pathname === "/token") {
    const subject = url.searchParams.get("sub") ?? "dev-parent";
    const claims = url.searchParams.get("mfa") === "1" ? { amr: ["pwd", "mfa"] } : { amr: ["pwd"] };
    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "dev-1" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject(subject)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);
    res.setHeader("Content-Type", "text/plain");
    res.end(token);
    return;
  }

  res.statusCode = 404;
  res.end("not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.warn(`dev-idp listening on ${issuer} (local only)`);
});
