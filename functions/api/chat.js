    
const MODELS = [
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/qwen/qwen3-30b-a3b-fp8",
  "@cf/openai/gpt-oss-20b",
  "@cf/zai-org/glm-4.7-flash",
  "@cf/moonshotai/kimi-k2.6"
];

// ---- Red de seguridad: frases de riesgo (sin tildes, en minúsculas) ----
const FRASES_RIESGO = [
  "mejor sin mi",
  "quitarme la vida",
  "acabar con mi vida",
  "acabar con todo",
  "suicid",
  "matarme",
  "me quiero morir",
  "quiero morir",
  "quiero morirme",
  "no quiero vivir",
  "no quiero seguir viviendo",
  "no vale la pena vivir",
  "no tiene sentido vivir",
  "ojala no despertar",
  "no despertar mas",
  "desaparecer para siempre",
  "no deberia haber nacido",
  "hacerme dano",
  "autolesion",
  "cortarme",
  "tomarme todas las pastillas"
];

const MENSAJE_CRISIS =
  "Gracias por contármelo, de verdad. Lo que dices me importa, y quiero preguntarte algo directo: ¿estás pensando en quitarte la vida o en hacerte daño?\n\n" +
  "Si es así, por favor no te quedes con esto a solas ahora. Puedes hablar ya mismo con alguien preparado para acompañarte, gratis y a cualquier hora:\n" +
  "• 024: línea de atención a la conducta suicida\n" +
  "• 717 003 717: Teléfono de la Esperanza\n" +
  "• Si eres menor de edad: Fundación ANAR, 900 20 20 10\n" +
  "• Fuera de España: busca \"línea de crisis\" + tu país.\n\n" +
  "Si estás en peligro ahora mismo, llama al 112. Yo sigo aquí contigo mientras tanto.";

const MODO_CUIDADO =
  "\n\nATENCIÓN: en esta conversación la persona ha expresado hace poco ideas de hacerse daño o de no querer vivir. " +
  "Mantén un tono serio y cercano, pregúntale cómo está ahora, recuérdale que puede llamar a una línea de ayuda o a emergencias, " +
  "y no vuelvas a la charla ligera. Si aclara que no hablaba en serio, créele, pero sigue atento.";

function normalizar(t) {
  return (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function hayRiesgo(texto) {
  const t = normalizar(texto);
  return FRASES_RIESGO.some(f => t.includes(f));
}

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

// Algunos modelos (como Qwen3) escriben su "razonamiento" entre <think></think>; se quita.
function limpiar(t) {
  return (t || "").replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<\/?think>/gi, "").trim();
}

function responder(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "content-type": "application/json" }
  });
}

export async function onRequestPost({ request, env }) {
  const { system, messages } = await request.json();
  const lista = Array.isArray(messages) ? messages : [];

  // 1) Si el último mensaje de la persona tiene una frase de riesgo,
  //    se responde SIEMPRE con el mensaje fijo, sin depender de la IA.
  const mensajesUsuario = lista.filter(m => m.role === "user");
  const ultimo = mensajesUsuario[mensajesUsuario.length - 1];
  if (ultimo && hayRiesgo(ultimo.content)) {
    return responder({ content: [{ type: "text", text: MENSAJE_CRISIS }], model: "red-de-seguridad" });
  }

  // 2) Si hubo riesgo en los mensajes recientes, se activa el modo cuidado.
  const recientes = mensajesUsuario.slice(-4);
  const cuidado = recientes.some(m => hayRiesgo(m.content));

  const msgs = [];
  if (system) msgs.push({ role: "system", content: system + (cuidado ? MODO_CUIDADO : "") });
  for (const m of lista) msgs.push({ role: m.role, content: m.content });

  let text = "";
  let usado = "";
  const errores = [];
  for (const model of MODELS) {
    try {
      const r = await env.AI.run(model, { messages: msgs, max_tokens: 600 });
      text = limpiar(sacarTexto(r));
      if (text) { usado = model; break; }
    } catch (e) {
      errores.push(model + ": " + e.message);
    }
  }

  // Si ningún modelo respondió, se devuelve un error real para que la app
  // muestre el aviso de conexión en vez de un texto técnico como si fuera Leal.
  if (!text) {
    return responder({ error: errores.join(" | ") }, 502);
  }

  return responder({ content: [{ type: "text", text: text }], model: usado });
}
