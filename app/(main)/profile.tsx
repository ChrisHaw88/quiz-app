import { StyleSheet, View } from "react-native";

export default function Profile() {
  return (
    <View style={styles.container}>

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
});
