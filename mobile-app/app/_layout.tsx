import { Stack } from "expo-router";
import { Provider } from "react-redux";

import { store } from "@/store";
import { theme } from "@/theme";

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
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen name="oauth/callback" />
      </Stack>
    </Provider>
  );
}
