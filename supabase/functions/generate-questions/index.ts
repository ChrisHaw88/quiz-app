import OpenAI from "npm:openai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MCQ = {
  question: string;
  answers: { A: string; B: string; C: string; D: string };
  correct: "A" | "B" | "C" | "D";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "OPENAI_API_KEY missing in Supabase secrets" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const subject = typeof body?.subject === "string" && body.subject.trim() ? body.subject.trim() : "Cyber Security";

    const client = new OpenAI({ apiKey });

    const prompt = `
        Generate exactly 5 multiple-choice questions (MCQs) about "${subject}".
        Each question must have:
        - question (string)
        - answers object with keys A, B, C, D (strings)
        - correct is one of "A","B","C","D"
        Make the incorrect options plausible. Avoid trick questions.
        Return JSON only that matches the required schema.
`.trim();

    // Responses API + Structured Outputs (JSON Schema)
    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "mcq_payload",
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
                  },
                  required: ["question", "answers", "correct"],
                },
              },
            },
            required: ["subject", "questions"],
          },
        },
      },
    });

    const raw = resp.output_text;
    const parsed = JSON.parse(raw) as { subject: string; questions: MCQ[] };

    return new Response(
      JSON.stringify({ ok: true, subject: parsed.subject, questions: parsed.questions }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    // Return 200 so the app can display the error text easily
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
