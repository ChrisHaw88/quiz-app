import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabaseClient";

function base64ToArrayBuffer(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export default function Upload() {
  const { subject } = useLocalSearchParams<{ subject?: string }>();

  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);

  const pickPdf = async () => {
    setUploadedPath(null);
    setNoteId(null);

    const picked = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (picked.canceled) return;

    const file = picked.assets[0];
    setFileName(file.name ?? "Unknown file");
    setFileSize(typeof file.size === "number" ? file.size : null);
    setFileUri(file.uri ?? null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadToSupabase = async () => {
    try {
      if (!subject) {
        Alert.alert("Missing subject", "Go back and pick a subject first.");
        return;
      }

      if (!fileUri) {
        Alert.alert("No PDF selected", "Please choose a PDF first.");
        return;
      }

      //get logged-in user id. this is neeed as lecture_notes in supabase links to auth.users
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        Alert.alert("Not signed in", "Please sign in before uploading.");
        return;
      }

      setUploading(true);

      //read file as base64
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: "base64",
      });

      //upload file to supabase storage
      const bucket = "lecture-notes";
      const safeName = (fileName ?? `notes-${Date.now()}.pdf`).replace(/\s+/g, "_");
      const path = `${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, base64ToArrayBuffer(base64), {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        Alert.alert("Storage upload failed", uploadError.message);
        return;
      }

      //insert row into lecture_notes table with user_id and storage path
      const { data: inserted, error: insertError } = await supabase
        .from("lecture_notes")
        .insert({
          user_id: userData.user.id,
          subject_name: subject,
          storage_bucket: bucket,
          storage_path: path,
          original_filename: fileName,
        })
        .select("id")
        .single();

      if (insertError) {
        Alert.alert("DB insert failed", insertError.message);
        return;
      }

      setUploadedPath(path);
      setNoteId(inserted?.id ?? null);

      //call edge function to generate MCQs from the uploaded PDF
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: { subject, bucket, path },
      });

      if (error) {
        Alert.alert("Function invoke error", error.message);
        return;
      }

      if (!data?.ok) {
        Alert.alert("Function error", data?.error ?? "Unknown error");
        return;
      }

      //route the generated questions to quiz page of the app
      router.replace({
        pathname: "/(main)/quiz",
        params: {
          subject: data.subject,
          payload: JSON.stringify(data.questions),
        },
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? String(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.stepContainer}>
        <Text style={styles.title}>Upload PDF</Text>
        <Text style={styles.subtitle}>{subject ?? "No subject selected"}</Text>
      </View>

      <View style={styles.buttonArea}>
        <Button title="Choose PDF" onPress={pickPdf} disabled={uploading} />
        <Button
          title="Upload & Generate Questions"
          onPress={uploadToSupabase}
          disabled={uploading || !fileUri || !subject}
        />
        {uploading && <ActivityIndicator style={{ marginTop: 10 }} />}
      </View>

      <View style={styles.stepContainer}>
        <Text style={styles.label}>Selected file:</Text>
        <Text style={styles.value}>{fileName ?? "None"}</Text>

        <Text style={styles.label}>Size:</Text>
        <Text style={styles.value}>
          {fileSize !== null ? formatBytes(fileSize) : "Unknown"}
        </Text>

        <Text style={styles.label}>Storage path:</Text>
        <Text style={styles.valueSmall}>{uploadedPath ?? "Not uploaded yet"}</Text>

        <Text style={styles.label}>Lecture note ID:</Text>
        <Text style={styles.valueSmall}>{noteId ?? "Not created yet"}</Text>
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
  stepContainer: {
    width: "100%",
    gap: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  buttonArea: {
    width: "80%",
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  value: {
    fontSize: 16,
    textAlign: "center",
  },
  valueSmall: {
    fontSize: 12,
    textAlign: "center",
  },
});
