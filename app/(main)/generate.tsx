import { Button, StyleSheet, View } from "react-native";

export default function Generate() {
  return (
    <View style={styles.container}>
      <View style={styles.buttonArea}>
        <Button title="Cyber Security" onPress={() => {/* Add functionality here */}} />
        <Button title="Digital Forensics" onPress={() => {/* Add functionality here */}} />
        <Button title="Java Programming" onPress={() => {/* Add functionality here */}} />
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
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  buttonArea: {
    width: "80%",
    gap: 12,
  },
});
