import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Button, StyleSheet, View } from "react-native";
import { supabase } from "../../lib/supabaseClient";

type LectureNoteRow = {
  storage_bucket: string | null;
  storage_path: string;
  original_filename: string | null;
  created_at: string;
};

export default function Subjects() {
  const [loading, setLoading] = useState(false);

  const generateFromStoredPDFs = async (subject: string) => {
    try {
      setLoading(true);

      //fetch all notes for subject, ordered by created_at desc
      const { data: notes, error: notesErr } = await supabase
        .from("lecture_notes")
        .select("storage_bucket, storage_path, original_filename, created_at")
        .eq("subject_name", subject)
        .order("created_at", { ascending: false });

      if (notesErr) {
        Alert.alert("Error", notesErr.message);
        return;
      }

      if (!notes || notes.length === 0) {
        Alert.alert("No PDFs found", `No saved lecture notes found for "${subject}". Upload notes first.`);
        return;
      }

      const typedNotes = notes as LectureNoteRow[];

      //keep track of seen filename/paths to stop duplicates 
      const seen = new Set<string>();
      const uniqueNotes = typedNotes.filter((n) => {
        const key =
          (n.original_filename && n.original_filename.trim().toLowerCase()) ||
          n.storage_path; //fallback if filename missing
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      //bucket should be the same for all notes 'lecture-notes'. limited to max 3 pdfs for token cost 
      const bucket = uniqueNotes[0]?.storage_bucket ?? "lecture-notes";

      const MAX_PDFS = 3;
      const limitedNotes = uniqueNotes.slice(0, MAX_PDFS);

      const pathsToUse = limitedNotes.map((n) => n.storage_path).filter(Boolean);

      if (pathsToUse.length === 0) {
        Alert.alert("No valid files", "Lecture notes rows exist but no storage paths were found.");
        return;
      }

      //generate questions by invoking edge function so we can generate questions from stored pdfs so  no new upload requiredd
      //passing buc ket and paths so ER grading still works
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: { subject, bucket, paths: pathsToUse },
      });

      if (error) {
        Alert.alert("Function invoke error", error.message);
        return;
      }

      if (!data?.ok) {
        Alert.alert("Function error", data?.error ?? "Unknown error");
        return;
      }

      //naviagte to quiz page with generated questions and bucket/paths for grading reference
      router.replace({
        pathname: "/(main)/quiz",
        params: {
          subject: data.subject,
          payload: JSON.stringify(data.questions),
          bucket,
          paths: JSON.stringify(pathsToUse),
        },
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>

      <View style={styles.buttonArea}>
        <Button title="Cyber Security" onPress={() => generateFromStoredPDFs("Cyber Security")} disabled={loading} />
        <Button title="Digital Forensics" onPress={() => generateFromStoredPDFs("Digital Forensics")} disabled={loading} />
        <Button title="Java Programming" onPress={() => generateFromStoredPDFs("Java Programming")} disabled={loading} />
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 12 }} />}
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
  buttonArea: {
    width: "80%",
    gap: 12,
  },
});