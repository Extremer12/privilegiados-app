export interface GeminiSongResult {
  found: boolean;
  message?: string;
  title: string;
  author: string;
  category: 'alabanza' | 'adoracion' | 'especial' | 'otro';
  originalKey: string;
  requestedKey?: string;
  bpm?: string;
  lyrics: string;
  chords: string;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  youtubeQuery?: string;
  notes?: string;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Available models in order of priority
const MODELS = [
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
];

const SYSTEM_INSTRUCTION = `Eres un transcriptor musical y director de alabanza profesional especializado en cancioneros y armonía cristiana. Conoces con total precisión las transcripciones de acordes.lacuerda.net, cifraclub.com, letras.com y cancioneros oficiales de ministerios cristianos.

REGLAS DE PRECISIÓN Y VERACIDAD ESTRICTA:
1. NO inventes letras ni acordes. Usa las transcripciones oficiales y reales de la canción cantada por el autor o ministerio.
2. Si la canción no es conocida o no tienes la certeza de los acordes reales, debes responder "found": false y explicar en "message" el motivo.
3. La letra debe estar COMPLETA de inicio a fin (sin puntos suspensivos "..." ni estrofas omitidas).
4. El campo "chords" debe tener la letra con los acordes colocados en líneas superiores EXACTAMENTE encima de las sílabas o palabras donde cambia la armonía musical. Incluye etiquetas de sección claras: [Intro], [Verso 1], [Verso 2], [Pre-Coro], [Coro], [Puente], [Final].
5. El campo "lyrics" debe contener la letra limpia y completa, organizada con las mismas etiquetas de sección [Verso 1], [Coro], etc., sin acordes.
6. Identifica con precisión:
   - "originalKey": Tonalidad original exacta (ej: Sol / G, Re / D, Do / C, Mi menor / Em).
   - "bpm": Tempo aproximado (ej: 72 BPM / Balada lenta, 128 BPM / Júbilo).
   - "category": Clasifica entre "alabanza" (júbilo/rápida), "adoracion" (introspectiva/lenta), "especial" (coro/solista), "otro".
7. Busca el video oficial de la canción en YouTube y provee su URL directa o ID de 11 caracteres en "youtubeUrl" y "youtubeVideoId".`;

const JSON_SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean", description: "Indica si la canción y acordes reales fueron encontrados con certeza" },
    message: { type: "string", description: "Mensaje explicativo si no se encontró o advertencias" },
    title: { type: "string", description: "Título oficial de la canción" },
    author: { type: "string", description: "Artista, autor o ministerio principal" },
    category: { 
      type: "string", 
      enum: ["alabanza", "adoracion", "especial", "otro"],
      description: "Categoría de la canción" 
    },
    originalKey: { type: "string", description: "Tonalidad original de la canción (ej: G, D, C, Em)" },
    bpm: { type: "string", description: "Tempo o BPM estimado (ej: 70 BPM)" },
    lyrics: { type: "string", description: "Letra completa sin acordes, estructurada con [Verso 1], [Coro], etc." },
    chords: { type: "string", description: "Letra con acordes reales alineados en líneas superiores sobre cada sílaba" },
    youtubeUrl: { type: "string", description: "URL directa de YouTube" },
    youtubeVideoId: { type: "string", description: "ID de 11 caracteres del video de YouTube (ej: 0h0D8xL39mU)" },
    youtubeQuery: { type: "string", description: "Término de búsqueda óptimo en YouTube" },
    notes: { type: "string", description: "Consejos de interpretación musical" }
  },
  required: ["found", "title", "author", "category", "lyrics", "chords"]
};

async function callGemini(prompt: string): Promise<GeminiSongResult> {
  if (!GEMINI_API_KEY) {
    throw new Error("No se ha configurado la clave VITE_GEMINI_API_KEY en las variables de entorno.");
  }

  let lastError: Error | null = null;

  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
            response_schema: JSON_SCHEMA,
            temperature: 0.1, // Very low temperature for strict factual accuracy from known chord charts
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        console.warn(`Error en modelo ${model}:`, message);
        lastError = new Error(message);
        continue;
      }

      const result = await response.json();
      const textOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textOutput) {
        throw new Error("Gemini no devolvió texto de respuesta.");
      }

      const parsed: GeminiSongResult = JSON.parse(textOutput);
      return parsed;
    } catch (err: any) {
      console.warn(`Fallo al consultar ${model}:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error("No se pudo obtener respuesta de los modelos de Gemini.");
}

/**
 * Busca una canción cristiana con acordes reales de cancioneros/LaCuerda/Letras.com
 */
export async function searchSongWithGemini(
  query: string,
  targetKey?: string
): Promise<GeminiSongResult> {
  const prompt = `Transcribe la canción cristiana: "${query}".
Busca en tu base de datos las transcripciones reales de acordes.lacuerda.net, cifraclub.com y cancioneros oficiales.
${targetKey && targetKey !== "Original" ? `IMPORTANTE: Transporta fielmente todos los acordes a la tonalidad de ${targetKey}.` : 'Mantén la tonalidad original.'}

Asegúrate de que la letra esté completa, sin omitir estrofas y con acordes posicionados exactamente sobre las palabras. Incluye el enlace o ID de YouTube oficial.`;

  return callGemini(prompt);
}

/**
 * Limpia y formatea un texto/letra crudo desordenado con acordes
 */
export async function formatRawSongWithGemini(
  rawContent: string,
  targetKey?: string
): Promise<GeminiSongResult> {
  const prompt = `Analiza, formatea y organiza el siguiente texto de canción con acordes:

---
${rawContent}
---

${targetKey && targetKey !== "Original" ? `Transporta todos los acordes a la tonalidad de ${targetKey}.` : 'Mantén la tonalidad original del texto.'}

Estructura las secciones con etiquetas estándar [Intro], [Verso 1], [Coro], [Puente], etc. Corrige la alineación de acordes sobre las palabras y extrae título, autor y categoría apropiada. Si no es una canción válida, indica found: false.`;

  return callGemini(prompt);
}
