// Stub de infraestructura.
import { randomBytes } from "node:crypto";
import type { Router } from "express";
import express from "express";
import { config } from "../config.js";
import {
  signAccessToken,
  signElevatedToken,
  signStepUpToken,
  verifyToken,
} from "../lib/jwt.js";
import { verifyCodeChallenge } from "../lib/pkce.js";
import { verifyTotp } from "../lib/totp.js";
import {
  authCodes,
  createRefreshToken,
  replayCache,
  revokeRefreshToken,
  rotateRefreshToken,
} from "../store.js";

export const authRouter: Router = express.Router();

authRouter.post("/auth/oauth/token", (req, res) => {
  const { grant_type, code, code_verifier, redirect_uri, client_id } =
    req.body as Record<string, string>;

  const record = authCodes.get(code);
  if (
    grant_type !== "authorization_code" ||
    !record ||
    record.used ||
    record.expiresAt <= Date.now() ||
    record.clientId !== client_id ||
    record.redirectUri !== redirect_uri ||
    !verifyCodeChallenge(code_verifier ?? "", record.codeChallenge)
  ) {
    res.status(400).json({ error: "invalid_grant" });
    return;
  }

  record.used = true;
  const accessToken = signAccessToken();
  const refreshToken = createRefreshToken("estudiante@unisabana.edu.co", config.refreshTokenTtl);
  console.log(`[oauth] Token intercambiado para code ${code.slice(0, 8)}...`);

  res.status(200).json({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: config.accessTokenTtl,
  });
});

authRouter.post("/auth/refresh", (req, res) => {
  const { refresh_token } = req.body as { refresh_token?: string };
  const rotation = rotateRefreshToken(refresh_token ?? "", config.refreshTokenTtl);
  if (!rotation.oldTokenValid || !rotation.newToken || !rotation.email) {
    res.status(401).json({ error: "invalid_refresh_token" });
    return;
  }

  res.status(200).json({
    access_token: signAccessToken(rotation.email),
    refresh_token: rotation.newToken,
    expires_in: config.accessTokenTtl,
  });
});

authRouter.post("/auth/logout", (req, res) => {
  const { refresh_token } = req.body as { refresh_token?: string };
  revokeRefreshToken(refresh_token ?? "");
  res.status(204).send();
});

authRouter.post("/auth/mfa/verify", (req, res) => {
  const { step_up_token, code } = req.body as {
    step_up_token?: string;
    code?: string;
  };

  let claims;
  try {
    if (!step_up_token) throw new Error("Missing step-up token");
    claims = verifyToken(step_up_token);
    if (claims.typ !== "step_up") throw new Error("Invalid token type");
  } catch {
    res.status(401).json({ error: "invalid_step_up_token" });
    return;
  }

  const replayKey = `${claims.sub}:${code}`;
  const replayExpiresAt = replayCache.get(replayKey);
  if (replayExpiresAt && replayExpiresAt > Date.now()) {
    console.log(`[mfa] Replay detectado para ${claims.sub} con código ${code}`);
    res.status(409).json({
      error: "replay_attack_detected",
      message: "Replay Attack Detected",
    });
    return;
  }

  if (!verifyTotp(config.totpSecret, code ?? "", Date.now())) {
    res.status(401).json({ error: "invalid_code" });
    return;
  }

  replayCache.set(replayKey, Date.now() + 90_000);
  console.log(`[mfa] TOTP válido para ${claims.sub}`);
  res.status(200).json({
    elevated_token: signElevatedToken(claims.email),
    expires_in: 600,
  });
});
