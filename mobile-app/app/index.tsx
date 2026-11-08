import { useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const [result, setResult] = useState("");

  async function testConnection() {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/health`);
      const body: unknown = await response.json();

      if (!response.ok) {
        throw new Error(`El servidor respondió con ${response.status}`);
      }

      setResult(JSON.stringify(body));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      setResult(`Error: ${message}`);
    }
  }

  return (
    <View style={styles.container}>
      <Button title="Probar conexión" onPress={testConnection} />
      <Text selectable style={styles.result}>
        {result}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  result: {
    textAlign: "center",
  },
});
