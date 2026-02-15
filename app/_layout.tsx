import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="index" options={{ title: "Sign In" }} />
      <Stack.Screen name="(main)/dashboard" options={{ title: "Dashboard" }} />
      <Stack.Screen name="(main)/subjects" options={{ title: "Subjects" }} />
      <Stack.Screen name="(main)/generate" options={{ title: "Generate Questions" }} />
      <Stack.Screen name="(main)/profile" options={{ title: "Profile" }} />
      <Stack.Screen name="(main)/quiz" options={{ title: "Quiz" }} />
      <Stack.Screen name="(main)/upload" options={{ title: "Upload PDF" }} />
      <Stack.Screen name="(main)/signup" options={{ title: "Sign Up" }} />
    </Stack>
  );
}
