function readNumber(name: string, fallback: number): number {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : Number(value);
}

export const config = {
  host: process.env.HOST ?? "0.0.0.0",
  port: readNumber("PORT", 4000),
  jwtSecret: process.env.JWT_SECRET ?? "",
  accessTokenTtl: readNumber("ACCESS_TOKEN_TTL", 300),
  refreshTokenTtl: readNumber("REFRESH_TOKEN_TTL", 2592000),
  totpSecret: process.env.TOTP_SECRET ?? "JBSWY3DPEHPK3PXP",
  allowedRedirectPrefixes: (process.env.ALLOWED_REDIRECT_PREFIXES ?? "exp://,unisabana-auth://")
    .split(",")
    .map((prefix) => prefix.trim()),
};
