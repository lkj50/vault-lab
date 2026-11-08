import axios from "axios";
import * as AuthSession from "expo-auth-session";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { store } from "@/store";
import { loginSucceeded, loggedOut } from "@/store/authSlice";
import {
  deleteRefreshToken,
  getRefreshToken,
  saveRefreshToken,
} from "./tokenStorage";
import { generateCodeChallenge, generateCodeVerifier, generateState } from "./pkce";

export const redirectUri = AuthSession.makeRedirectUri({
  scheme: "unisabana-auth",
  path: "oauth/callback",
});

let codeVerifier: string | null = null;
let expectedState: string | null = null;

export let simulateCsrf = false;

export function setSimulateCsrf(enabled: boolean): void {
  simulateCsrf = enabled;
}

export async function login(): Promise<boolean> {
  codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  expectedState = generateState();

  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!baseUrl) throw new Error("EXPO_PUBLIC_API_URL no está configurada.");

  const authorizeUrl = new URL(`${baseUrl}/oauth/authorize`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", "unisabana-mobile");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("state", expectedState);

  const result = await WebBrowser.openAuthSessionAsync(
    authorizeUrl.toString(),
    redirectUri,
  );
  if (result.type !== "success") return false;

  const parsed = Linking.parse(result.url);
  let receivedState = typeof parsed.queryParams?.state === "string"
    ? parsed.queryParams.state
    : "";
  const code = typeof parsed.queryParams?.code === "string"
    ? parsed.queryParams.code
    : "";

  if (simulateCsrf && receivedState) {
    receivedState = `${receivedState}-alterado`;
  }

  if (!receivedState || receivedState !== expectedState) {
    codeVerifier = null;
    expectedState = null;
    throw new Error(
      "State inválido: posible ataque CSRF. Se abortó el inicio de sesión.",
    );
  }
  if (!code) throw new Error("El servidor no devolvió el código OAuth.");

  const tokenResponse = await axios.post(`${baseUrl}/auth/oauth/token`, {
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
    client_id: "unisabana-mobile",
  });

  await saveRefreshToken(tokenResponse.data.refresh_token as string);
  const accessToken = tokenResponse.data.access_token as string;
  let profile: { sub: string; email: string; mfa_verified: boolean } = {
    sub: "estudiante@unisabana.edu.co",
    email: "estudiante@unisabana.edu.co",
    mfa_verified: false,
  };
  try {
    const profileResponse = await axios.get(`${baseUrl}/api/perfil`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    profile = profileResponse.data as typeof profile;
  } catch {
    // El perfil demo conserva los valores del usuario conocido si falla su carga.
  }
  store.dispatch(
    loginSucceeded({
      accessToken,
      user: profile,
    }),
  );

  codeVerifier = null;
  expectedState = null;
  return true;
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;

  try {
    if (refreshToken && baseUrl) {
      await axios.post(`${baseUrl}/auth/logout`, {
        refresh_token: refreshToken,
      });
    }
  } finally {
    await deleteRefreshToken();
    store.dispatch(loggedOut());
  }
}
