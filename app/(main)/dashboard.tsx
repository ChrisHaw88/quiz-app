import { router } from "expo-router";
import { Button, StyleSheet, Text, View } from "react-native";

export default function Dashboard() {
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Dashboard</Text>
      </View>

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
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
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
