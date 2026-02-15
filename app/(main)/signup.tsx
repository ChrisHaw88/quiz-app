import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Button, StyleSheet, TextInput, View } from "react-native";
import { supabase } from "../../lib/supabaseClient";

export default function SignUp() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function isValidPassword(password: string): boolean {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasMinLength = password.length >= 8;
    return hasUpperCase && hasNumber && hasMinLength;
  }

  //convert username to email format for Supabase auth
  const toEmail = (u: string) => `${u.trim().toLowerCase()}@example.com`;

  const onSignUp = async () => {
    if (!username.trim()) {
      Alert.alert("Missing username", "Please enter a username.");
      return;
    }

    //password validation
    if (!password) {
      Alert.alert("Missing password", "Please enter a password.");
      return;
    }
    //confirm password validation
    if (password !== confirmPassword) {
      Alert.alert("Passwords do not match", "Please make sure both passwords match.");
      return;
    }
    //strength and length of password validation
    if (!isValidPassword(password)) {
      Alert.alert(
        "Weak password",
        "Password must be at least 8 characters long and contain at least one uppercase letter and one number."
      );
      return;
    }

    //supabase auth requires email so convert the username to an email format
    const email = toEmail(username);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username.trim() },
      },
    });

    if (error) {
      Alert.alert("Sign up failed", error.message);
      return;
    }

    if (data.user) {
      const { error: profileErr } = await supabase.from("profiles").insert({
        id: data.user.id,
        username: username.trim(),
      });

      if (profileErr) {
        Alert.alert("Signed up, but profile save failed", profileErr.message);
      }
    }

    router.replace("/(main)/dashboard");
  };

  return (
    <View style={styles.container}>
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
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#808080"
          value={confirmPassword}
          secureTextEntry
          onChangeText={setConfirmPassword}
          autoCorrect={false}
        />
      </View>

      <View style={styles.buttonArea}>
        <Button title="Sign Up" onPress={onSignUp} />
        <Button title="Back to Sign In" onPress={() => router.back()} />
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
    padding: 20,
    gap: 20,
  },
  title: {
    fontSize: 26,
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
