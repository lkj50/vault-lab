import { createHash, randomBytes } from "node:crypto";
import { generateTotp } from "../src/lib/totp.js";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:4000";
const totpSecret = process.env.TOTP_SECRET ?? "JBSWY3DPEHPK3PXP";

function makeVerifier(): string {
  return randomBytes(48).toString("base64url").slice(0, 64);
}

function challenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

async function jsonRequest(
  path: string,
  options: RequestInit = {},
): Promise<{ status: number; body: any; headers: Headers }> {
  const response = await fetch(`${baseUrl}${path}`, options);
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  return { status: response.status, body, headers: response.headers };
}

async function authorize(): Promise<{ code: string; state: string }> {
  const verifier = makeVerifier();
  const verifierChallenge = challenge(verifier);
  const state = randomBytes(16).toString("base64url");
  const authorizeQuery = new URLSearchParams({
    response_type: "code",
    client_id: "unisabana-mobile",
    redirect_uri: "manual",
    code_challenge: verifierChallenge,
    code_challenge_method: "S256",
    state,
  });

  const getResult = await jsonRequest(`/oauth/authorize?${authorizeQuery}`);
  if (getResult.status !== 200) throw new Error("GET /oauth/authorize falló");

  const form = new URLSearchParams({
    email: "estudiante@unisabana.edu.co",
    password: "Sabana2026*",
    response_type: "code",
    client_id: "unisabana-mobile",
    redirect_uri: "manual",
    code_challenge: verifierChallenge,
    code_challenge_method: "S256",
    state,
  });
  const postResult = await fetch(`${baseUrl}/oauth/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    redirect: "manual",
  });

  const location = postResult.headers.get("location") ?? "";
  const codeMatch = location.match(/[?&]code=([^&]+)/);
  const stateMatch = location.match(/[?&]state=([^&]+)/);
  if (postResult.status !== 302 || !codeMatch || !stateMatch) {
    throw new Error("POST /oauth/authorize falló");
  }
  if (decodeURIComponent(stateMatch[1]) !== state) {
    throw new Error("El state no coincide");
  }

  return {
    code: decodeURIComponent(codeMatch[1]),
    state,
  };
}

async function main() {
  let failed = false;
  const step = async (name: string, action: () => Promise<boolean>) => {
    try {
      const ok = await action();
      console.log(`${ok ? "✅" : "❌"} ${name}`);
      if (!ok) failed = true;
    } catch (error) {
      console.log(`❌ ${name}`);
      console.error(error instanceof Error ? error.message : error);
      failed = true;
    }
  };

  let verifier = "";
  let code = "";

  await step("GET /oauth/authorize", async () => {
    verifier = makeVerifier();
    const state = randomBytes(16).toString("base64url");
    const query = new URLSearchParams({
      response_type: "code",
      client_id: "unisabana-mobile",
      redirect_uri: "manual",
      code_challenge: challenge(verifier),
      code_challenge_method: "S256",
      state,
    });
    const result = await jsonRequest(`/oauth/authorize?${query}`);
    return result.status === 200;
  });

  await step("POST /oauth/authorize emite code y state válido", async () => {
    const authorized = await authorize();
    code = authorized.code;
    verifier = makeVerifier();
    return true;
  });

  let accessToken = "";
  let refreshToken = "";
  let stepUpToken = "";
  let elevatedToken = "";

  await step("PKCE incorrecto devuelve 400 invalid_grant", async () => {
    const result = await jsonRequest("/auth/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        code_verifier: "incorrecto",
        redirect_uri: "manual",
        client_id: "unisabana-mobile",
      }),
    });
    return result.status === 400 && result.body.error === "invalid_grant";
  });

  await step("PKCE correcto intercambia el code por tokens", async () => {
    const secondAuthorization = await authorize();
    code = secondAuthorization.code;

    verifier = makeVerifier();
    const correctChallenge = challenge(verifier);
    const state = randomBytes(16).toString("base64url");
    const authorizeQuery = new URLSearchParams({
      response_type: "code",
      client_id: "unisabana-mobile",
      redirect_uri: "manual",
      code_challenge: correctChallenge,
      code_challenge_method: "S256",
      state,
    });
    const getResult = await jsonRequest(`/oauth/authorize?${authorizeQuery}`);
    if (getResult.status !== 200) return false;

    const form = new URLSearchParams({
      email: "estudiante@unisabana.edu.co",
      password: "Sabana2026*",
      response_type: "code",
      client_id: "unisabana-mobile",
      redirect_uri: "manual",
      code_challenge: correctChallenge,
      code_challenge_method: "S256",
      state,
    });
    const post = await fetch(`${baseUrl}/oauth/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      redirect: "manual",
    });
    const location = post.headers.get("location") ?? "";
    const match = location.match(/[?&]code=([^&]+)/);
    if (!match) return false;
    code = decodeURIComponent(match[1]);

    const result = await jsonRequest("/auth/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        code_verifier: verifier,
        redirect_uri: "manual",
        client_id: "unisabana-mobile",
      }),
    });
    if (result.status !== 200) return false;
    accessToken = result.body.access_token;
    refreshToken = result.body.refresh_token;
    return true;
  });

  await step("GET /api/perfil devuelve 200", async () => {
    const result = await jsonRequest("/api/perfil", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return result.status === 200;
  });

  await step("GET /api/boveda-critica devuelve 403 mfa_required", async () => {
    const result = await jsonRequest("/api/boveda-critica", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (result.status === 403 && result.body.error === "mfa_required") {
      stepUpToken = result.body.step_up_token;
      return true;
    }
    return false;
  });

  let totpCode = "";
  await step("TOTP válido eleva la sesión", async () => {
    totpCode = generateTotp(totpSecret, Date.now());
    const result = await jsonRequest("/auth/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step_up_token: stepUpToken, code: totpCode }),
    });
    if (result.status !== 200) return false;
    elevatedToken = result.body.elevated_token;
    return true;
  });

  await step("Elevated token permite la bóveda crítica", async () => {
    const result = await jsonRequest("/api/boveda-critica", {
      headers: { Authorization: `Bearer ${elevatedToken}` },
    });
    return result.status === 200;
  });

  await step("Repetir el mismo TOTP devuelve 409", async () => {
    const result = await jsonRequest("/auth/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step_up_token: stepUpToken, code: totpCode }),
    });
    return result.status === 409 &&
      result.body.error === "replay_attack_detected";
  });

  await step("Refresh rota el refresh token", async () => {
    const result = await jsonRequest("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (result.status !== 200) return false;
    refreshToken = result.body.refresh_token;
    return true;
  });

  await step("El refresh antiguo devuelve 401", async () => {
    const oldRefreshToken = await (async () => {
      const secondAuthorization = await authorize();
      const oldVerifier = makeVerifier();
      const oldChallenge = challenge(oldVerifier);
      const state = randomBytes(16).toString("base64url");
      const query = new URLSearchParams({
        response_type: "code",
        client_id: "unisabana-mobile",
        redirect_uri: "manual",
        code_challenge: oldChallenge,
        code_challenge_method: "S256",
        state,
      });
      await jsonRequest(`/oauth/authorize?${query}`);
      const form = new URLSearchParams({
        email: "estudiante@unisabana.edu.co",
        password: "Sabana2026*",
        response_type: "code",
        client_id: "unisabana-mobile",
        redirect_uri: "manual",
        code_challenge: oldChallenge,
        code_challenge_method: "S256",
        state,
      });
      const post = await fetch(`${baseUrl}/oauth/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
        redirect: "manual",
      });
      const location = post.headers.get("location") ?? "";
      const match = location.match(/[?&]code=([^&]+)/);
      if (!match) return "";
      const exchange = await jsonRequest("/auth/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code: decodeURIComponent(match[1]),
          code_verifier: oldVerifier,
          redirect_uri: "manual",
          client_id: "unisabana-mobile",
        }),
      });
      return typeof exchange.body.refresh_token === "string"
        ? exchange.body.refresh_token
        : "";
    })();

    if (!oldRefreshToken) return false;
    const oldRefreshBeforeRotation = oldRefreshToken;
    const firstRotation = await jsonRequest("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: oldRefreshBeforeRotation }),
    });
    if (firstRotation.status !== 200) return false;
    const replayedRotation = await jsonRequest("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: oldRefreshBeforeRotation }),
    });
    return replayedRotation.status === 401 &&
      replayedRotation.body.error === "invalid_refresh_token";
  });

  if (failed) process.exitCode = 1;
}

void main();
