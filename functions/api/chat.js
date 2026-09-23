
export async function onRequestGet() {
  return new Response("FUNCION ACTIVA");
}

export async function onRequestPost({ request, env }) {
  const { system, messages } = await request.json();
  let text = "";
  try {
    const msgs = [];
    if (system) msgs.push({ role: "system", content: system });
    for (const m of messages) msgs.push({ role: m.role, content: m.content });
    const r = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: msgs,
      max_tokens: 512,
    });
    text = (r && r.response) ? r.response : "(sin respuesta)";
  } catch (e) {
    text = "Error: " + e.message;
  }
  return new Response(
    JSON.stringify({ content: [{ type: "text", text: text }] }),
    { headers: { "content-type": "application/json" } }
  );
}
