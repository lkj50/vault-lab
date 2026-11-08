import { useEffect } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSelector } from "@/store/hooks";
import { theme } from "@/theme";

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
    <SafeAreaView style={styles.container}>
      <ActivityIndicator color={theme.accent} />
      <Text style={styles.text}>Procesando inicio de sesión…</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: theme.background,
  },
  text: {
    color: theme.text,
  },
});
