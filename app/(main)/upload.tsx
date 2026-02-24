import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabaseClient";

type PickedPdf = {
  name: string;
  size: number | null;
  uri: string;
};

function base64ToArrayBuffer(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export default function Upload() {
  const { subject } = useLocalSearchParams<{ subject?: string }>();

  const [files, setFiles] = useState<PickedPdf[]>([]);
  const [uploading, setUploading] = useState(false);

  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [noteIds, setNoteIds] = useState<string[]>([]);

  const addPdf = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (picked.canceled) return;

    const f = picked.assets[0];
    if (!f?.uri) return;

    const next: PickedPdf = {
      name: f.name ?? `notes-${Date.now()}.pdf`,
      size: typeof f.size === "number" ? f.size : null,
      uri: f.uri,
    };

    //prevent duplicates by uri
    setFiles((prev) => (prev.some((x) => x.uri === next.uri) ? prev : [...prev, next]));
  };

  const clearAll = () => {
    setFiles([]);
    setUploadedPaths([]);
    setNoteIds([]);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const summary = useMemo(() => {
    if (files.length === 0) return "No PDFs selected";
    return `${files.length} PDF${files.length === 1 ? "" : "s"} selected`;
  }, [files.length]);

  const uploadAllAndGenerate = async () => {
    try {

      if (files.length === 0) {
        Alert.alert("No PDFs selected", "Please add at least one PDF.");
        return;
      }

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        Alert.alert("Not signed in", "Please sign in before uploading.");
        return;
      }

      setUploading(true);
      setUploadedPaths([]);
      setNoteIds([]);

      const bucket = "lecture-notes";
      const newPaths: string[] = [];
      const newNoteIds: string[] = [];

      //upload each PDF and insert to lecture_notes row inn supabase, collecting the storage paths and note ids 
      for (const file of files) {
        const safeName = file.name.replace(/\s+/g, "_");
        const path = `${Date.now()}-${Math.random().toString(16).slice(2)}-${safeName}`;

        const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: "base64" });

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, base64ToArrayBuffer(base64), {
            contentType: "application/pdf",
            upsert: false,
          });

        if (uploadError) {
          Alert.alert("Storage upload failed", `${file.name}: ${uploadError.message}`);
          return;
        }

        const { data: inserted, error: insertError } = await supabase
          .from("lecture_notes")
          .insert({
            user_id: userData.user.id,
            subject_name: subject,
            storage_bucket: bucket,
            storage_path: path,
            original_filename: file.name,
          })
          .select("id")
          .single();

        if (insertError) {
          Alert.alert("DB insert failed", `${file.name}: ${insertError.message}`);
          return;
        }

        newPaths.push(path);
        newNoteIds.push(inserted.id);
      }

      setUploadedPaths(newPaths);
      setNoteIds(newNoteIds);

      //call edge function with all pdf paths. the edge function has been updated to accept more than one path
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: { subject, bucket, paths: newPaths },
      });

      if (error) {
        Alert.alert("Function invoke error", error.message);
        return;
      }

      if (!data?.ok) {
        Alert.alert("Function error", data?.error ?? "Unknown error");
        return;
      }

      router.replace({
        pathname: "/(main)/quiz",
        params: {
          subject: data.subject,
          payload: JSON.stringify(data.questions),
          bucket,
          paths: JSON.stringify(newPaths), //pass the array of paths to the quiz page so it can request the supporting quotes as needed
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
        <Text style={styles.title}>Upload PDF Notes</Text>
        <Text style={styles.subtitle}>{subject ?? "No subject selected"}</Text>
        <Text style={styles.subtitle}>{summary}</Text>
      </View>

      <View style={styles.buttonArea}>
        <Button title="Add PDF" onPress={addPdf} disabled={uploading} />
        <Button title="Clear PDFs" onPress={clearAll} disabled={uploading || files.length === 0} />
        <Button
          title="Upload & Generate Questions"
          onPress={uploadAllAndGenerate}
          disabled={uploading || files.length === 0 || !subject}
        />
        {uploading && <ActivityIndicator style={{ marginTop: 10 }} />}
      </View>

      <View style={styles.stepContainer}>
        {files.map((f, idx) => (
          <Text key={f.uri} style={styles.valueSmall}>
            {idx + 1}. {f.name} {f.size != null ? `(${formatBytes(f.size)})` : ""}
          </Text>
        ))}
      </View>

      <View style={styles.stepContainer}>
        {uploadedPaths.length > 0 && (
          <>
            <Text style={styles.label}>Uploaded paths:</Text>
            {uploadedPaths.map((p) => (
              <Text key={p} style={styles.valueSmall}>
                {p}
              </Text>
            ))}
          </>
        )}

        {noteIds.length > 0 && (
          <>
            <Text style={styles.label}>Lecture note IDs:</Text>
            {noteIds.map((id) => (
              <Text key={id} style={styles.valueSmall}>
                {id}
              </Text>
            ))}
          </>
        )}
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
  valueSmall: {
    fontSize: 12,
    textAlign: "center",
  },
});
