import { useRef, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { Button, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { saveTotpMetadata, saveTotpSecret } from "@/auth/tokenStorage";
import { parseOtpauthUri } from "@/totp/otpauth";
import { theme } from "@/theme";

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);
  const [error, setError] = useState("");
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      padding: 24,
      backgroundColor: theme.background,
    },
    camera: {
      width: "100%",
      flex: 1,
    },
    text: {
      color: theme.text,
      textAlign: "center",
    },
    error: {
      color: theme.danger,
      textAlign: "center",
    },
  });

  if (!permission) {
    return <SafeAreaView style={styles.container} />;
  }
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.text}>Se necesita permiso para usar la cámara.</Text>
        <Button title="Permitir cámara" onPress={() => void requestPermission()} />
        <Button title="Volver" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  async function handleBarcode(result: { data: string }) {
    if (scanned.current) return;
    scanned.current = true;

    try {
      const account = parseOtpauthUri(result.data);
      await saveTotpSecret(account.secret);
      await saveTotpMetadata({ issuer: account.issuer, account: account.account });
      router.back();
    } catch (scanError) {
      const message = scanError instanceof Error ? scanError.message : "QR inválido.";
      setError(message);
      scanned.current = false;
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={handleBarcode}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button title="Volver" onPress={() => router.back()} />
    </SafeAreaView>
  );
}
