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
  referenceUrl?: string;
  lyricsSnippet?: string;
  targetKey?: string;
  signal?: AbortSignal;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Available models in order of priority (flagship high-accuracy models first)
const MODELS = [
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
];

const SYSTEM_INSTRUCTION = `Eres una base de datos estricta y transcriptor musical para cancioneros y alabanza cristiana. Tu única función es devolver la transcripción oficial y literal de la canción solicitada, tal cual fue grabada originalmente por el autor o publicada en cancioneros de referencia (lacuerda.net, cifraclub.com, letras.com).

REGLAS ABSOLUTAS E INQUEBRANTABLES:
1. PROHIBIDO MODIFICAR, INVENTAR O PARAFRASEAR LA LETRA: No cambies ninguna palabra de la letra original. No inventes versos ni sustituyas palabras por sinónimos.
2. PROHIBIDO CAMBIAR O INVENTAR ACORDES: Escribe la progresión armónica y acordes reales de la canción. Coloca cada acorde en la línea superior exactamente sobre la sílaba donde suena.
3. PROHIBIDO RESUMIR O USAR PUNTOS SUSPENSIVOS: La letra debe estar COMPLETA con todas sus estrofas, pre-coros, coros y puentes.
4. DESAMBIGUACIÓN EXACTA: Si existen varias canciones con el mismo nombre (ej. "Hosanna", "Bautízame", "Santo"), básate en el autor, el video de YouTube o la frase provista para entregar exactamente la canción que busca el usuario.
5. SI TIENES DUDAS: Si no estás 100% seguro de la letra exacta o de los acordes oficiales, responde "found": false y explica en "message" qué dato se necesita.`;

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
              temperature: 0.0,
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
  let referenceUrl = "";
  let lyricsSnippet = "";
  let targetKey = legacyKey;
  let signal = legacySignal;

  if (typeof paramsOrQuery === "string") {
    title = paramsOrQuery;
  } else {
    title = paramsOrQuery.title;
    author = paramsOrQuery.author || "";
    youtubeUrl = paramsOrQuery.youtubeUrl || "";
    referenceUrl = paramsOrQuery.referenceUrl || "";
    lyricsSnippet = paramsOrQuery.lyricsSnippet || "";
    targetKey = paramsOrQuery.targetKey || targetKey;
    signal = paramsOrQuery.signal || signal;
  }

  // If the user pasted a CifraClub or Letras link in the title or youtubeUrl
  const allUrls = [referenceUrl, youtubeUrl, title].filter(u => u.startsWith("http://") || u.startsWith("https://"));
  const detectedUrl = allUrls[0] || "";

  const prompt = `Transcribe la siguiente canción cristiana con máxima fidelidad literal:
- Título: "${title}"
${author ? `- Autor / Ministerio / Intérprete: "${author}"` : ''}
${youtubeUrl ? `- Enlace de Video de YouTube: "${youtubeUrl}"` : ''}
${detectedUrl ? `- Enlace de Referencia Web (CifraClub / LaCuerda / Letras): "${detectedUrl}"` : ''}
${lyricsSnippet ? `- Fragmento o frase distintiva de la letra: "${lyricsSnippet}"` : ''}
${targetKey && targetKey !== "Original" ? `- Tonalidad destino solicitada: Transportar todos los acordes a la tonalidad de ${targetKey}.` : '- Mantener la tonalidad original de la canción.'}

INSTRUCCIONES CLAVE:
1. FUENTES DE REFERENCIA: Basa tu transcripción exactamente en las tablaturas oficiales de cifraclub.com, lacuerda.net y letras.com.
2. Si se proporcionó un enlace de CifraClub o Letras.com (${detectedUrl}), utiliza exactamente los acordes y la letra de esa versión.
3. PROHIBIDO alterar la letra o simplificar los acordes. Transcribe con fidelidad 100% literal.
4. Incluye la letra completa de principio a fin estructurada con etiquetas [Intro], [Verso 1], [Coro], [Puente], etc.`;

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

/**
 * Agrega acordes oficiales y estructura en estrofas una canción existente
 */
export async function enhanceExistingSong({
  title,
  author,
  lyrics,
  targetKey,
  signal,
}: {
  title: string;
  author?: string;
  lyrics: string;
  targetKey?: string;
  signal?: AbortSignal;
}): Promise<GeminiSongResult> {
  const prompt = `Tienes la siguiente canción cristiana que fue subida sin acordes o sin separación clara de estrofas:
- Título: "${title}"
${author ? `- Autor / Intérprete: "${author}"` : ''}
- Letra actual existente:
---
${lyrics}
---

${targetKey && targetKey !== "Original" ? `- Tonalidad solicitada: ${targetKey}.` : '- Usar la tonalidad original oficial.'}

INSTRUCCIONES CLAVE:
1. MANTÉN EL TEXTO Y MENSAJE DE LA LETRA: No inventes letras nuevas ni cambies palabras. Conserva la letra existente.
2. ORGANIZA LA ESTRUCTURA: Separa y etiqueta con [Intro], [Verso 1], [Verso 2], [Pre-Coro], [Coro], [Puente], [Final].
3. AGREGA LOS ACORDES REALES: En el campo 'chords', coloca los acordes oficiales de cifraclub.com / lacuerda.net exactamente alineados sobre las sílabas donde se tocan.
4. Extrae la tonalidad original y tempo (BPM) estimado.`;

  return callGemini(prompt, signal);
}
