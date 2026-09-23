const MODELS = [
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/qwen/qwen3-30b-a3b-fp8",
  "@cf/openai/gpt-oss-20b",
  "@cf/zai-org/glm-4.7-flash",
  "@cf/moonshotai/kimi-k2.6"
];

export async function onRequestGet() {
  return new Response("FUNCION ACTIVA");
}

function sacarTexto(r) {
  if (!r) return "";
  if (typeof r.response === "string") return r.response;
  if (r.choices && r.choices[0] && r.choices[0].message) return r.choices[0].message.content || "";
  if (typeof r.output_text === "string") return r.output_text;
  return "";
}

export async function onRequestPost({ request, env }) {
  const { system, messages } = await request.json();
  const msgs = [];
  if (system) msgs.push({ role: "system", content: system });
  for (const m of messages) msgs.push({ role: m.role, content: m.content });

  let text = "";
  const errores = [];
  for (const model of MODELS) {
    try {
      const r = await env.AI.run(model, { messages: msgs, max_tokens: 600 });
      text = sacarTexto(r).trim();
      if (text) break;
    } catch (e) {
      errores.push(model + ": " + e.message);
    }
  }
  if (!text) text = "Error: " + errores.join(" | ");

  return new Response(
    JSON.stringify({ content: [{ type: "text", text: text }] }),
    { headers: { "content-type": "application/json" } }
  );
}
