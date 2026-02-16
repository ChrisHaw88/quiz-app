import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Button, ScrollView, StyleSheet, Text, View } from "react-native";

type MCQ = {
  question: string;
  answers: { A: string; B: string; C: string; D: string };
  correct: "A" | "B" | "C" | "D";
  supporting_quote?: string;
};

export default function Quiz() {
  const { subject, payload } = useLocalSearchParams<{ subject?: string; payload?: string }>();

  const questions = useMemo<MCQ[] | null>(() => {
    if (!payload) return null;
    try {
      return JSON.parse(payload) as MCQ[];
    } catch {
      return null;
    }
  }, [payload]);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  if (!questions || questions.length === 0) {
    return (
      //change this page to a scrollview so that all content is visible even on smaller screens
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
  };

  const handleAnswer = (selected: "A" | "B" | "C" | "D") => {
    if (isLocked || isFinished) return;

    setIsLocked(true);

    const correct = selected === q.correct;
    if (correct) {
      setScore((prev) => prev + 1);
      setFeedback("Correct!");
    } else {
      setFeedback(`Incorrect! Correct answer: ${q.correct}`);
    }
  };

  //added this to allow user to view the supporting quote for each question in an alert pulled from the PDF notes
  const showSource = () => {
    const quote = q.supporting_quote?.trim();
    if (!quote) {
      Alert.alert("No source available", "This question did not include a supporting quote.");
      return;
    }
    Alert.alert("Source from notes", quote);
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

      <View style={styles.buttonArea}>
        <Button title={`A) ${q.answers.A}`} onPress={() => handleAnswer("A")} disabled={isLocked} />
        <Button title={`B) ${q.answers.B}`} onPress={() => handleAnswer("B")} disabled={isLocked} />
        <Button title={`C) ${q.answers.C}`} onPress={() => handleAnswer("C")} disabled={isLocked} />
        <Button title={`D) ${q.answers.D}`} onPress={() => handleAnswer("D")} disabled={isLocked} />
      </View>

      {feedback && (
        <View style={styles.stepContainer}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      )}

      <View style={styles.buttonArea}>
        <Button title="Show Source" onPress={showSource} />
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
});
