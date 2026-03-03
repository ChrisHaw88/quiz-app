import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabaseClient";

type StatRow = {
  subject_name: string;
  high_score: number;
  longest_streak: number;
  updated_at: string;
};

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string>("User");
  const [stats, setStats] = useState<StatRow[]>([]);

  const sorted = useMemo(() => {
    return [...stats].sort((a, b) => a.subject_name.localeCompare(b.subject_name));
  }, [stats]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user) {
          setLoading(false);
          return;
        }

        const userId = userData.user.id;

        //username from profiles (fallback to email)
        const { data: profileRow, error: profileErr } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", userId)
          .maybeSingle();

        if (profileErr) {
          setUsername(userData.user.email ?? "User");
        } else {
          setUsername(profileRow?.username ?? userData.user.email ?? "User");
        }

        //stats
        const { data: rows, error: statsErr } = await supabase
          .from("user_stats")
          .select("subject_name, high_score, longest_streak, updated_at")
          .eq("user_id", userId);

        if (statsErr) {
          Alert.alert("Error", statsErr.message);
          setStats([]);
          setLoading(false);
          return;
        }

        setStats(rows ?? []);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      {/*username taken from when named used at sign up is centered at top */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{username}</Text>
      </View>

      {/*stats list */}
      <View style={styles.listArea}>
        {sorted.length === 0 ? (
          <Text style={styles.emptyText}>No progress saved yet. Complete a quiz to see stats here.</Text>
        ) : (
          sorted.map((s) => (
            <View key={s.subject_name} style={styles.card}>
              <Text style={styles.subjectTitle}>{s.subject_name}:</Text>
              <Text style={styles.statText}>  High score: {s.high_score}</Text>
              <Text style={styles.statText}>  Longest streak: {s.longest_streak}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flexGrow: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    padding: 20,
    gap: 20,
  },
  titleContainer: {
    width: "100%",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    color: "#470fed",
    fontWeight: "bold",
    textAlign: "center",
  },
  listArea: {
    width: "100%",
    gap: 12,
  },
  card: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  subjectTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  statText: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
});