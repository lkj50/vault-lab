import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getRefreshToken } from "@/auth/tokenStorage";
import { logout } from "@/auth/oauthFlow";
import { useAppSelector } from "@/store/hooks";

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

  useEffect(() => {
    if (!accessToken) {
      router.replace("/");
      return;
    }

    const baseUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!baseUrl) return;

    void axios
      .get(`${baseUrl}/api/perfil`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then((response: { data: { email?: string } }) => {
        setProfileEmail(response.data.email ?? "");
      })
      .catch(() => setProfileEmail("No se pudo cargar el perfil"));

    void getRefreshToken().then((token) => setHasRefreshToken(Boolean(token)));

    const updateSeconds = () => {
      const exp = readExpiration(accessToken);
      setSecondsLeft(exp ? Math.max(0, exp - Math.floor(Date.now() / 1000)) : 0);
    };
    updateSeconds();
    const timer = setInterval(updateSeconds, 1000);
    return () => clearInterval(timer);
  }, [accessToken, router]);

  async function handleLogout() {
    await logout();
    router.replace("/");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sesión</Text>
      <Text style={styles.email}>{profileEmail}</Text>
      <View style={styles.card}>
        <Text style={styles.label}>
          access_token en memoria: {accessToken?.slice(0, 16)}…
        </Text>
        <Text style={styles.label}>
          refresh_token en SecureStore: {hasRefreshToken ? "✅" : "❌"}
        </Text>
        <Text style={styles.label}>Tiempo restante: {secondsLeft} s</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => void handleLogout()}
      >
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0F1A",
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
});
