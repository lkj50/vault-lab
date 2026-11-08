import { useEffect } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAppSelector } from "@/store/hooks";

export default function VaultTab() {
  const router = useRouter();
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    if (!accessToken) router.replace("/");
  }, [accessToken, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Próximamente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0F1A",
  },
  text: {
    color: "#E5E7EB",
    fontSize: 18,
  },
});
