// Estructura reservada para el estado en memoria de fases posteriores.
import { randomBytes } from "node:crypto";

export interface AuthCode {
  codeChallenge: string;
  clientId: string;
  redirectUri: string;
  expiresAt: number;
  used: boolean;
}

export interface RefreshTokenRecord {
  email: string;
  expiresAt: number;
}

export const authCodes = new Map<string, AuthCode>();
export const refreshTokens = new Map<string, RefreshTokenRecord>();
export const replayCache = new Map<string, number>();

export function createAuthCode(record: Omit<AuthCode, "expiresAt" | "used">): string {
  const code = randomBytes(32).toString("base64url");
  authCodes.set(code, {
    ...record,
    expiresAt: Date.now() + 60_000,
    used: false,
  });
  return code;
}

export function createRefreshToken(email: string, ttlSeconds: number): string {
  const token = randomBytes(32).toString("base64url");
  refreshTokens.set(token, {
    email,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  return token;
}

export function rotateRefreshToken(oldToken: string, ttlSeconds: number): {
  oldTokenValid: boolean;
  newToken?: string;
  email?: string;
} {
  const record = refreshTokens.get(oldToken);
  if (!record || record.expiresAt <= Date.now()) {
    refreshTokens.delete(oldToken);
    return { oldTokenValid: false };
  }

  refreshTokens.delete(oldToken);
  const newToken = createRefreshToken(record.email, ttlSeconds);
  console.log(`[refresh] Refresh rotado; token anterior revocado: ${oldToken.slice(0, 8)}...`);
  return { oldTokenValid: true, newToken, email: record.email };
}

export function revokeRefreshToken(token: string): void {
  refreshTokens.delete(token);
}

setInterval(() => {
  const now = Date.now();
  for (const [key, expiresAt] of replayCache.entries()) {
    if (expiresAt <= now) replayCache.delete(key);
  }

  for (const [code, record] of authCodes.entries()) {
    if (record.expiresAt <= now) authCodes.delete(code);
  }

  for (const [token, record] of refreshTokens.entries()) {
    if (record.expiresAt <= now) refreshTokens.delete(token);
  }
}, 30_000).unref();
