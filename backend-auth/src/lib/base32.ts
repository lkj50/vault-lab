// Stub de infraestructura.
export function decodeBase32(encoded: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const input = encoded.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of input) {
    const index = alphabet.indexOf(char);
    if (index === -1) {
      throw new Error("Invalid Base32 character");
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}
