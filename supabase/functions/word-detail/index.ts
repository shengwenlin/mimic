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
  const QWEN_KEY = Deno.env.get("QWEN_API_KEY");
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  const API_KEY = QWEN_KEY ?? LOVABLE_KEY;

  if (!API_KEY) {
    return new Response(
      JSON.stringify({ translation: "—", phonetic: word.toLowerCase() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const apiUrl = QWEN_KEY
    ? "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    : "https://ai.gateway.lovable.dev/v1/chat/completions";
  const model = QWEN_KEY ? "qwen-turbo" : "google/gemini-2.5-flash-lite";

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: `你是一个英语词典。给定一个英语单词，返回JSON格式：
- "translation": 简洁的中文翻译（1-4个汉字，最常用含义）
- "phonetic": 标准国际音标（IPA），例如 /pɔɪnt/、/lɛt/、/ɪkˈspleɪn/

只返回合法的JSON，不要markdown。示例：{"translation":"允许","phonetic":"/lɛt/"}`,
        },
        { role: "user", content: word },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("LLM API error:", err);
    return new Response(
      JSON.stringify({ translation: "—", phonetic: word.toLowerCase() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";

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
