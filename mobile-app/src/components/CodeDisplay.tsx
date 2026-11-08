import { StyleSheet, Text } from "react-native";

export function CodeDisplay({ code }: { code: string }) {
  const formatted = code.length === 6
    ? `${code.slice(0, 3)} ${code.slice(3)}`
    : code;

  return <Text style={styles.code}>{formatted}</Text>;
}

const styles = StyleSheet.create({
  code: {
    color: "#E5E7EB",
    fontFamily: "Menlo",
    fontSize: 42,
    letterSpacing: 2,
  },
});
