// Stub de infraestructura.
import type { RequestHandler } from "express";
import { verifyToken, type AuthClaims } from "../lib/jwt.js";

declare global {
  namespace Express {
    interface Locals {
      authClaims?: AuthClaims;
    }
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ error: "invalid_token" });
    return;
  }

  try {
    const claims = verifyToken(authorization.slice("Bearer ".length));
    res.locals.authClaims = claims;
    next();
  } catch (error) {
    if (error instanceof Error && error.name === "TokenExpiredError") {
      res.status(401).json({ error: "token_expired" });
      return;
    }
    res.status(401).json({ error: "invalid_token" });
  }
};
