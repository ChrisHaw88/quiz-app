import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Button, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabaseClient";

type LectureNoteRow = {
  storage_bucket: string | null;
  storage_path: string;
  original_filename: string | null;
  created_at: string;
};

const subjects = [
"Accounting",
"Aeronautics",
"Agroecology",
"Agricultural Engineering",
"Agronomy",
"Anatomy",
"Anthropology",
"Archaeology",
"Architecture",
"Art History",
"Artificial Intelligence",
"Astrobiology",
"Astrophysics",
"Astronomy",
"Aviation Management",
"Biology",
"Biomedical Engineering",
"Biotechnology",
"Botany",
"Business Studies",
"Chemistry",
"Civil Engineering",
"Clinical Medicine",
"Cloud Computing",
"Cognitive Science",
"Communication Studies",
"Computer Networks",
"Creative Writing",
"Crop Science",
"Criminology",
"Cyber Law",
"Cyber Security",
"Data Science",
"Databases",
"Design & Illustration",
"Digital Forensics",
"Digital Marketing",
"Earth Science",
"Economics",
"Education Studies",
"English Literature",
"Entrepreneurship",
"Environmental Engineering",
"Environmental Science",
"Epidemiology",
"Ethics",
"Film Studies",
"Finance",
"Food Science",
"Forestry",
"Game Development",
"Geography",
"Geology",
"Graphic Design",
"Health Informatics",
"History",
"Horticulture",
"Human-Computer Interaction",
"Hydrology",
"International Relations",
"Java Programming",
"Journalism",
"Law",
"Linguistics",
"Machine Learning",
"Marine Biology",
"Marketing",
"Mathematics",
"Meteorology",
"Mobile App Development",
"Music Theory",
"Neuroscience",
"Nursing",
"Oceanography",
"Operating Systems",
"Paleontology",
"Pharmacology",
"Philosophy",
"Physics",
"Planetary Science",
"Political Science",
"Psychology",
"Public Health",
"Remote Sensing",
"Renewable Energy",
"Robotics",
"Rural Development",
"Social Work",
"Soil Science",
"Sociology",
"Software Engineering",
"Space Engineering",
"Space Policy",
"Sports Science",
"Statistics",
"Supply Chain Management",
"Theatre & Performing Arts",
"Theology",
"Web Development",
"Zoology"
];

export default function Subjects() {
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("");

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
          n.storage_path; // fallback if filename missing
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

      //generate questions by invoking edge function so we can generate questions from stored pdfs so no new upload required
      //passing bucket and paths so ER grading still works
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

      //navigate to quiz page with generated questions and bucket/paths for grading reference
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

  const onGenerate = () => {
    if (!selectedSubject) {
      Alert.alert("No subject selected", "Please select a subject first.");
      return;
    }

    generateFromStoredPDFs(selectedSubject);
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={styles.stepContainer}>
        <Text style={styles.title}>Select a subject</Text>
        <Text style={styles.subtitle}>Generate questions from previously uploaded notes</Text>
      </View>

      <View style={styles.radioList}>
        {subjects.map((subject: string) => {
          const selected = selectedSubject === subject;

          return (
            <Pressable
              key={subject}
              style={styles.radioRow}
              onPress={() => setSelectedSubject(subject)}
            >
              <View style={styles.radioOuter}>
                {selected ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={styles.radioLabel}>{subject}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.buttonArea}>
        <Button
          title="Generate Questions"
          onPress={onGenerate}
          disabled={loading || !selectedSubject}
        />
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 12 }} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 20,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
  },
  radioList: {
    gap: 14,
    width: "100%",
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#000",
  },
  radioLabel: {
    fontSize: 16,
    flexShrink: 1,
  },
  buttonArea: {
    width: "100%",
    marginTop: 10,
  },
});