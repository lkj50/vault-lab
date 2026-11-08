import { createHash } from "node:crypto";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  type Sha256Fn,
} from "../pkce";

const sha256: Sha256Fn = async (bytes) =>
  new Uint8Array(createHash("sha256").update(Buffer.from(bytes)).digest());

describe("PKCE", () => {
  test("vector RFC 7636", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    await expect(generateCodeChallenge(verifier, sha256)).resolves.toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });

  test("genera verifier de 64 caracteres permitidos", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toHaveLength(64);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
