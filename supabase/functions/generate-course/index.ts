import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an English learning course designer for Chinese professionals.
Design workplace English scenarios where the character speaks naturally in real work situations.
Return ONLY valid JSON array, no markdown, no explanation.`;

function buildPrompt(characterName: string, context: string, dayFrom: number, dayTo: number): string {
  const weekOf = (day: number) => Math.ceil(day / 7);
  return `Design days ${dayFrom}–${dayTo} of a 30-day workplace English course.

Character: ${characterName}
Background: ${context}

For each day create ONE scene with EXACTLY 5 sentences the character would naturally say at work.

Return a JSON array of ${dayTo - dayFrom + 1} objects:
[{
  "day": ${dayFrom},
  "week": ${weekOf(dayFrom)},
  "title": "Short scene title (4-6 words)",
  "situation": "One sentence describing the scene context",
  "duration_minutes": 5,
  "skill_tags": ["tag1", "tag2"],
  "sentences": [
    {
      "text": "Natural English sentence the character says",
      "translation": "自然的中文翻译",
      "order_index": 0,
      "phrase": {
        "english": "key phrase from sentence",
        "chinese": "短语的中文解释",
        "usage_tip": "Brief tip on when/how to use this phrase at work"
      }
    }
  ]
}]`;
}

async function callClaude(prompt: string, apiKey: string): Promise<unknown[]> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error [${response.status}]: ${err}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text ?? "[]";
  const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, character_name, context, user_id } = await req.json();

    if (!title || !character_name || !context || !user_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    // Use service role key to bypass RLS for insertions
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Generate days 1-15, then 16-30 in two Claude calls
    const [batch1, batch2] = await Promise.all([
      callClaude(buildPrompt(character_name, context, 1, 15), ANTHROPIC_API_KEY),
      callClaude(buildPrompt(character_name, context, 16, 30), ANTHROPIC_API_KEY),
    ]);
    const allDays = [...batch1, ...batch2] as Array<{
      day: number; week: number; title: string; situation: string;
      duration_minutes: number; skill_tags: string[];
      sentences: Array<{
        text: string; translation: string; order_index: number;
        phrase: { english: string; chinese: string; usage_tip: string };
      }>;
    }>;

    // 1. Insert course
    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .insert({ title, character_context: context, owner_id: user_id, is_system: false })
      .select("id")
      .single();
    if (courseErr) throw courseErr;
    const courseId = course.id;

    // 2. Insert scenes, sentences, phrases
    for (const dayData of allDays) {
      const { data: scene, error: sceneErr } = await supabase
        .from("scenes")
        .insert({
          course_id: courseId,
          week: dayData.week,
          day: dayData.day,
          title: dayData.title,
          situation: dayData.situation,
          duration_minutes: dayData.duration_minutes ?? 5,
          skill_tags: dayData.skill_tags ?? [],
        })
        .select("id")
        .single();
      if (sceneErr) throw sceneErr;

      for (const [idx, s] of (dayData.sentences ?? []).entries()) {
        const { data: sentence, error: sentErr } = await supabase
          .from("sentences")
          .insert({
            scene_id: scene.id,
            text: s.text,
            translation: s.translation,
            order_index: s.order_index ?? idx,
          })
          .select("id")
          .single();
        if (sentErr) throw sentErr;

        if (s.phrase) {
          await supabase.from("phrases").insert({
            sentence_id: sentence.id,
            english: s.phrase.english,
            chinese: s.phrase.chinese,
            usage_tip: s.phrase.usage_tip,
          });
        }
      }
    }

    return new Response(JSON.stringify({ course_id: courseId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-course error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
