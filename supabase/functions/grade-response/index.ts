import { createClient } from "npm:@supabase/supabase-js@2";
import OpenAI from "npm:openai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

//grade-response edge function
//grade a student's free-text answer using ONLY the uploaded PDFs

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

    //expected payload from app:
    //{ bucket: "lecture-notes", paths: ["...pdf"], question: "...", student_answer: "...", mark_scheme: "..." }

    const bucket = typeof body?.bucket === "string" && body.bucket.trim() ? body.bucket.trim() : "lecture-notes";
    const paths = Array.isArray(body?.paths) ? body.paths.filter((p: unknown) => typeof p === "string" && p.trim()) : [];
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    const student_answer = typeof body?.student_answer === "string" ? body.student_answer.trim() : "";
    const mark_scheme = typeof body?.mark_scheme === "string" ? body.mark_scheme.trim() : "";

    //validate input
    if (paths.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "Missing PDF storage paths" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!question) {
      return new Response(JSON.stringify({ ok: false, error: "Missing question" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!student_answer) {
      return new Response(JSON.stringify({ ok: false, error: "Missing student_answer" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    //server-side Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    //create signed URLs for ALL PDFs
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

    //grading prompt
    const prompt = `
You are grading a student's extended-response answer using ONLY the provided lecture PDFs.

Rules:
- Use ONLY facts found in the PDFs. Do NOT invent facts.
- If the PDFs do not contain enough information to verify the answer, mark as incorrect.
- Be strict: mark correct only if the student's answer matches the lecture content.
- Return:
  - correct (boolean)
  - feedback (string): short explanation of why it is correct/incorrect
  - supporting_quote (string): a short verbatim quote from the PDFs that supports the correct answer

Question:
${question}

Mark scheme (guidance for what must be included in a correct answer):
${mark_scheme || "(none provided)"}

Student answer:
${student_answer}

Return JSON only matching the schema.
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
          name: "grade_result",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              correct: { type: "boolean" },
              feedback: { type: "string" },
              supporting_quote: { type: "string" },
            },
            required: ["correct", "feedback", "supporting_quote"],
          },
        },
      },
    });

    const parsed = JSON.parse(resp.output_text) as {
      correct: boolean;
      feedback: string;
      supporting_quote: string;
    };

    return new Response(JSON.stringify({ ok: true, ...parsed }), {
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
