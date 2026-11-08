// Stub de infraestructura.
import type { Router } from "express";
import express from "express";
import { signStepUpToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const apiRouter: Router = express.Router();

apiRouter.get("/api/perfil", requireAuth, (req, res) => {
  const claims = res.locals.authClaims;
  if (!claims || claims.typ !== "access") {
    res.status(401).json({ error: "invalid_token" });
    return;
  }

  res.status(200).json({
    sub: claims.sub,
    email: claims.email,
    mfa_verified: claims.mfa_verified === true,
  });
});

apiRouter.get("/api/boveda-critica", requireAuth, (req, res) => {
  const claims = res.locals.authClaims;
  if (!claims || claims.typ !== "access") {
    res.status(401).json({ error: "invalid_token" });
    return;
  }

  if (claims.mfa_verified !== true) {
    const stepUpToken = signStepUpToken(claims.email);
    console.log(`[mfa] 403 mfa_required emitido para ${claims.email}`);
    res.status(403).json({
      error: "mfa_required",
      step_up_token: stepUpToken,
    });
    return;
  }

  res.status(200).json({
    data: {
      documento: "Datos sensibles ficticios",
      nivel: "critico",
    },
  });
});
