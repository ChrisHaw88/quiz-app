import { router } from "expo-router";
import React from "react";
import { Button, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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
]

export default function Generate() {
  const [selectedSubject, setSelectedSubject] = React.useState<string>("");

  const goToUpload = () =>{
    if(!selectedSubject) return;

    router.push({
      pathname: "/(main)/upload",
      params: { subject: selectedSubject },
    });
  };
  
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={styles.stepContainer}>
        <Text style={styles.title}>Select a subject</Text>
      </View>

      <View style={styles.radioList}>
        {subjects.map((subject) => {
          const selected = selectedSubject === subject;

          return (
            <Pressable
              key={subject}
              style={styles.radioRow}
              onPress={() => setSelectedSubject(subject)}
            >
              <View style={styles.radioOuter}>
                {selected && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>{subject}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.buttonArea}>
        <Button
          title="Continue"
          onPress={goToUpload}
          disabled={!selectedSubject}
        />
      </View>
    </ScrollView>
  );
}
  

// export default function Generate() {
//   const goToUpload = (subject: string) => {
//     router.push({
//       pathname: "/upload",
//       params: { subject },
//     });
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.buttonArea}>
//         <Button title="Cyber Security" onPress={() => goToUpload("Cyber Security")} />
//         <Button title="Digital Forensics" onPress={() => goToUpload("Digital Forensics")} />
//         <Button title="Java Programming" onPress={() => goToUpload("Java Programming")} />
//       </View>
//     </View>
//   );
// }

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
