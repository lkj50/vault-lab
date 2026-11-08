import { useEffect } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAppSelector } from "@/store/hooks";

export default function OAuthCallbackScreen() {
  const router = useRouter();
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace(accessToken ? "/(tabs)/home" : "/");
    }, 100);
    return () => clearTimeout(timer);
  }, [accessToken, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#22D3EE" />
      <Text style={styles.text}>Procesando inicio de sesión…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#0B0F1A",
  },
  text: {
    color: "#E5E7EB",
  },
});
