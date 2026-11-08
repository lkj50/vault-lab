import { hmacSha1, type Sha1Fn } from "./hmacSha1";

export async function generateTotp(
  secretBytes: Uint8Array,
  timestampMs: number,
  sha1?: Sha1Fn,
): Promise<string> {
  // Convierte el tiempo Unix a bloques de 30 segundos.
  const timeStep = Math.floor(timestampMs / 1000 / 30);

  // Escribe el contador de 8 bytes en orden big-endian.
  const counter = new Uint8Array(8);
  counter[0] = Math.floor(timeStep / 0x100000000) >>> 24;
  counter[1] = Math.floor(timeStep / 0x100000000) >>> 16;
  counter[2] = Math.floor(timeStep / 0x100000000) >>> 8;
  counter[3] = Math.floor(timeStep / 0x100000000) & 0xff;
  counter[4] = (timeStep >>> 24) & 0xff;
  counter[5] = (timeStep >>> 16) & 0xff;
  counter[6] = (timeStep >>> 8) & 0xff;
  counter[7] = timeStep & 0xff;

  // Calcula HMAC-SHA1 manualmente.
  const hash = await hmacSha1(secretBytes, counter, sha1);

  // El último byte indica el desplazamiento dinámico dentro del HMAC.
  const offset = hash[hash.length - 1] & 0x0f;
  const binCode =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  // Reduce a seis dígitos y conserva ceros a la izquierda.
  return (binCode % 1000000).toString().padStart(6, "0");
}

export function secondsRemaining(timestampMs: number): number {
  return 30 - (Math.floor(timestampMs / 1000) % 30);
}
