import { useEffect, useState } from "react";
import axios from "axios";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "@/api/client";
import { getTotpSecret } from "@/auth/tokenStorage";
import { decodeBase32 } from "@/totp/base32";
import { generateTotp } from "@/totp/totp";
import { theme } from "@/theme";

interface MfaModalProps {
  visible: boolean;
  stepUpToken: string;
  onCancel: () => void;
  onSuccess: (stepUpToken: string, code: string) => void;
}

export default function MfaModal({
  visible,
  stepUpToken,
  onCancel,
  onSuccess,
}: MfaModalProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSecret, setHasSecret] = useState(false);

  useEffect(() => {
    void getTotpSecret().then((secret) => setHasSecret(Boolean(secret)));
    if (!visible) {
      setCode("");
      setError("");
    }
  }, [visible]);

  async function useAuthenticatorCode() {
    const secret = await getTotpSecret();
    if (!secret) return;
    try {
      const generated = await generateTotp(decodeBase32(secret), Date.now());
      setCode(generated);
      setError("");
    } catch {
      setError("No se pudo generar el código desde el Authenticator.");
    }
  }

  async function verify() {
    if (!/^\d{6}$/.test(code)) return;
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/auth/mfa/verify", {
        step_up_token: stepUpToken,
        code,
      });
      const elevatedToken = response.data.elevated_token as string;
      const { mfaElevated } = await import("@/store/authSlice");
      const { store } = await import("@/store");
      store.dispatch(mfaElevated(elevatedToken));
      onSuccess(stepUpToken, code);
    } catch (verifyError) {
      if (axios.isAxiosError(verifyError)) {
        const status = verifyError.response?.status;
        const data = verifyError.response?.data as { error?: string } | undefined;
        if (status === 409 || data?.error === "replay_attack_detected") {
          setError("⚠️ Ataque de repetición detectado (409): este código ya fue usado.");
        } else if (status === 401 && data?.error === "invalid_code") {
          setError("Código incorrecto o vencido. Revisa tu Authenticator.");
        } else {
          setError(status ? `Error HTTP ${status}. Inténtalo de nuevo.` : "Error de conexión.");
        }
      } else {
        setError("Error genérico al verificar el código.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Verificación en dos pasos</Text>
          <Text style={styles.description}>
            Esta zona protegida requiere un código TOTP.
          </Text>
          <TextInput
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={6}
            autoFocus
            style={styles.input}
            placeholder="000000"
            placeholderTextColor="#6B7280"
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          {hasSecret && (
            <Pressable onPress={() => void useAuthenticatorCode()}>
              <Text style={styles.link}>Usar código de mi Authenticator</Text>
            </Pressable>
          )}
          <Pressable
            disabled={code.length !== 6 || loading}
            style={[styles.primary, (code.length !== 6 || loading) && styles.disabled]}
            onPress={() => void verify()}
          >
            <Text style={styles.primaryText}>{loading ? "Verificando…" : "Verificar"}</Text>
          </Pressable>
          <Pressable style={styles.cancel} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
    padding: 24,
  },
  card: {
    width: "100%",
    borderRadius: 14,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 20,
    gap: 14,
  },
  title: {
    color: "#22D3EE",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  description: {
    color: "#E5E7EB",
    textAlign: "center",
  },
  input: {
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#0B0F1A",
    color: "#E5E7EB",
    fontFamily: "Menlo",
    fontSize: 28,
    letterSpacing: 8,
    textAlign: "center",
  },
  error: {
    color: "#F87171",
    textAlign: "center",
  },
  link: {
    color: "#22D3EE",
    textAlign: "center",
  },
  primary: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#22D3EE",
  },
  disabled: {
    opacity: 0.45,
  },
  primaryText: {
    color: "#0B0F1A",
    fontWeight: "800",
  },
  cancel: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "#9CA3AF",
  },
});
