import * as SecureStore from "expo-secure-store";

const TOTP_SECRET_KEY = "vault-totp-secret";
const TOTP_METADATA_KEY = "vault-totp-metadata";
const REFRESH_TOKEN_KEY = "vault-refresh-token";

export async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function deleteRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function saveTotpSecret(secret: string): Promise<void> {
  await SecureStore.setItemAsync(TOTP_SECRET_KEY, secret);
}

export async function getTotpSecret(): Promise<string | null> {
  return SecureStore.getItemAsync(TOTP_SECRET_KEY);
}

export async function deleteTotpSecret(): Promise<void> {
  await SecureStore.deleteItemAsync(TOTP_SECRET_KEY);
  await SecureStore.deleteItemAsync(TOTP_METADATA_KEY);
}

export async function saveTotpMetadata(metadata: { issuer: string; account: string }): Promise<void> {
  await SecureStore.setItemAsync(TOTP_METADATA_KEY, JSON.stringify(metadata));
}

export async function getTotpMetadata(): Promise<{ issuer: string; account: string } | null> {
  const value = await SecureStore.getItemAsync(TOTP_METADATA_KEY);
  if (!value) return null;
  return JSON.parse(value) as { issuer: string; account: string };
}
