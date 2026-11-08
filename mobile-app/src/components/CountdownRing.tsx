import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { theme } from "@/theme";

interface CountdownRingProps {
  secondsLeft: number;
  progress: number;
}

export function CountdownRing({ secondsLeft, progress }: CountdownRingProps) {
  const size = 120;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const strokeColor = secondsLeft <= 5 ? theme.dangerStrong : theme.accent;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle cx={60} cy={60} r={radius} stroke={theme.borderStrong} strokeWidth={8} fill="none" />
        <Circle
          cx={60}
          cy={60}
          r={radius}
          stroke={strokeColor}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 60 60)"
        />
      </Svg>
      <Text style={[styles.seconds, secondsLeft <= 5 && styles.danger]}>
        {secondsLeft}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  seconds: {
    position: "absolute",
    color: theme.text,
    fontSize: 28,
    fontWeight: "700",
  },
  danger: {
    color: theme.dangerStrong,
  },
});
