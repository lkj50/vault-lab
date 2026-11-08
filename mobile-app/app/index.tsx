import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { login, setSimulateCsrf } from "@/auth/oauthFlow";
import { deleteRefreshToken, getRefreshToken } from "@/auth/tokenStorage";
import { api, refreshAccessToken } from "@/api/client";
import { store } from "@/store";
import { loggedOut } from "@/store/authSlice";
import { theme } from "@/theme";

export default function HomeScreen() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoCsrf, setDemoCsrf] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      const refreshToken = await getRefreshToken();
      if (!refreshToken || store.getState().auth.accessToken) return;

      if (mounted) setRestoring(true);
      try {
        await refreshAccessToken();
        await api.get("/api/perfil");
        if (mounted) router.replace("/(tabs)/home");
      } catch {
        await deleteRefreshToken();
        store.dispatch(loggedOut());
      } finally {
        if (mounted) setRestoring(false);
      }
    }

    void restoreSession();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      const loggedIn = await login();
      if (loggedIn) {
        router.replace("/(tabs)/home");
      }
    } catch (loginError) {
      const message = loginError instanceof Error
        ? loginError.message
        : "No se pudo iniciar sesión.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function testConnection() {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/health`);
      const body: unknown = await response.json();

      if (!response.ok) {
        throw new Error(`El servidor respondió con ${response.status}`);
      }
      setResult(JSON.stringify(body));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      setResult(`Error: ${message}`);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logo}>
        <Ionicons name="shield-checkmark" size={64} color={theme.accent} />
      </View>
      <Text style={styles.title}>Vault</Text>
      <Text style={styles.subtitle}>
        Laboratorio de seguridad móvil
      </Text>

      {restoring && (
        <View style={styles.restoring}>
          <ActivityIndicator color="#22D3EE" />
          <Text style={styles.restoringText}>Restaurando sesión…</Text>
        </View>
      )}

      <Pressable
        disabled={loading}
        accessibilityRole="button"
        style={[styles.button, styles.loginButton]}
        onPress={() => void handleLogin()}
      >
        {loading ? (
          <ActivityIndicator color="#0B0F1A" />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
          </>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        style={[styles.button, styles.primaryButton]}
        onPress={() => router.push("/(tabs)/authenticator")}
      >
        <Text style={styles.buttonText}>Abrir Authenticator</Text>
      </Pressable>

      <View style={styles.demoRow}>
        <Text style={styles.demoText}>Modo demo: simular state alterado</Text>
        <Switch
          value={demoCsrf}
          onValueChange={(value) => {
            setDemoCsrf(value);
            setSimulateCsrf(value);
          }}
          trackColor={{ false: "#374151", true: "#0891B2" }}
          thumbColor={demoCsrf ? "#22D3EE" : "#9CA3AF"}
        />
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        accessibilityRole="button"
        style={[styles.button, styles.connectionButton]}
        onPress={() => void testConnection()}
      >
        <Text style={styles.connectionText}>Probar conexión</Text>
      </Pressable>

      <Text selectable style={styles.result}>
        {result}
      </Text>
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
    backgroundColor: "#0B0F1A",
  },
  logo: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 48,
    borderWidth: 1,
    borderColor: theme.accent,
    backgroundColor: theme.surface,
  },
  title: {
    color: "#22D3EE",
    fontSize: 48,
    fontWeight: "800",
  },
  subtitle: {
    color: "#9CA3AF",
    marginBottom: 12,
  },
  button: {
    width: "100%",
    minHeight: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButton: {
    gap: 2,
    backgroundColor: "#22D3EE",
  },
  primaryButton: {
    backgroundColor: "#22D3EE",
  },
  connectionButton: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: "#374151",
    marginTop: 8,
    backgroundColor: "transparent",
  },
  buttonText: {
    color: "#0B0F1A",
    fontSize: 16,
    fontWeight: "700",
  },
  primaryButtonText: {
    color: "#0B0F1A",
    fontSize: 16,
    fontWeight: "700",
  },
  disabledButtonText: {
    color: "#F3F4F6",
    fontSize: 16,
    fontWeight: "700",
  },
  disabledText: {
    color: "#D1D5DB",
    fontSize: 12,
  },
  connectionText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  demoRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  demoText: {
    flex: 1,
    color: "#9CA3AF",
    fontSize: 12,
  },
  error: {
    color: "#F87171",
    textAlign: "center",
  },
  result: {
    textAlign: "center",
    color: "#E5E7EB",
  },
  restoring: {
    alignItems: "center",
    gap: 8,
  },
  restoringText: {
    color: "#22D3EE",
  },
});
