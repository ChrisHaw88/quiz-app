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
      return new Response(
        JSON.stringify({ ok: false, error: "OPENAI_API_KEY missing in Supabase secrets" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const subject = typeof body?.subject === "string" && body.subject.trim() ? body.subject.trim() : "Lecture Notes";
    const bucket = typeof body?.bucket === "string" && body.bucket.trim() ? body.bucket.trim() : "lecture-notes";
    //updated the below line to now accept multiple paths
    const paths = Array.isArray(body?.paths) ? body.paths.filter((p: unknown) => typeof p === "string" && p.trim()) : [];

    if (paths.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing PDF storage paths" }), {
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
        .createSignedUrl(p, 120); //2 minutes the URL wwill be valid for

      if (signedErr || !signed?.signedUrl) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: `Signed URL failed for ${p}: ${signedErr?.message ?? "Unknown error"}`,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      signedUrls.push(signed.signedUrl);
    }

    const client = new OpenAI({ apiKey });

    //updated the wording for multiple PDFs
    const prompt = `
You are generating study questions ONLY from the provided lecture notes PDFs.

Rules:
- Use ONLY information found in the PDFs.
- Do NOT invent facts.
- If the PDFs do not support the answer, do not create that question.
- For every question, include a short verbatim supporting_quote copied from the PDFs that justifies the correct answer.

Generate exactly 20 multiple-choice questions (MCQs) for the subject: "${subject}".
Each must have:
- question (string)
- answers object with keys A, B, C, D (strings)
- correct is one of "A","B","C","D" (varies per question)
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
            //change to attach ALL PDFs
            ...signedUrls.map((url) => ({ type: "input_file", file_url: url })),
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "mcqs_from_pdfs",
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

    return new Response(
      JSON.stringify({ ok: true, subject: parsed.subject, questions: parsed.questions }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
