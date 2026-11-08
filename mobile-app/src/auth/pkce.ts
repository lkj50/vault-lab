import * as Crypto from "expo-crypto";

export type Sha256Fn = (bytes: Uint8Array) => Promise<Uint8Array>;

const BASE64URL_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

// Codifica bytes con el alfabeto Base64URL propio, sin depender de btoa ni Buffer.
export function base64UrlEncode(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const bits = (a << 16) | (b << 8) | c;
    result += BASE64URL_ALPHABET[(bits >>> 18) & 63];
    result += BASE64URL_ALPHABET[(bits >>> 12) & 63];
    if (i + 1 < bytes.length) {
      result += BASE64URL_ALPHABET[(bits >>> 6) & 63];
    }
    if (i + 2 < bytes.length) {
      result += BASE64URL_ALPHABET[bits & 63];
    }
  }
  return result;
}

export function generateCodeVerifier(): string {
  const randomBytes = Crypto.getRandomBytes(48);
  return base64UrlEncode(randomBytes);
}

export async function expoSha256(bytes: Uint8Array): Promise<Uint8Array> {
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  const digest = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    buffer,
  );
  return new Uint8Array(digest);
}

// Convierte el verifier UTF-8 a bytes, calcula SHA-256 y aplica Base64URL.
export async function generateCodeChallenge(
  verifier: string,
  sha256: Sha256Fn = expoSha256,
): Promise<string> {
  const verifierBytes = new TextEncoder().encode(verifier);
  const digest = await sha256(verifierBytes);
  return base64UrlEncode(digest);
}

export function generateState(): string {
  return base64UrlEncode(Crypto.getRandomBytes(16));
}
