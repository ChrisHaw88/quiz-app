import { createClient } from "npm:@supabase/supabase-js@2";
import OpenAI from "npm:openai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MCQ = {
  type: "mcq";
  question: string;
  answers: { A: string; B: string; C: string; D: string };
  correct: "A" | "B" | "C" | "D";
  supporting_quote: string;
};
//added ERQ type for extended response questions in the app
type ERQ = {
  type: "er";
  question: string;
  mark_scheme: string;
  supporting_quote: string;
};

type QuizQuestion = MCQ | ERQ;

//created new "superset" type used for JSON Schema
type SupersetQuestion = {
  type: "mcq" | "er";
  question: string;
  supporting_quote: string;

  //updated these are no longer optional in the schema output
  //(OpenAI Structured Outputs requires required[] to include every key in properties)
  answers: { A: string; B: string; C: string; D: string };
  correct: "A" | "B" | "C" | "D";
  mark_scheme: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "OPENAI_API_KEY missing in Supabase secrets" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const subject =
      typeof body?.subject === "string" && body.subject.trim() ? body.subject.trim() : "Lecture Notes";
    const bucket =
      typeof body?.bucket === "string" && body.bucket.trim() ? body.bucket.trim() : "lecture-notes";

    const paths = Array.isArray(body?.paths)
      ? body.paths.filter((p: unknown) => typeof p === "string" && p.trim())
      : [];

    if (paths.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Missing PDF storage paths" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    //server-side supabase client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    //create a short-lived signed URL for the PDF so OpenAI can fetch it
    //updated for signed URLs for ALL PDFs
    const signedUrls: string[] = [];

    for (const p of paths) {
      const { data: signed, error: signedErr } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(p, 120);

      if (signedErr || !signed?.signedUrl) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: `Signed URL failed for ${p}: ${signedErr?.message ?? "Unknown error"}`,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      signedUrls.push(signed.signedUrl);
    }

    const client = new OpenAI({ apiKey });

    //updated the wording for multiple PDFs
    //updated again: prompt now requests a mixed set of question types
    const prompt = `
You are generating study questions ONLY from the provided lecture notes PDFs.

Rules:
- Use ONLY information found in the PDFs.
- Do NOT invent facts.
- If the PDFs do not support the answer, do not create that question.
- For every question, include a short verbatim supporting_quote copied from the PDFs that justifies the correct answer.

Generate exactly 20 questions in total, with a mix:
- 14 multiple-choice questions (type = "mcq")
- 6 extended response questions (type = "er")

IMPORTANT OUTPUT RULE (must follow exactly):
Because the output must match a strict JSON schema, EVERY question must include ALL fields:
- type, question, supporting_quote, answers, correct, mark_scheme

For MCQ questions (type="mcq"):
- answers must be real options A-D
- correct must be the correct option letter
- mark_scheme must be an empty string ""

For ER questions (type="er"):
- mark_scheme must describe what a correct answer must include
- answers must be present but set to empty strings:
  { "A": "", "B": "", "C": "", "D": "" }
- correct must still be present (use "A" as a placeholder)

Return JSON only matching the required schema.
Subject: "${subject}"
`.trim();

    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            ...signedUrls.map((url) => ({ type: "input_file", file_url: url })),
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "mixed_quiz_questions",
          //update to use a single superset schema that allows for both question types
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              subject: { type: "string" },
              questions: {
                type: "array",
                minItems: 20,
                maxItems: 20,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    type: { type: "string", enum: ["mcq", "er"] },
                    question: { type: "string" },
                    supporting_quote: { type: "string" },

                    //updated coz now required by schema rule
                    answers: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        A: { type: "string" },
                        B: { type: "string" },
                        C: { type: "string" },
                        D: { type: "string" },
                      },
                      required: ["A", "B", "C", "D"],
                    },
                    correct: { type: "string", enum: ["A", "B", "C", "D"] },
                    mark_scheme: { type: "string" },
                  },

                  //updated coz required must include EVERY key in properties
                  required: ["type", "question", "supporting_quote", "answers", "correct", "mark_scheme"],
                },
              },
            },
            required: ["subject", "questions"],
          },
        },
      },
    });

    const parsed = JSON.parse(resp.output_text) as { subject: string; questions: SupersetQuestion[] };

    //cretaed server-side validation to enforce the right fields per question type
    const cleaned: QuizQuestion[] = [];

    for (const item of parsed.questions) {
      if (item.type === "mcq") {
        //updated as answers/correct are always present now, so validate they are meaningful for MCQ
        const hasRealAnswers =
          item.answers.A.trim() || item.answers.B.trim() || item.answers.C.trim() || item.answers.D.trim();

        if (!hasRealAnswers || !item.correct) {
          return new Response(
            JSON.stringify({ ok: false, error: "Invalid MCQ returned: missing answers or correct" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        cleaned.push({
          type: "mcq",
          question: item.question,
          answers: item.answers,
          correct: item.correct,
          supporting_quote: item.supporting_quote,
        });
      } else {
        //updated so mark_scheme is always present now, enforce it is non-empty for ER
        if (!item.mark_scheme || !item.mark_scheme.trim()) {
          return new Response(
            JSON.stringify({ ok: false, error: "Invalid ER question returned: missing mark_scheme" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        cleaned.push({
          type: "er",
          question: item.question,
          mark_scheme: item.mark_scheme,
          supporting_quote: item.supporting_quote,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, subject: parsed.subject, questions: cleaned }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
