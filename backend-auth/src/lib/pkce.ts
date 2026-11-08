// Stub de infraestructura.
import { createHash, timingSafeEqual } from "node:crypto";

export function verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
  const calculated = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  const left = Buffer.from(calculated);
  const right = Buffer.from(codeChallenge);
  return left.length === right.length && timingSafeEqual(left, right);
}
