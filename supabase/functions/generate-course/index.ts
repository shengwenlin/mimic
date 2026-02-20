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

async function callLLM(prompt: string, apiKey: string): Promise<unknown[]> {
  const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "qwen-turbo",
      max_tokens: 8000,
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Qwen API error [${response.status}]: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "[]";
  const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

function extractCharacterName(context: string): string {
  const match = context.match(/^([A-Za-z\u4e00-\u9fff]{1,10})(?:\s*是|\s+is\b)/);
  if (match) return match[1];
  const first = context.trim().split(/[\s，,]/)[0];
  return first.slice(0, 10) || "Alex";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { context, user_id } = body;
    const character_name: string = body.character_name || extractCharacterName(context);
    const title: string = body.course_name || body.title || `${character_name}'s Workplace English`;

    if (!context || !user_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LLM_API_KEY = Deno.env.get("QWEN_API_KEY") ?? Deno.env.get("SILICONFLOW_API_KEY") ?? Deno.env.get("LLM_API_KEY");
    if (!LLM_API_KEY) throw new Error("QWEN_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Stream SSE progress events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // Phase 1: Generate content (5 parallel batches, each ~16% of total)
          send({ progress: 5, step: "Generating course content..." });

          let completed = 0;
          const batchResults: unknown[][] = [];
          const batches = [
            { from: 1, to: 6 },
            { from: 7, to: 12 },
            { from: 13, to: 18 },
            { from: 19, to: 24 },
            { from: 25, to: 30 },
          ];

          await Promise.all(
            batches.map((b, i) =>
              callLLM(buildPrompt(character_name, context, b.from, b.to), LLM_API_KEY).then((result) => {
                batchResults[i] = result;
                completed++;
                const pct = 5 + Math.round((completed / 5) * 75);
                send({ progress: pct, step: `Generated ${completed * 6}/30 days of content` });
              })
            )
          );

          const allDays = batchResults.flat() as Array<{
            day: number; week: number; title: string; situation: string;
            duration_minutes: number; skill_tags: string[];
            sentences: Array<{
              text: string; translation: string; order_index: number;
              phrase: { english: string; chinese: string; usage_tip: string };
            }>;
          }>;

          // Phase 2: Save to database
          send({ progress: 85, step: "Saving course data..." });

          const { data: course, error: courseErr } = await supabase
            .from("courses")
            .insert({ title, character_context: context, owner_id: user_id, is_system: false })
            .select("id")
            .single();
          if (courseErr) throw courseErr;
          const courseId = course.id;

          const sceneRows = allDays.map((d) => ({
            course_id: courseId,
            week: d.week,
            day: d.day,
            title: d.title,
            situation: d.situation,
            duration_minutes: d.duration_minutes ?? 5,
            skill_tags: d.skill_tags ?? [],
          }));
          const { data: scenes, error: sceneErr } = await supabase
            .from("scenes")
            .insert(sceneRows)
            .select("id, day");
          if (sceneErr) throw sceneErr;

          send({ progress: 90, step: "Saving practice sentences..." });

          const dayToSceneId = new Map((scenes ?? []).map((s: { id: string; day: number }) => [s.day, s.id]));

          const sentenceRows: Array<{ scene_id: string; text: string; translation: string; order_index: number }> = [];
          const sentenceMeta: Array<{ day: number; idx: number }> = [];
          for (const dayData of allDays) {
            const sceneId = dayToSceneId.get(dayData.day);
            if (!sceneId) continue;
            for (const [idx, s] of (dayData.sentences ?? []).entries()) {
              sentenceRows.push({
                scene_id: sceneId,
                text: s.text,
                translation: s.translation,
                order_index: s.order_index ?? idx,
              });
              sentenceMeta.push({ day: dayData.day, idx });
            }
          }
          const { data: sentences, error: sentErr } = await supabase
            .from("sentences")
            .insert(sentenceRows)
            .select("id");
          if (sentErr) throw sentErr;

          send({ progress: 95, step: "Saving phrase data..." });

          const phraseRows: Array<{ sentence_id: string; english: string; chinese: string; usage_tip: string }> = [];
          (sentences ?? []).forEach((sent: { id: string }, i: number) => {
            const meta = sentenceMeta[i];
            const dayData = allDays.find((d) => d.day === meta.day);
            const s = dayData?.sentences?.[meta.idx];
            if (s?.phrase) {
              phraseRows.push({
                sentence_id: sent.id,
                english: s.phrase.english,
                chinese: s.phrase.chinese,
                usage_tip: s.phrase.usage_tip,
              });
            }
          });
          if (phraseRows.length > 0) {
            const { error: phraseErr } = await supabase.from("phrases").insert(phraseRows);
            if (phraseErr) throw phraseErr;
          }

          send({ progress: 100, step: "Course generation complete!", done: true, course_id: courseId });
        } catch (error) {
          send({ error: error.message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("generate-course error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
