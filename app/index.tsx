import { router } from "expo-router";
import { Button, StyleSheet, View } from "react-native";

export default function Index() {
  return (
    <View style={styles.container}>
      <View style={styles.buttonArea}>
        <Button title="Sign In" onPress={() => router.push("/dashboard")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 20,
  },
  buttonArea: {
    width: "80%",
    gap: 12,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
});
