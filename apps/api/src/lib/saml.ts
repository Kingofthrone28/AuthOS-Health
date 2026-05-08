import { SAML } from "@node-saml/node-saml";

export interface SamlConfig {
  entryPoint: string;  // IdP SSO URL
  issuer: string;      // SP entity ID
  cert: string;        // IdP signing certificate (PEM, no headers)
  callbackUrl: string; // ACS URL
}

export function createSamlClient(config: SamlConfig): SAML {
  return new SAML({
    entryPoint: config.entryPoint,
    issuer: config.issuer,
    idpCert: config.cert,
    callbackUrl: config.callbackUrl,
    wantAuthnResponseSigned: true,
    wantAssertionsSigned: true,
  });
}

export interface SamlProfile {
  nameID: string;
  email?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  [key: string]: unknown;
}

export async function validateSamlResponse(
  samlClient: SAML,
  body: { SAMLResponse: string },
): Promise<SamlProfile> {
  const { profile } = await samlClient.validatePostResponseAsync(body);
  if (!profile) throw new Error("SAML validation returned no profile");
  return {
    nameID: profile.nameID ?? "",
    email: (profile.email as string) ?? (profile.nameID ?? undefined),
    firstName: profile.firstName as string | undefined,
    lastName: profile.lastName as string | undefined,
  };
}

export function generateSpMetadata(samlClient: SAML): string {
  return samlClient.generateServiceProviderMetadata(null, null);
}

export function getLoginUrl(samlClient: SAML, relayState?: string): Promise<string> {
  return samlClient.getAuthorizeUrlAsync(relayState ?? "", undefined, {});
}
