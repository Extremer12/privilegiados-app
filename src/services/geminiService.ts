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

const SYSTEM_INSTRUCTION = `Eres un experto maestro de música y director de alabanza cristiana, especializado en cancioneros, armonía, acordes y letras de alabanza y adoración.

Tu misión es proveer la letra, acordes oficiales, tonalidad, categoría y autor exactos de canciones cristianas.

REGLAS ESTRICTAS DE PRECISIÓN (ANTI-ALUCINACIÓN):
1. Si la canción existe y cuentas con acordes verificados (de cancioneros oficiales, CifraClub, LaCuerda, SongSelect, etc.), devuelve "found": true con los acordes reales.
2. Si la canción no es conocida, es ambigua o no existen fuentes con acordes reales y confirmados, DEBES establecer "found": false y explicar en "message" el motivo (ejemplo: "No se encontraron acordes oficiales para este título. Por favor verifica el nombre o ingresa la letra manualmente."). NO inventes acordes ni letras ficticias.
3. Categorías válidas:
   - "alabanza": Canciones rápidas, de júbilo, agradecimiento o fiesta.
   - "adoracion": Canciones lentas, solemnes, de comunión y entrega.
   - "especial": Canciones para ocasiones especiales, solistas, coro o temas específicos.
   - "otro": Si no encaja exactamente en las anteriores.
4. Formato de "lyrics" (Solo letra):
   - Organizado con etiquetas de sección claras: [Intro], [Verso 1], [Verso 2], [Pre-Coro], [Coro], [Puente], [Final].
   - Sin acordes, solo texto limpio y con buena puntuación.
5. Formato de "chords" (Letra con acordes):
   - Los acordes deben estar ubicados en líneas superiores justo encima de la sílaba o palabra donde se ejecutan.
   - Incluir secciones como [Intro], [Verso], [Coro], etc.
   - Si se especifica una tonalidad destino ("requestedKey"), transporta fielmente todos los acordes a esa tonalidad.
6. "youtubeQuery": El término de búsqueda óptimo en YouTube (ej: "La Bondad de Dios Christine D'Clario oficial").`;

const JSON_SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean", description: "Indica si la canción fue encontrada con fuentes de acordes confiables" },
    message: { type: "string", description: "Mensaje explicativo si no se encontró o advertencias" },
    title: { type: "string", description: "Título oficial de la canción" },
    author: { type: "string", description: "Artista, autor o ministerio principal" },
    category: { 
      type: "string", 
      enum: ["alabanza", "adoracion", "especial", "otro"],
      description: "Categoría de la canción" 
    },
    originalKey: { type: "string", description: "Tonalidad original de la canción (ej: Sol / G, Re / D, Do#m / C#m)" },
    bpm: { type: "string", description: "Tempo estimado o BPM (ej: 72 BPM / Lento)" },
    lyrics: { type: "string", description: "Letra completa y estructurada con etiquetas [Verso], [Coro], etc." },
    chords: { type: "string", description: "Letra completa con acordes tabulados encima de las sílabas exactas" },
    youtubeUrl: { type: "string", description: "URL directa de YouTube si la conoces con certeza" },
    youtubeQuery: { type: "string", description: "Término de búsqueda para encontrar el video oficial en YouTube" },
    notes: { type: "string", description: "Consejos de interpretación musical o dinámica" }
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
            temperature: 0.2, // Low temperature for high factual accuracy
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        console.warn(`Error en modelo ${model}:`, message);
        lastError = new Error(message);
        continue; // Try next model
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
 * Busca una canción cristiana por título, artista y opcionalmente transporta a una tonalidad
 */
export async function searchSongWithGemini(
  query: string,
  targetKey?: string
): Promise<GeminiSongResult> {
  const prompt = `Busca la canción cristiana: "${query}".
${targetKey ? `IMPORTANTE: Por favor genera los acordes transportados a la tonalidad de ${targetKey}.` : 'Genera los acordes en su tonalidad original.'}

Verifica fuentes confiables de acordes y provee la estructura ordenada con secciones [Intro], [Verso], [Coro], [Puente], etc. Si la canción no existe o no tiene acordes confiables, indica found: false.`;

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

${targetKey ? `Transporta todos los acordes a la tonalidad de ${targetKey}.` : 'Mantén la tonalidad original o la que esté indicada en el texto.'}

Estructura las secciones con etiquetas estándar [Intro], [Verso 1], [Coro], [Puente], etc. Corrige la alineación de acordes sobre las palabras y extrae título, autor y categoría apropiada. Si no parece ser una canción válida, indica found: false.`;

  return callGemini(prompt);
}
