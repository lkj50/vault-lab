import { Stack } from "expo-router";
import { Provider } from "react-redux";

import { store } from "@/store";

export default function RootLayout() {
  return (
    <Provider store={store}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="scan"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Escanear QR",
            headerStyle: { backgroundColor: "#0B0F1A" },
            headerTintColor: "#E5E7EB",
          }}
        />
        <Stack.Screen name="oauth/callback" />
      </Stack>
    </Provider>
  );
}
