import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "../lib/supabaseClient";

export default function Index() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const toEmail = (u: string) => `${u.trim().toLowerCase()}@example.com`;

  const onSignIn = async () => {
    const user = username.trim();
    if (!user) {
      Alert.alert("Missing username", "Please enter a username.");
      return;
    }
    if (!password) {
      Alert.alert("Missing password", "Please enter a password.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: toEmail(user),
      password,
    });

    if (error) {
      Alert.alert("Sign in failed", error.message);
      return;
    }

    router.replace("/(main)/dashboard");
  };

  return (
    <View style={styles.container}>

      <View style={styles.titleArea}>
        <Text style={styles.title}>AI-Based Quiz App</Text>
      </View>
      <View style={styles.inputArea}>
        
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#808080"
          value={username}
          autoCapitalize="none"
          onChangeText={setUsername}
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#808080"
          value={password}
          secureTextEntry
          onChangeText={setPassword}
          autoCorrect={false}
        />
      </View>

      <View style={styles.buttonArea}>
        <Button title="Sign In" onPress={onSignIn} />
        <Button title="Sign Up" onPress={() => router.push("/(main)/signup")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 20,
  },
  titleArea: {
    width: "100%",
  },
  title: {
    fontSize: 26,
    color: "#470fed",
    fontWeight: "bold",
    textAlign: "center",
  },
  inputArea: {
    width: "80%",
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  buttonArea: {
    width: "80%",
    gap: 12,
  },
});
