import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getRefreshToken } from "@/auth/tokenStorage";
import { logout } from "@/auth/oauthFlow";
import { useAppSelector } from "@/store/hooks";
import { api, getRefreshCount } from "@/api/client";
import { theme } from "@/theme";

function readExpiration(accessToken: string | null): number | null {
  if (!accessToken) return null;
  try {
    const payloadPart = accessToken.split(".")[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let binary = "";
    for (let i = 0; i < padded.length; i += 4) {
      const a = alphabet.indexOf(padded[i]);
      const b = alphabet.indexOf(padded[i + 1]);
      const c = padded[i + 2] === "=" ? 0 : alphabet.indexOf(padded[i + 2]);
      const d = padded[i + 3] === "=" ? 0 : alphabet.indexOf(padded[i + 3]);
      const value = (a << 18) | (b << 12) | (c << 6) | d;
      binary += String.fromCharCode((value >>> 16) & 255);
      if (padded[i + 2] !== "=") binary += String.fromCharCode((value >>> 8) & 255);
      if (padded[i + 3] !== "=") binary += String.fromCharCode(value & 255);
    }
    const payload = JSON.parse(binary) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export default function HomeTab() {
  const router = useRouter();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const [profileEmail, setProfileEmail] = useState("");
  const [hasRefreshToken, setHasRefreshToken] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [demoResults, setDemoResults] = useState<string[]>([]);
  const [demoMessage, setDemoMessage] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingDemo, setLoadingDemo] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      router.replace("/");
      return;
    }

    void api
      .get("/api/perfil")
      .then((response: { data: { email?: string } }) => {
        setProfileEmail(response.data.email ?? "");
      })
      .catch(() => setProfileEmail("No se pudo cargar el perfil"))
      .finally(() => setLoadingProfile(false));

    void getRefreshToken().then((token) => setHasRefreshToken(Boolean(token)));

    const updateSeconds = () => {
      const exp = readExpiration(accessToken);
      setSecondsLeft(exp ? exp - Math.floor(Date.now() / 1000) : 0);
    };
    updateSeconds();
    const timer = setInterval(updateSeconds, 1000);
    return () => clearInterval(timer);
  }, [accessToken, router]);

  async function handleLogout() {
    await logout();
    router.replace("/");
  }

  async function launchThreeRequests() {
    setLoadingDemo(true);
    const before = getRefreshCount();
    const results = await Promise.allSettled([
      api.get("/api/perfil"),
      api.get("/api/perfil"),
      api.get("/api/perfil"),
    ]);
    setDemoResults(results.map((result) => result.status === "fulfilled" ? "✅" : "❌"));
    setDemoMessage(
      `Renovaciones realizadas: ${getRefreshCount() - before} (N=${getRefreshCount()})`,
    );
    setLoadingDemo(false);
  }

  async function revokeRefreshToken() {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      setDemoMessage("No hay refresh_token local.");
      return;
    }
    try {
      await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/auth/logout`, {
        refresh_token: refreshToken,
      });
      setDemoMessage(
        "Espera a que venza el access_token y lanza las peticiones",
      );
    } catch {
      setDemoMessage("No se pudo revocar el refresh_token.");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sesión</Text>
      {loadingProfile ? (
        <ActivityIndicator color={theme.accent} />
      ) : (
        <Text style={styles.email}>{profileEmail}</Text>
      )}
      <View style={styles.card}>
        <Text style={styles.label}>
          access_token en memoria: {accessToken?.slice(0, 16)}…
        </Text>
        <Text style={styles.label}>
          refresh_token en SecureStore: {hasRefreshToken ? "✅" : "❌"}
        </Text>
        <Text style={styles.label}>
          Tiempo restante: {secondsLeft <= 0 ? "expirado" : `${secondsLeft} s`}
        </Text>
      </View>
      <View style={styles.demoCard}>
        <Text style={styles.demoTitle}>Demo: cola de silent refresh</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.demoButton}
          onPress={() => void launchThreeRequests()}
        >
          {loadingDemo ? (
            <ActivityIndicator color={theme.text} />
          ) : (
            <Text style={styles.demoButtonText}>Lanzar 3 peticiones simultáneas</Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.demoButton}
          onPress={() => void revokeRefreshToken()}
        >
          <Text style={styles.demoButtonText}>Revocar refresh en el servidor (demo)</Text>
        </Pressable>
        {!!demoResults.length && (
          <Text style={styles.label}>Resultados: {demoResults.join(" ")}</Text>
        )}
        {!!demoMessage && <Text style={styles.label}>{demoMessage}</Text>}
      </View>
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => void handleLogout()}
      >
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  container: {
    alignItems: "center",
    backgroundColor: theme.background,
    gap: 16,
    padding: 24,
  },
  title: {
    color: "#22D3EE",
    fontSize: 28,
    fontWeight: "800",
  },
  email: {
    color: "#E5E7EB",
    fontSize: 18,
  },
  card: {
    width: "100%",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#111827",
    padding: 16,
  },
  label: {
    color: "#E5E7EB",
  },
  button: {
    width: "100%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  buttonText: {
    color: "#F87171",
    fontWeight: "700",
  },
  demoCard: {
    width: "100%",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#164E63",
    backgroundColor: "#111827",
    padding: 16,
  },
  demoTitle: {
    color: "#22D3EE",
    fontWeight: "700",
  },
  demoButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#164E63",
    paddingHorizontal: 12,
  },
  demoButtonText: {
    color: "#E5E7EB",
    textAlign: "center",
  },
});
