import { router } from "expo-router";
import { Button, StyleSheet, View } from "react-native";

export default function Generate() {
  const goToUpload = (subject: string) => {
    router.push({
      pathname: "/upload",
      params: { subject },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonArea}>
        <Button title="Cyber Security" onPress={() => goToUpload("Cyber Security")} />
        <Button title="Digital Forensics" onPress={() => goToUpload("Digital Forensics")} />
        <Button title="Java Programming" onPress={() => goToUpload("Java Programming")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  buttonArea: {
    width: "80%",
    gap: 12,
  },
});
