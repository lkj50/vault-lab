import assert from "node:assert/strict";
import test from "node:test";
import { generateTotp, verifyTotp } from "./totp.js";

const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

const vectors = [
  [59, "287082"],
  [1111111109, "081804"],
  [1111111111, "050471"],
  [1234567890, "005924"],
  [2000000000, "279037"],
] as const;

for (const [timestampSeconds, expected] of vectors) {
  test(`RFC 6238 vector T=${timestampSeconds}`, () => {
    assert.equal(generateTotp(secret, timestampSeconds * 1000), expected);
  });
}

test("verifyTotp acepta el código de la ventana actual", () => {
  const now = Date.now();
  const code = generateTotp(secret, now);
  assert.equal(verifyTotp(secret, code, now), true);
});

test("verifyTotp rechaza un código inválido", () => {
  assert.equal(verifyTotp(secret, "000000", Date.now()), false);
});
