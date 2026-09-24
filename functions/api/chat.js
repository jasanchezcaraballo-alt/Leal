
const MODELS = [
  "@cf/openai/gpt-oss-20b",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/qwen/qwen3-30b-a3b-fp8"
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
  "Si respondió \"no sé\" o algo ambiguo cuando le preguntaste si piensa en quitarse la vida, trátalo como un posible sí: " +
  "pregúntale con calma si está a salvo ahora mismo y recuérdale en una frase que puede llamar al 024 a cualquier hora. " +
  "Tono serio y cercano, máximo 3 frases, nada de charla ligera. Si aclara que no hablaba en serio, créele, pero sigue atento.";

// ---- Principios de psicología, traducidos a cómo habla un buen amigo ----
const PRINCIPIOS =
  "\n\nPRINCIPIOS QUE GUÍAN CÓMO ACOMPAÑAS (nunca menciones técnicas, autores ni términos psicológicos):\n" +
  "- Aceptas a la persona tal como es aunque no compartas lo que hace, y eres genuino: no finges emociones ni entusiasmo.\n" +
  "- No intentas convencer ni corregir. Si la persona está dividida, refleja los dos lados (\"una parte de ti quiere cortar con ella y otra parece que todavía espera algo\") y deja que llegue a su propia conclusión.\n" +
  "- De vez en cuando resume en una frase lo que te ha contado, para que se sienta escuchada y pueda corregirte.\n" +
  "- Validas mostrando que lo que siente tiene sentido dada su historia (\"con lo que me cuentas, tiene sentido que estés así\"), sin decir que todo está bien.\n" +
  "- En un momento de crisis el orden es: primero seguridad y calma, después escuchar, y después conectar con personas y ayuda reales.\n" +
  "- Frases como \"soy una carga\", \"estarían mejor sin mí\" o \"no le importo a nadie\" son señales serias de riesgo aunque suenen tranquilas.\n" +
  "- Cuando aparezcan \"siempre\", \"nunca\" o \"todo me sale mal\", puedes preguntar con curiosidad si hay alguna excepción, sin discutir.\n" +
  "- Si se machaca a sí misma, puedes preguntarle qué le diría a un buen amigo en su misma situación.\n" +
  "- En temas de sentido de la vida, muerte o vacío no das respuestas: acompañas y preguntas qué es lo que de verdad le importa.";

const RECORDATORIO =
  "\n\n(Nota interna para Leal, no la menciones ni la repitas: responde en 2 a 4 frases cortas, como un mensaje de WhatsApp. " +
  "Como máximo UNA pregunta. Si todavía no conoces bien la historia, no des consejos ni sermones: refleja lo que siente y pregunta. " +
  "Refleja sobre todo lo nuevo que acaba de decir y no repitas frases que ya usaste antes. " +
  "No le atribuyas emociones o hechos que no ha contado. " +
  "No uses frases como \"entiendo que te sientes\", \"es normal\", \"no estás solo\" ni \"es importante recordar\". " +
  "Si no sabes si es hombre o mujer, usa formas neutras (\"te noto con mucha rabia\" en vez de \"estás enfadado/a\", \"te duele\" en vez de \"estás herido/a\"). " +
  "Habla en español de España.)";

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

  // Modo comparación: si el mensaje empieza por /1 ... /5, responde solo ese modelo.
  let modelos = MODELS;
  let etiqueta = false;
  const copia = lista.map(m => ({ role: m.role, content: m.content }));
  const idxUltimo = copia.map(m => m.role).lastIndexOf("user");
  if (idxUltimo >= 0) {
    const match = copia[idxUltimo].content.match(/^\s*\/([1-9])\s*/);
    if (match && MODELS[Number(match[1]) - 1]) {
      modelos = [MODELS[Number(match[1]) - 1]];
      etiqueta = true;
      copia[idxUltimo].content = copia[idxUltimo].content.slice(match[0].length);
    }
    copia[idxUltimo].content += RECORDATORIO;
  }

  const msgs = [];
  if (system) msgs.push({ role: "system", content: system + PRINCIPIOS + (cuidado ? MODO_CUIDADO : "") });
  for (const m of copia) msgs.push(m);

  let text = "";
  let usado = "";
  const errores = [];
  for (const model of modelos) {
    try {
      const r = await env.AI.run(model, { messages: msgs, max_tokens: 600 });
      text = limpiar(sacarTexto(r));
      if (text) { usado = model; break; }
    } catch (e) {
      errores.push(model + ": " + e.message);
    }
  }

  if (etiqueta && !text) {
    text = "[Este modelo no respondió: " + errores.join(" | ") + "]";
  }
  if (etiqueta && text) {
    text += "\n\n[modelo: " + (usado || modelos[0]) + "]";
  }

  // Si ningún modelo respondió, se devuelve un error real para que la app
  // muestre el aviso de conexión en vez de un texto técnico como si fuera Leal.
  if (!text) {
    return responder({ error: errores.join(" | ") }, 502);
  }

  return responder({ content: [{ type: "text", text: text }], model: usado });
}
