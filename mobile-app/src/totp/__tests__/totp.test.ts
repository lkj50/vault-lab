import { createHash } from "node:crypto";
import { decodeBase32, isValidBase32 } from "../base32";
import { generateTotp } from "../totp";
import { parseOtpauthUri } from "../otpauth";
import type { Sha1Fn } from "../hmacSha1";

const sha1: Sha1Fn = (bytes) =>
  new Uint8Array(createHash("sha1").update(Buffer.from(bytes)).digest());

describe("RFC 6238", () => {
  const secret = new TextEncoder().encode("12345678901234567890");

  const vectors = [
    [59, "287082"],
    [1111111109, "081804"],
    [1111111111, "050471"],
    [1234567890, "005924"],
    [2000000000, "279037"],
  ] as const;

  test.each(vectors)("T=%i genera %s", async (timestampSeconds, expected) => {
    await expect(generateTotp(secret, timestampSeconds * 1000, sha1)).resolves.toBe(expected);
  });
});

describe("Base32", () => {
  test("decodifica JBSWY3DPEHPK3PXP", () => {
    expect(Array.from(decodeBase32("JBSWY3DPEHPK3PXP"))).toEqual([
      72, 101, 108, 108, 111, 33, 222, 173, 190, 239,
    ]);
  });

  test("acepta minúsculas y espacios e ignora =", () => {
    expect(isValidBase32("jbsw y3dp ehpk 3pxp===")).toBe(true);
    expect(Array.from(decodeBase32("jbsw y3dp ehpk 3pxp==="))).toHaveLength(10);
  });

  test("rechaza caracteres inválidos", () => {
    expect(isValidBase32("JBSW1")).toBe(false);
    expect(() => decodeBase32("JBSW1")).toThrow(/inválidos/);
  });
});

describe("otpauth", () => {
  test("parsea issuer, cuenta y secreto", () => {
    expect(
      parseOtpauthUri(
        "otpauth://totp/UniSabana:estudiante%40unisabana.edu.co?secret=JBSWY3DPEHPK3PXP&issuer=UniSabana",
      ),
    ).toEqual({
      issuer: "UniSabana",
      account: "estudiante@unisabana.edu.co",
      secret: "JBSWY3DPEHPK3PXP",
    });
  });

  test("rechaza una URI inválida", () => {
    expect(() => parseOtpauthUri("https://example.com")).toThrow(/otpauth/);
  });
});
