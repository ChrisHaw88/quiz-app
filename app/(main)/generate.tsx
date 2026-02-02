import { router } from "expo-router";
import { Alert, Button, StyleSheet, View } from "react-native";
import { supabase } from "../../lib/supabaseClient";

export default function Generate() {
  const generateForSubject = async (subject: string) => {
    const { data, error } = await supabase.functions.invoke("generate-questions", {
      body: { subject },
    });

    if (error) {
      Alert.alert("Invoke error", error.message);
      return;
    }

    if (!data?.ok) {
      Alert.alert("Function error", data?.error ?? "Unknown error");
      return;
    }

    router.replace({
      pathname: "/quiz",
      params: {
        subject: data.subject,
        payload: JSON.stringify(data.questions),
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonArea}>
        <Button title="Cyber Security" onPress={() => generateForSubject("Cyber Security")} />
        <Button title="Digital Forensics" onPress={() => generateForSubject("Digital Forensics")} />
        <Button title="Java Programming" onPress={() => generateForSubject("Java Programming")} />
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
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  buttonArea: {
    width: "80%",
    gap: 12,
  },
});
