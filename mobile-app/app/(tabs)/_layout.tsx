import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        tabBarStyle: { backgroundColor: theme.surface },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="home-outline"
              size={typeof size === "number" ? size : 24}
              color={typeof color === "string" ? color : theme.accent}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="authenticator"
        options={{
          title: "Authenticator",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="key-outline"
              size={typeof size === "number" ? size : 24}
              color={typeof color === "string" ? color : theme.accent}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="boveda"
        options={{
          title: "Bóveda",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="shield-checkmark-outline"
              size={typeof size === "number" ? size : 24}
              color={typeof color === "string" ? color : theme.accent}
            />
          ),
        }}
      />
    </Tabs>
  );
}
