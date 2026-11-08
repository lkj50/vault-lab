// Stub de infraestructura.
import type { Router } from "express";
import express from "express";
import { config } from "../config.js";
import { createAuthCode } from "../store.js";
import { renderLoginPage } from "../views/loginPage.js";

export const oauthRouter: Router = express.Router();

function validAuthorizeParams(
  responseType: unknown,
  clientId: unknown,
  redirectUri: unknown,
  codeChallenge: unknown,
  codeChallengeMethod: unknown,
  state: unknown,
): string | null {
  if (
    typeof responseType !== "string" ||
    typeof clientId !== "string" ||
    typeof redirectUri !== "string" ||
    typeof codeChallenge !== "string" ||
    typeof codeChallengeMethod !== "string" ||
    typeof state !== "string" ||
    !responseType ||
    !clientId ||
    !redirectUri ||
    !codeChallenge ||
    !state
  ) {
    return "Faltan parámetros OAuth obligatorios";
  }
  if (responseType !== "code") return "response_type inválido";
  if (codeChallengeMethod !== "S256") return "El método PKCE debe ser S256";

  const allowed = redirectUri === "manual" ||
    config.allowedRedirectPrefixes.some((prefix) => redirectUri.startsWith(prefix));
  if (!allowed) return "redirect_uri no permitido";

  return null;
}

oauthRouter.get("/authorize", (req, res) => {
  const validationError = validAuthorizeParams(
    req.query.response_type,
    req.query.client_id,
    req.query.redirect_uri,
    req.query.code_challenge,
    req.query.code_challenge_method,
    req.query.state,
  );
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  res.status(200).type("html").send(renderLoginPage({
    responseType: req.query.response_type as string,
    clientId: req.query.client_id as string,
    redirectUri: req.query.redirect_uri as string,
    codeChallenge: req.query.code_challenge as string,
    codeChallengeMethod: req.query.code_challenge_method as string,
    state: req.query.state as string,
  }));
});

oauthRouter.post("/authorize", (req, res) => {
  const {
    email,
    password,
    response_type,
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    state,
  } = req.body as Record<string, string>;

  const validationError = validAuthorizeParams(
    response_type,
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    state,
  );
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  if (email !== "estudiante@unisabana.edu.co" || password !== "Sabana2026*") {
    res.status(200).type("html").send(renderLoginPage({
      responseType: response_type,
      clientId: client_id,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
      state,
      error: "Credenciales incorrectas",
    }));
    return;
  }

  const code = createAuthCode({
    codeChallenge: code_challenge,
    clientId: client_id,
    redirectUri: redirect_uri,
  });
  console.log(`[oauth] Code emitido para ${email}: ${code.slice(0, 8)}...`);

  const separator = redirect_uri.includes("?") ? "&" : "?";
  res.redirect(302, `${redirect_uri}${separator}code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
});
