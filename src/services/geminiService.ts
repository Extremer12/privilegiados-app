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

export interface SearchSongParams {
  title: string;
  author?: string;
  youtubeUrl?: string;
  lyricsSnippet?: string;
  targetKey?: string;
  signal?: AbortSignal;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Available models in order of priority (fastest first)
const MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
];

const SYSTEM_INSTRUCTION = `Eres un transcriptor musical y director de alabanza profesional especializado en cancioneros y armonía cristiana. Conoces con total precisión las transcripciones de acordes.lacuerda.net, cifraclub.com, letras.com y cancioneros oficiales de ministerios cristianos (Marco Barrientos, Miel San Marcos, Marcos Witt, Christine D'Clario, Hillsong en Español, Bethel, Elevation Worship, etc.).

REGLAS DE PRECISIÓN Y DESAMBIGUACIÓN ESTRICTA:
1. DESAMBIGUACIÓN: Si varias canciones tienen el mismo título (por ejemplo, "Hosanna", "Bautízame", "Cuan Grande es Dios", "Santo", "Rey de Reyes"), DEBES basarte en el autor indicado, en el enlace de video o en la frase de la letra provista por el usuario para transcribir EXACTAMENTE la canción deseada y no confundirla con otra de distinto autor.
2. NO inventes letras ni acordes. Usa la transcripción real y oficial de la versión requerida.
3. Si la canción no es conocida o no tienes la certeza de los acordes reales, debes responder "found": false y explicar en "message" el motivo.
4. La letra debe estar COMPLETA de inicio a fin (sin puntos suspensivos "..." ni estrofas omitidas).
5. El campo "chords" debe tener la letra con los acordes colocados en líneas superiores EXACTAMENTE encima de las sílabas o palabras donde cambia la armonía musical. Incluye etiquetas de sección claras: [Intro], [Verso 1], [Verso 2], [Pre-Coro], [Coro], [Puente], [Final].
6. El campo "lyrics" debe contener la letra limpia y completa, organizada con las mismas etiquetas de sección [Verso 1], [Coro], etc., sin acordes.
7. Identifica con precisión:
   - "originalKey": Tonalidad original exacta (ej: G, Em, D, C, etc.).
   - "bpm": Tempo aproximado (ej: 72 BPM / Balada lenta, 128 BPM / Júbilo).
   - "category": Clasifica entre "alabanza" (júbilo/rápida), "adoracion" (introspectiva/lenta), "especial" (coro/solista), "otro".
8. Devuelve el enlace o ID de YouTube del video oficial o de referencia.`;

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

async function callGemini(prompt: string, signal?: AbortSignal): Promise<GeminiSongResult> {
  if (!GEMINI_API_KEY) {
    throw new Error("No se ha configurado la clave VITE_GEMINI_API_KEY en las variables de entorno.");
  }

  let lastError: Error | null = null;

  for (const model of MODELS) {
    if (signal?.aborted) {
      throw new DOMException("Búsqueda cancelada por el usuario.", "AbortError");
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

      // Create a timeout controller per model attempt (15s timeout)
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 15000);

      // Combine user signal and timeout signal if possible
      const handleUserAbort = () => timeoutController.abort();
      if (signal) {
        signal.addEventListener('abort', handleUserAbort, { once: true });
      }

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: timeoutController.signal,
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
              temperature: 0.1,
            },
          }),
        });

        clearTimeout(timeoutId);
        if (signal) {
          signal.removeEventListener('abort', handleUserAbort);
        }

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
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (signal) {
          signal.removeEventListener('abort', handleUserAbort);
        }

        if (signal?.aborted) {
          throw new DOMException("Búsqueda cancelada.", "AbortError");
        }

        console.warn(`Intento fallido en ${model}:`, fetchErr.message);
        lastError = fetchErr;
      }
    } catch (err: any) {
      if (err.name === "AbortError" || signal?.aborted) {
        throw err;
      }
      console.warn(`Fallo al consultar ${model}:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error("No se pudo obtener respuesta de los servidores de Gemini. Intenta nuevamente.");
}

/**
 * Busca una canción cristiana con desambiguación precisa por autor, enlace de video o fragmento
 */
export async function searchSongWithGemini(
  paramsOrQuery: string | SearchSongParams,
  legacyKey?: string,
  legacySignal?: AbortSignal
): Promise<GeminiSongResult> {
  let title = "";
  let author = "";
  let youtubeUrl = "";
  let lyricsSnippet = "";
  let targetKey = legacyKey;
  let signal = legacySignal;

  if (typeof paramsOrQuery === "string") {
    title = paramsOrQuery;
  } else {
    title = paramsOrQuery.title;
    author = paramsOrQuery.author || "";
    youtubeUrl = paramsOrQuery.youtubeUrl || "";
    lyricsSnippet = paramsOrQuery.lyricsSnippet || "";
    targetKey = paramsOrQuery.targetKey || targetKey;
    signal = paramsOrQuery.signal || signal;
  }

  const prompt = `Transcribe la siguiente canción cristiana:
- Título: "${title}"
${author ? `- Autor / Ministerio / Intérprete: "${author}"` : ''}
${youtubeUrl ? `- Enlace de Video de YouTube de referencia: "${youtubeUrl}"` : ''}
${lyricsSnippet ? `- Fragmento o frase distintiva de la letra: "${lyricsSnippet}"` : ''}
${targetKey && targetKey !== "Original" ? `- Tonalidad destino solicitada: Transportar todos los acordes a la tonalidad de ${targetKey}.` : '- Mantener la tonalidad original de la canción.'}

INSTRUCCIONES CLAVE:
1. Si hay múltiples canciones con este título, usa el autor, video o fragmento provisto para elegir EXACTAMENTE la canción indicada por el usuario y NO otra.
2. Consulta las transcripciones reales de cancioneros cristianos, acordes.lacuerda.net y cifraclub.com.
3. Asegúrate de incluir la letra completa y los acordes reales sobre cada sílaba.`;

  return callGemini(prompt, signal);
}

/**
 * Limpia y formatea un texto/letra crudo desordenado con acordes
 */
export async function formatRawSongWithGemini(
  rawContent: string,
  targetKey?: string,
  signal?: AbortSignal
): Promise<GeminiSongResult> {
  const prompt = `Analiza, formatea y organiza el siguiente texto de canción con acordes:

---
${rawContent}
---

${targetKey && targetKey !== "Original" ? `Transporta todos los acordes a la tonalidad de ${targetKey}.` : 'Mantén la tonalidad original del texto.'}

Estructura las secciones con etiquetas estándar [Intro], [Verso 1], [Coro], [Puente], etc. Corrige la alineación de acordes sobre las palabras y extrae título, autor y categoría apropiada. Si no es una canción válida, indica found: false.`;

  return callGemini(prompt, signal);
}
