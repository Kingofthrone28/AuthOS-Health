import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

interface OidcConfiguration {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri: string;
}

const configCache = new Map<string, { config: OidcConfiguration; fetchedAt: number }>();
const CONFIG_TTL_MS = 3600_000; // 1 hour

export async function discoverOidcProvider(issuerUrl: string): Promise<OidcConfiguration> {
  const cached = configCache.get(issuerUrl);
  if (cached && Date.now() - cached.fetchedAt < CONFIG_TTL_MS) {
    return cached.config;
  }

  const wellKnown = issuerUrl.replace(/\/+$/, "") + "/.well-known/openid-configuration";
  const res = await fetch(wellKnown);
  if (!res.ok) {
    throw new Error(`OIDC discovery failed for ${issuerUrl}: ${res.status}`);
  }
  const config = (await res.json()) as OidcConfiguration;
  configCache.set(issuerUrl, { config, fetchedAt: Date.now() });
  return config;
}

const jwksClients = new Map<string, jwksClient.JwksClient>();

function getJwksClient(jwksUri: string): jwksClient.JwksClient {
  let client = jwksClients.get(jwksUri);
  if (!client) {
    client = jwksClient({ jwksUri, cache: true, rateLimit: true });
    jwksClients.set(jwksUri, client);
  }
  return client;
}

function getSigningKey(jwksUri: string, kid: string): Promise<string> {
  const client = getJwksClient(jwksUri);
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err || !key) return reject(err ?? new Error("Signing key not found"));
      resolve(key.getPublicKey());
    });
  });
}

export interface OidcTokenClaims {
  sub: string;
  email?: string;
  name?: string;
  iss: string;
  aud: string | string[];
  exp: number;
  [key: string]: unknown;
}

export async function verifyOidcToken(
  token: string,
  issuerUrl: string,
  clientId: string,
): Promise<OidcTokenClaims> {
  const config = await discoverOidcProvider(issuerUrl);

  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === "string") {
    throw new Error("Malformed ID token");
  }

  const kid = decoded.header.kid;
  if (!kid) throw new Error("ID token missing kid");

  const publicKey = await getSigningKey(config.jwks_uri, kid);

  const claims = jwt.verify(token, publicKey, {
    algorithms: ["RS256", "RS384", "RS512"],
    issuer: config.issuer,
    audience: clientId,
  }) as OidcTokenClaims;

  return claims;
}

export interface OidcTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export async function exchangeOidcCode(
  issuerUrl: string,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<OidcTokenResponse> {
  const config = await discoverOidcProvider(issuerUrl);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(config.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OIDC token exchange failed: ${res.status} ${text}`);
  }

  return (await res.json()) as OidcTokenResponse;
}

export function buildOidcAuthorizeUrl(
  issuerUrl: string,
  authorizationEndpoint: string,
  clientId: string,
  redirectUri: string,
  state: string,
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid email profile",
    state,
  });
  return `${authorizationEndpoint}?${params.toString()}`;
}
