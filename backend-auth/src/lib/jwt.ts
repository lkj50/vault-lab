// Stub de infraestructura.
import jwt, { type JwtPayload } from "jsonwebtoken";
import { config } from "../config.js";

export interface AuthClaims extends JwtPayload {
  sub: string;
  email: string;
  typ: "access" | "step_up";
  mfa_verified?: boolean;
}

export function signAccessToken(email = "estudiante@unisabana.edu.co"): string {
  return jwt.sign(
    { sub: email, email, mfa_verified: false, typ: "access" },
    config.jwtSecret,
    { algorithm: "HS256", expiresIn: config.accessTokenTtl },
  );
}

export function signStepUpToken(email = "estudiante@unisabana.edu.co"): string {
  return jwt.sign(
    { sub: email, email, typ: "step_up" },
    config.jwtSecret,
    { algorithm: "HS256", expiresIn: 300 },
  );
}

export function signElevatedToken(email = "estudiante@unisabana.edu.co"): string {
  return jwt.sign(
    { sub: email, email, mfa_verified: true, typ: "access" },
    config.jwtSecret,
    { algorithm: "HS256", expiresIn: 600 },
  );
}

export function verifyToken(token: string): AuthClaims {
  return jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] }) as AuthClaims;
}
