import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#0B0F1A" },
        headerTintColor: "#E5E7EB",
        tabBarStyle: { backgroundColor: "#111827" },
        tabBarActiveTintColor: "#22D3EE",
        tabBarInactiveTintColor: "#9CA3AF",
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
              color={typeof color === "string" ? color : "#22D3EE"}
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
              color={typeof color === "string" ? color : "#22D3EE"}
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
              color={typeof color === "string" ? color : "#22D3EE"}
            />
          ),
        }}
      />
    </Tabs>
  );
}
