import { router } from "expo-router";
import { Button, StyleSheet, Text, View } from "react-native";

export default function Subjects() {
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Subjects</Text>
      </View>

        <View style={styles.buttonArea}>
          <Button title="Cyber Security" onPress={() => router.push("/quiz")} />
          <Button title="Digital Forensics" onPress={() => router.push("/quiz")} />
          <Button title="Java Programming" onPress={() => router.push("/quiz")} />
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
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
    buttonArea: {
    width: "80%",
    gap: 12,
  },
});
