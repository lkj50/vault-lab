import { useEffect, useState } from "react";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
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

import { api, readJwtExpiration } from "@/api/client";
import MfaModal from "@/components/MfaModal";
import { elevationExpired } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { theme } from "@/theme";

interface LastVerification {
  stepUpToken: string;
  code: string;
  verifiedAt: number;
}

export default function VaultTab() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const elevatedToken = useAppSelector((state) => state.auth.elevatedToken);
  const [stepUpToken, setStepUpToken] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [vaultData, setVaultData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [lastVerification, setLastVerification] =
    useState<LastVerification | null>(null);
  const [replayResponse, setReplayResponse] = useState("");
  const [loadingVault, setLoadingVault] = useState(false);
  const [secondsSinceVerification, setSecondsSinceVerification] = useState(0);

  async function loadVault() {
    setLoadingVault(true);
    setError("");
    try {
      const response = await api.get("/api/boveda-critica");
      setVaultData(response.data.data as Record<string, unknown>);
    } catch (requestError) {
      setVaultData(null);
      if (axios.isAxiosError(requestError)) {
        const data = requestError.response?.data as
          | { error?: string; step_up_token?: string }
          | undefined;
        if (
          requestError.response?.status === 403 &&
          data?.error === "mfa_required"
        ) {
          setStepUpToken(data.step_up_token ?? "");
          setModalVisible(true);
          return;
        }
        setError(
          requestError.response?.status
            ? `Error HTTP ${requestError.response.status}`
            : "Error de conexión.",
        );
      } else {
        setError("No se pudo cargar la bóveda.");
      }
    } finally {
      setLoadingVault(false);
    }
  }

  useEffect(() => {
    if (!accessToken) {
      router.replace("/");
      return;
    }
    void loadVault();
  }, [accessToken, router]);

  useEffect(() => {
    if (!elevatedToken) {
      setSecondsLeft(0);
      return;
    }

    const updateCountdown = () => {
      const exp = readJwtExpiration(elevatedToken);
      const remaining = exp
        ? Math.max(0, exp - Math.floor(Date.now() / 1000))
        : 0;
      setSecondsLeft(remaining);
      if (remaining === 0) {
        dispatch(elevationExpired());
        setVaultData(null);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [elevatedToken, dispatch]);

  useEffect(() => {
    if (!lastVerification) return;
    const updateElapsed = () => {
      setSecondsSinceVerification(
        Math.max(0, Math.floor((Date.now() - lastVerification.verifiedAt) / 1000)),
      );
    };
    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [lastVerification]);

  function handleMfaSuccess(usedStepUpToken: string, code: string) {
    setModalVisible(false);
    setLastVerification({
      stepUpToken: usedStepUpToken,
      code,
      verifiedAt: Date.now(),
    });
    setSecondsSinceVerification(0);
    setReplayResponse("");
    void loadVault();
  }

  async function resendLastCode() {
    if (!lastVerification) return;
    try {
      await api.post("/auth/mfa/verify", {
        step_up_token: lastVerification.stepUpToken,
        code: lastVerification.code,
      });
      setReplayResponse("El servidor aceptó la repetición.");
    } catch (replayError) {
      if (
        axios.isAxiosError(replayError) &&
        replayError.response?.status === 409
      ) {
        setReplayResponse("409: Ataque de repetición detectado.");
      } else {
        setReplayResponse("No se recibió la respuesta 409 esperada.");
      }
    }
  }

  const unlocked = vaultData !== null && elevatedToken !== null && secondsLeft > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name={unlocked ? "lock-open-outline" : "lock-closed-outline"}
          size={42}
          color={unlocked ? theme.accent : theme.muted}
        />
        <Text style={styles.title}>{unlocked ? "Bóveda desbloqueada" : "Bóveda"}</Text>
        <Text style={styles.subtitle}>
          {unlocked
            ? "Contenido protegido accesible"
            : "Contenido protegido con 2FA"}
        </Text>
      </View>

      {unlocked ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos críticos</Text>
          {Object.entries(vaultData).map(([key, value]) => (
            <Text key={key} style={styles.value}>
              {key}: {String(value)}
            </Text>
          ))}
          <Text style={styles.timer}>Acceso elevado: {formatTime(secondsLeft)}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.lockedText}>Contenido protegido con 2FA</Text>
        </View>
      )}

      {lastVerification && (
        <View style={styles.demoCard}>
          <Text style={styles.demoTitle}>Demo anti-replay</Text>
          <Text style={styles.label}>
            Han pasado {secondsSinceVerification} segundos desde la verificación.
          </Text>
          <Pressable
            style={styles.demoButton}
            accessibilityRole="button"
            onPress={() => void resendLastCode()}
          >
            <Text style={styles.demoButtonText}>Reenviar último código</Text>
          </Pressable>
          {!!replayResponse && <Text style={styles.label}>{replayResponse}</Text>}
        </View>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
      {loadingVault && <ActivityIndicator color={theme.accent} />}
      <Pressable style={styles.retryButton} onPress={() => void loadVault()}>
        <Text style={styles.retryText}>Reintentar</Text>
      </Pressable>

      <MfaModal
        visible={modalVisible}
        stepUpToken={stepUpToken}
        onCancel={() => setModalVisible(false)}
        onSuccess={handleMfaSuccess}
      />
    </ScrollView>
    </SafeAreaView>
  );
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")} restantes`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.background,
  },
  container: {
    minHeight: "100%",
    alignItems: "center",
    backgroundColor: "#0B0F1A",
    gap: 16,
    padding: 24,
  },
  header: {
    alignItems: "center",
    gap: 6,
  },
  title: {
    color: "#E5E7EB",
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: "#9CA3AF",
  },
  card: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#164E63",
    backgroundColor: "#111827",
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    color: "#22D3EE",
    fontSize: 18,
    fontWeight: "700",
  },
  value: {
    color: "#E5E7EB",
  },
  lockedText: {
    color: "#9CA3AF",
    textAlign: "center",
  },
  timer: {
    color: "#22D3EE",
    fontWeight: "700",
  },
  demoCard: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#111827",
    padding: 16,
    gap: 10,
  },
  demoTitle: {
    color: "#22D3EE",
    fontWeight: "700",
  },
  label: {
    color: "#E5E7EB",
  },
  demoButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#164E63",
  },
  demoButtonText: {
    color: "#E5E7EB",
    fontWeight: "700",
  },
  error: {
    color: "#F87171",
  },
  retryButton: {
    minHeight: 44,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#22D3EE",
  },
  retryText: {
    color: "#22D3EE",
    fontWeight: "700",
  },
});
