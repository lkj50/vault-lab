import { useRef, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { Button, Text, View, StyleSheet } from "react-native";
import { saveTotpMetadata, saveTotpSecret } from "@/auth/tokenStorage";
import { parseOtpauthUri } from "@/totp/otpauth";

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
      backgroundColor: "#0B0F1A",
    },
    camera: {
      width: "100%",
      flex: 1,
    },
    text: {
      color: "#E5E7EB",
      textAlign: "center",
    },
    error: {
      color: "#F87171",
      textAlign: "center",
    },
  });

  if (!permission) {
    return <View style={styles.container} />;
  }
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Se necesita permiso para usar la cámara.</Text>
        <Button title="Permitir cámara" onPress={() => void requestPermission()} />
        <Button title="Volver" onPress={() => router.back()} />
      </View>
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
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={handleBarcode}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Button title="Volver" onPress={() => router.back()} />
    </View>
  );
}
