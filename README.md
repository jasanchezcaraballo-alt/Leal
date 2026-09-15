# Amigo Virtual (Leal)

App de chat con IA que actúa como amigo virtual para desahogarse.

## Estructura
- `index.html` — el front completo (HTML/CSS/JS en un solo archivo).
- `functions/api/chat.js` — Cloudflare Pages Function que actúa de backend/proxy:
  recibe el mensaje del navegador, le agrega tu API key de Anthropic (que nunca
  se expone en el navegador) y reenvía la petición a la API real.

## Modo demo (sin pagar todavía)

Puedes desplegar esta app en Cloudflare Pages ahora mismo, **sin configurar
ninguna API key**. Mientras no exista `ANTHROPIC_API_KEY`, `functions/api/chat.js`
responde con frases predefinidas (sin IA, sin costo) para que puedas probar
que todo el flujo — subida, diseño, chat — funciona bien.

Cuando quieras activar la IA real, solo agrega `ANTHROPIC_API_KEY` en
Settings → Environment variables y vuelve a desplegar. No hay que tocar
ningún código: la función detecta sola si la key existe o no.

## Cómo desplegarlo en Cloudflare Pages

1. Entra a https://dash.cloudflare.com → **Workers & Pages** → **Crear** → **Pages**.
2. Sube esta carpeta directamente (opción "Subir carpeta"/"Direct upload"),
   o conéctala desde un repo de GitHub si prefieres.
   - Build command: (vacío, no hace falta)
   - Build output directory: `/` (la raíz, donde está `index.html`)
3. Cuando el proyecto esté creado, ve a
   **tu proyecto → Settings → Environment variables**.
4. Agrega una variable:
   - Nombre: `ANTHROPIC_API_KEY`
   - Valor: tu API key de https://console.anthropic.com
   - Márcala como **secreta** (Encrypt)
5. Vuelve a desplegar (Cloudflare a veces pide un redeploy para que la
   variable nueva tome efecto).
6. Abre la URL que te da Cloudflare (algo como `tu-proyecto.pages.dev`) — el
   chat ya debería funcionar de verdad, llamando a `/api/chat`, que a su vez
   llama a Anthropic con tu key desde el servidor (nunca desde el navegador).

`functions/api/chat.js` se despliega solo — Cloudflare Pages detecta
automáticamente cualquier carpeta `functions/` y la convierte en endpoints.
No necesitas configurar nada de `wrangler` a mano para esto.

## Personalización
Todo el comportamiento de Leal (tono, límites, temas, enfoques de apoyo)
está en la constante `SYSTEM_PROMPT` dentro de `index.html`. Editar ese
texto cambia cómo responde.

## Colores / diseño
Variables CSS al inicio del `<style>` de `index.html`
(`--night`, `--ember`, etc.) controlan la paleta.

## Importante — seguridad
Nunca pongas tu `ANTHROPIC_API_KEY` directamente en `index.html` ni en
ningún archivo que se sirva al navegador. Por eso existe `functions/api/chat.js`:
la key vive solo en el servidor (Cloudflare), protegida como variable de
entorno secreta.
