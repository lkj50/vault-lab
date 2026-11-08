const BASE32_LOOKUP: Record<string, number> = {
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7,
  I: 8, J: 9, K: 10, L: 11, M: 12, N: 13, O: 14, P: 15,
  Q: 16, R: 17, S: 18, T: 19, U: 20, V: 21, W: 22, X: 23,
  Y: 24, Z: 25, "2": 26, "3": 27, "4": 28, "5": 29, "6": 30, "7": 31,
};

export function isValidBase32(text: string): boolean {
  if (!text) return false;
  const normalized = text.toUpperCase().replace(/[ =]/g, "").replace(/=+$/g, "");
  return normalized.length > 0 && /^[A-Z2-7]+$/.test(normalized);
}

export function decodeBase32(text: string): Uint8Array {
  const normalized = text.toUpperCase().replace(/[ =]/g, "");
  if (!isValidBase32(normalized)) {
    throw new Error("La semilla Base32 contiene caracteres inválidos. Usa solo A-Z y 2-7.");
  }

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of normalized.replace(/=+$/g, "")) {
    value = (value << 5) | BASE32_LOOKUP[char];
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      output.push((value >>> bits) & 0xff);
    }
  }

  return new Uint8Array(output);
}
