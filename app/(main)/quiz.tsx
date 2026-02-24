import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Button, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "../../lib/supabaseClient";


type MCQ = {
  type: "mcq";
  question: string;
  answers: { A: string; B: string; C: string; D: string };
  correct: "A" | "B" | "C" | "D";
  supporting_quote: string;
};
//added type ERQ support mixed question types
type ERQ = {
  type: "er";
  question: string;
  mark_scheme: string;
  supporting_quote: string;
};

type QuizQuestion = MCQ | ERQ;

export default function Quiz() {
  //read bucket + paths (needed for grading ER answers)
  const { subject, payload, bucket, paths } = useLocalSearchParams<{
    subject?: string;
    payload?: string;
    bucket?: string;
    paths?: string; // JSON string: paths of the uploaded PDFs 
  }>();

  const questions = useMemo<QuizQuestion[] | null>(() => {
    if (!payload) return null;
    try {
      return JSON.parse(payload) as QuizQuestion[];
    } catch {
      return null;
    }
  }, [payload]);

  const pdfPaths = useMemo<string[]>(() => {
    if (!paths) return [];
    try {
      const parsed = JSON.parse(paths);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [paths]);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  //added for ER answer state
  const [erAnswer, setErAnswer] = useState("");
  const [grading, setGrading] = useState(false);

  if (!questions || questions.length === 0) {
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.container}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{subject ?? "Quiz"}</Text>
        </View>
        <View style={styles.stepContainer}>
          <Text>No questions received.</Text>
        </View>
      </ScrollView>
    );
  }

  const total = questions.length;
  const q = questions[index];

  const finishQuiz = () => {
    setIsFinished(true);
    setIsLocked(true);
    setFeedback(null);
  };

  const goNext = () => {
    if (index >= total - 1) {
      finishQuiz();
      return;
    }
    setIndex((prev) => prev + 1);
    setFeedback(null);
    setIsLocked(false);

    //reset ER state for next question
    setErAnswer("");
  };

  //updated MCQ handler only runs for MCQ type
  const handleMCQAnswer = (selected: "A" | "B" | "C" | "D") => {
    if (isLocked || isFinished) return;
    if (q.type !== "mcq") return;

    setIsLocked(true);

    const correct = selected === q.correct;
    if (correct) {
      setScore((prev) => prev + 1);
      setFeedback("Correct!");
    } else {
      setFeedback(`Incorrect! Correct answer: ${q.correct}`);
    }
  };

  //updated, now show source works for both types
  const showSource = () => {
    const quote =
      q.type === "mcq"
        ? q.supporting_quote?.trim()
        : q.supporting_quote?.trim();

    if (!quote) {
      Alert.alert("No source available", "This question did not include a supporting quote.");
      return;
    }
    Alert.alert("Source from notes", quote);
  };

  //submit ER answer and call grade-response edge function
  const submitExtendedResponse = async () => {
    if (isLocked || isFinished) return;
    if (q.type !== "er") return;

    if (!erAnswer.trim()) {
      Alert.alert("Missing answer", "Please type an answer before submitting.");
      return;
    }

    if (!bucket || pdfPaths.length === 0) {
      Alert.alert(
        "Missing PDF reference",
        "Bucket/paths were not provided. Please ensure upload passes bucket and paths to the quiz page."
      );
      return;
    }

    setGrading(true);

    const { data, error } = await supabase.functions.invoke("grade-response", {
      body: {
        bucket,
        paths: pdfPaths,
        question: q.question,
        student_answer: erAnswer,
        mark_scheme: q.mark_scheme,
      },
    });

    setGrading(false);

    if (error) {
      Alert.alert("Grading error", error.message);
      return;
    }

    if (!data?.ok) {
      Alert.alert("Grading failed", data?.error ?? "Unknown error");
      return;
    }

    //this lock the question after grading
    setIsLocked(true);

    if (data.correct) {
      setScore((prev) => prev + 1);
      Alert.alert("Correct", `${data.feedback}\n\nSource:\n${data.supporting_quote}`);
      setFeedback("Correct!");
    } else {
      Alert.alert("Incorrect", `${data.feedback}\n\nSource:\n${data.supporting_quote}`);
      setFeedback("Incorrect!");
    }
  };

  if (isFinished) {
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.container}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{subject ?? "Quiz"}</Text>
        </View>

        <View style={styles.stepContainer}>
          <Text style={styles.finalTitle}>Final Score</Text>
          <Text style={styles.finalScore}>
            {score} / {total}
          </Text>
        </View>

        <View style={styles.buttonArea}>
          <Button title="Done" onPress={() => router.replace("/(main)/dashboard")} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{subject ?? "Quiz"}</Text>
      </View>

      <View style={styles.stepContainer}>
        <Text style={styles.progressText}>
          Question {index + 1} of {total} • Score {score}/{total}
        </Text>
      </View>

      <View style={styles.stepContainer}>
        <Text style={styles.questionText}>
          {index + 1}. {q.question}
        </Text>
      </View>

      {/*updated MCQ uer interface only for mcq */}
      {q.type === "mcq" && (
        <View style={styles.buttonArea}>
          <Button title={`A) ${q.answers.A}`} onPress={() => handleMCQAnswer("A")} disabled={isLocked} />
          <Button title={`B) ${q.answers.B}`} onPress={() => handleMCQAnswer("B")} disabled={isLocked} />
          <Button title={`C) ${q.answers.C}`} onPress={() => handleMCQAnswer("C")} disabled={isLocked} />
          <Button title={`D) ${q.answers.D}`} onPress={() => handleMCQAnswer("D")} disabled={isLocked} />
        </View>
      )}

      {/*added extended response user interface */}
      {q.type === "er" && (
        <View style={styles.erArea}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your answer here..."
            placeholderTextColor="#808080"
            value={erAnswer}
            onChangeText={setErAnswer}
            editable={!isLocked}
            multiline
          />

          {grading && <ActivityIndicator />}

          <View style={styles.buttonArea}>
            <Button title="Submit Answer" onPress={submitExtendedResponse} disabled={isLocked || grading} />
          </View>
        </View>
      )}

      {feedback && (
        <View style={styles.stepContainer}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      )}

      <View style={styles.buttonArea}>
        {/*added diasabled to the show source button as user could see answer before answering the question */}
        <Button title="Show Source" onPress={showSource} disabled={!isLocked}/>
        <Button title={index >= total - 1 ? "Finish Quiz" : "Next Question"} onPress={goNext} />
      </View>
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
    alignItems: "center",
    padding: 20,
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
    width: "100%",
  },
  progressText: {
    fontSize: 14,
    textAlign: "center",
  },
  questionText: {
    fontSize: 18,
    textAlign: "center",
  },
  feedbackText: {
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
  finalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  finalScore: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
  },
  buttonArea: {
    width: "80%",
    gap: 12,
  },
  erArea: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  textInput: {
    width: "80%",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: "top",
  },
});
