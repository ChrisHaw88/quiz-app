import { router } from "expo-router";
import { Button, StyleSheet, View } from "react-native";

export default function Dashboard() {
  return (
    <View style={styles.container}>
      <View style={styles.buttonArea}>
        <Button title="Subjects" onPress={() => router.push("/subjects")} />
        <Button title="Generate Questions" onPress={() => router.push("/generate")} />
        <Button title="Profile" onPress={() => router.push("/profile")} />
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
});
