import * as Crypto from "expo-crypto";

export type Sha1Fn = (bytes: Uint8Array) => Uint8Array | Promise<Uint8Array>;

export async function expoSha1(bytes: Uint8Array): Promise<Uint8Array> {
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA1, buffer);
  return new Uint8Array(digest);
}

export async function hmacSha1(
  key: Uint8Array,
  message: Uint8Array,
  sha1: Sha1Fn = expoSha1,
): Promise<Uint8Array> {
  let normalizedKey = key;

  // Normaliza claves mayores al tamaño de bloque a SHA-1 de 20 bytes.
  if (normalizedKey.length > 64) {
    normalizedKey = await Promise.resolve(sha1(normalizedKey));
  }

  // Completa la clave hasta el bloque de 64 bytes.
  const blockKey = new Uint8Array(64);
  blockKey.set(normalizedKey);

  const ipad = new Uint8Array(64);
  const opad = new Uint8Array(64);
  for (let index = 0; index < 64; index += 1) {
    ipad[index] = blockKey[index] ^ 0x36;
    opad[index] = blockKey[index] ^ 0x5c;
  }

  const inner = new Uint8Array(64 + message.length);
  inner.set(ipad);
  inner.set(message, 64);
  const innerHash = await Promise.resolve(sha1(inner));

  const outer = new Uint8Array(64 + innerHash.length);
  outer.set(opad);
  outer.set(innerHash, 64);
  return Promise.resolve(sha1(outer)).then((value) => new Uint8Array(value));
}
