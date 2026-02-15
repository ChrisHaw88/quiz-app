import { createClient } from "npm:@supabase/supabase-js@2";
import OpenAI from "npm:openai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MCQ = {
  question: string;
  answers: { A: string; B: string; C: string; D: string };
  correct: "A" | "B" | "C" | "D";
  supporting_quote: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") 
    return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "OPENAI_API_KEY missing in Supabase secrets" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const subject = typeof body?.subject === "string" && body.subject.trim() ? body.subject.trim() : "Lecture Notes";
    const bucket = typeof body?.bucket === "string" && body.bucket.trim() ? body.bucket.trim() : "lecture-notes";
    const path = typeof body?.path === "string" ? body.path : "";

    if (!path) {
      return new Response(JSON.stringify({ ok: false, error: "Missing PDF storage path" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    //server-side supabase client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    //create a short-lived signed URL for the PDF so OpenAI can fetch it
    const { data: signed, error: signedErr } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, 120); //2 minutes the URL wwill be valid for 

    if (signedErr || !signed?.signedUrl) {
      return new Response(JSON.stringify({ ok: false, error: signedErr?.message ?? "Signed URL failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = new OpenAI({ apiKey });

    const prompt = `
You are generating study questions ONLY from the provided lecture notes PDF.

Rules:
- Use ONLY information found in the PDF.
- Do NOT invent facts. If the PDF does not support the answer, do not create that question.
- For every question, include a short verbatim supporting_quote copied from the PDF that justifies the correct answer.

Generate exactly 5 multiple-choice questions (MCQs) for the subject: "${subject}".
Each must have:
- question (string)
- answers object with keys A, B, C, D (strings)
- correct is one of "A","B","C","D" changing for each question
- supporting_quote (string)
Return JSON only matching the required schema.
`.trim();

    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_file", file_url: signed.signedUrl },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "mcqs_from_pdf",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              subject: { type: "string" },
              questions: {
                type: "array",
                minItems: 5,
                maxItems: 5,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    question: { type: "string" },
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
                    supporting_quote: { type: "string" },
                  },
                  required: ["question", "answers", "correct", "supporting_quote"],
                },
              },
            },
            required: ["subject", "questions"],
          },
        },
      },
    });

    const parsed = JSON.parse(resp.output_text) as { subject: string; questions: MCQ[] };

    return new Response(JSON.stringify({ ok: true, subject: parsed.subject, questions: parsed.questions }), {
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
