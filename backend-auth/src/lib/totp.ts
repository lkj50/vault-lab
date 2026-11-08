// Stub de infraestructura.
import { createHmac } from "node:crypto";
import { decodeBase32 } from "./base32.js";

export function generateTotp(secret: string, timestamp = Date.now(), stepSeconds = 30): string {
  const counter = Math.floor(timestamp / 1000 / stepSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", decodeBase32(secret));
  hmac.update(counterBuffer);
  const digest = hmac.digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);

  return (binary % 1000000).toString().padStart(6, "0");
}

export function verifyTotp(secret: string, code: string, now = Date.now(), stepSeconds = 30): boolean {
  const counter = Math.floor(now / 1000 / stepSeconds);

  for (let window = -1; window <= 1; window += 1) {
    const windowTimestamp = (counter + window) * stepSeconds * 1000;
    if (generateTotp(secret, windowTimestamp, stepSeconds) === code) {
      return true;
    }
  }

  return false;
}
