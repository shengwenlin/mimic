import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { word } = await req.json();
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: `You are a pronunciation dictionary. Given an English word, return JSON with:
- "translation": Chinese translation (concise, 1-3 characters)
- "phonetic": phonetic pronunciation using simple syllables separated by " · " (e.g. "blang · kuht")
Return ONLY valid JSON, no markdown.`,
        },
        { role: "user", content: word },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return new Response(JSON.stringify({ error: err }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  
  // Parse the JSON from the AI response
  let parsed;
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = { translation: "—", phonetic: word.toLowerCase() };
  }

  return new Response(JSON.stringify(parsed), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
