import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  deleteTotpSecret,
  getTotpMetadata,
  getTotpSecret,
  saveTotpMetadata,
  saveTotpSecret,
} from "@/auth/tokenStorage";
import { CodeDisplay } from "@/components/CodeDisplay";
import { CountdownRing } from "@/components/CountdownRing";
import { decodeBase32, isValidBase32 } from "@/totp/base32";
import { useTotp } from "@/totp/useTotp";
import { theme } from "@/theme";

export default function AuthenticatorTab() {
  const router = useRouter();
  const [secret, setSecret] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{ issuer: string; account: string } | null>(null);
  const [manualSecret, setManualSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const totp = useTotp(secret);

  const loadAccount = useCallback(() => {
    void Promise.all([getTotpSecret(), getTotpMetadata()]).then(([savedSecret, savedMetadata]) => {
      setSecret(savedSecret);
      setMetadata(savedMetadata);
      setLoading(false);
    });
  }, []);

  useFocusEffect(loadAccount);

  async function saveManualSeed() {
    const normalized = manualSecret.trim().replace(/\s/g, "");
    if (!isValidBase32(normalized)) {
      setError("La semilla Base32 contiene caracteres inválidos.");
      return;
    }

    try {
      setSaving(true);
      decodeBase32(normalized);
      await saveTotpSecret(normalized);
      await saveTotpMetadata({
        issuer: "UniSabana",
        account: "estudiante@unisabana.edu.co",
      });
      setSecret(normalized.toUpperCase());
      setMetadata({
        issuer: "UniSabana",
        account: "estudiante@unisabana.edu.co",
      });
      setError("");
    } catch {
      setError("No fue posible guardar la semilla.");
    } finally {
      setSaving(false);
    }
  }

  async function removeAccount() {
    await deleteTotpSecret();
    setSecret(null);
    setMetadata(null);
    setManualSecret("");
    setError("");
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={theme.accent} />
        <Text style={styles.text}>Cargando autenticador...</Text>
      </SafeAreaView>
    );
  }

  if (!secret) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Configurar Authenticator</Text>
        <Button title="Escanear QR" onPress={() => router.push("/scan")} />
        <Text style={styles.label}>O pega la semilla Base32</Text>
        <TextInput
          value={manualSecret}
          onChangeText={setManualSecret}
          autoCapitalize="characters"
          placeholder="JBSWY3DPEHPK3PXP"
          placeholderTextColor="#6B7280"
          style={styles.input}
        />
        {saving ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <Button title="Guardar" onPress={() => void saveManualSeed()} />
        )}
        {!!error && <Text style={styles.error}>{error}</Text>}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{metadata?.issuer ?? "UniSabana"}</Text>
      <Text style={styles.account}>
        {metadata?.account ?? "estudiante@unisabana.edu.co"}
      </Text>
      <CodeDisplay code={totp.code} />
      <CountdownRing
        secondsLeft={totp.secondsLeft}
        progress={totp.progress}
      />
      <Button title="Borrar cuenta" color="#EF4444" onPress={() => void removeAccount()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
    backgroundColor: theme.background,
  },
  title: {
    color: theme.accent,
    fontSize: 24,
    fontWeight: "700",
  },
  text: {
    color: theme.text,
  },
  account: {
    color: theme.muted,
  },
  label: {
    color: theme.text,
    marginTop: 12,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.text,
    backgroundColor: theme.surface,
    fontFamily: "Menlo",
  },
  error: {
    color: theme.danger,
    textAlign: "center",
  },
});
