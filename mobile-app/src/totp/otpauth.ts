import { isValidBase32 } from "./base32";

export interface OtpauthAccount {
  issuer: string;
  account: string;
  secret: string;
}

export function parseOtpauthUri(uri: string): OtpauthAccount {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    throw new Error("URI otpauth inválida.");
  }

  if (url.protocol !== "otpauth:" || url.hostname !== "totp") {
    throw new Error("El código QR debe ser una URI otpauth://totp.");
  }

  const label = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  const separator = label.indexOf(":");
  if (separator < 1 || separator === label.length - 1) {
    throw new Error("El formato otpauth debe incluir issuer:cuenta.");
  }

  const pathIssuer = label.slice(0, separator).trim();
  const account = label.slice(separator + 1).trim();
  const secret = (url.searchParams.get("secret") ?? "").replace(/\s/g, "");
  const issuerParam = url.searchParams.get("issuer");
  const issuer = (issuerParam ?? pathIssuer).trim();

  if (!secret || !isValidBase32(secret)) {
    throw new Error("La URI otpauth contiene una semilla Base32 inválida.");
  }
  if (!issuer || !account) {
    throw new Error("La URI otpauth no contiene issuer o cuenta.");
  }

  return {
    issuer,
    account,
    secret: secret.toUpperCase().replace(/=+$/g, ""),
  };
}
