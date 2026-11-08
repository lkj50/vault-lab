import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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

export default function AuthenticatorTab() {
  const router = useRouter();
  const [secret, setSecret] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{ issuer: string; account: string } | null>(null);
  const [manualSecret, setManualSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
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
      <View style={styles.container}>
        <Text style={styles.text}>Cargando autenticador...</Text>
      </View>
    );
  }

  if (!secret) {
    return (
      <View style={styles.container}>
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
        <Button title="Guardar" onPress={() => void saveManualSeed()} />
        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
    backgroundColor: "#0B0F1A",
  },
  title: {
    color: "#22D3EE",
    fontSize: 24,
    fontWeight: "700",
  },
  text: {
    color: "#E5E7EB",
  },
  account: {
    color: "#9CA3AF",
  },
  label: {
    color: "#E5E7EB",
    marginTop: 12,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#E5E7EB",
    backgroundColor: "#111827",
    fontFamily: "Menlo",
  },
  error: {
    color: "#F87171",
    textAlign: "center",
  },
});
