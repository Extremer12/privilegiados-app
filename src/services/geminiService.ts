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

export interface SongCandidate {
  title: string;
  author: string;
  versionOrAlbum?: string;
  sampleLyric: string;
  category: 'alabanza' | 'adoracion' | 'especial' | 'otro';
  originalKey?: string;
  bpm?: string;
  youtubeUrl?: string;
}

export interface CandidateSearchResult {
  found: boolean;
  message?: string;
  candidates: SongCandidate[];
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

const SONG_RESULT_SCHEMA = {
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
    youtubeVideoId: { type: "string", description: "ID de 11 caracteres del video de YouTube" },
    youtubeQuery: { type: "string", description: "Término de búsqueda óptimo en YouTube" },
    notes: { type: "string", description: "Consejos de interpretación musical" }
  },
  required: ["found", "title", "author", "category", "lyrics", "chords"]
};

const CANDIDATES_SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean", description: "Indica si se encontraron opciones coincidentes" },
    message: { type: "string", description: "Mensaje explicativo o resumen de las opciones" },
    candidates: {
      type: "array",
      description: "Lista de 1 a 4 versiones o canciones coincidentes",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título de la canción" },
          author: { type: "string", description: "Autor, ministerio o intérprete" },
          versionOrAlbum: { type: "string", description: "Álbum, año o versión distintiva (ej: Álbum Viento Más Fuego, o Álbum Transformados)" },
          sampleLyric: { type: "string", description: "2 a 3 líneas del coro o estrofa clave para que el usuario reconozca la letra al instante" },
          category: { type: "string", enum: ["alabanza", "adoracion", "especial", "otro"] },
          originalKey: { type: "string", description: "Tonalidad original estimada (ej: G, Em)" },
          bpm: { type: "string", description: "BPM estimado" },
          youtubeUrl: { type: "string", description: "URL de YouTube si se conoce" }
        },
        required: ["title", "author", "sampleLyric", "category"]
      }
    }
  },
  required: ["found", "candidates"]
};

async function callGeminiGeneric<T>(
  prompt: string,
  schema: any,
  systemInstruction?: string,
  temperature = 0.0,
  signal?: AbortSignal
): Promise<T> {
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

      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 20000);

      const handleUserAbort = () => timeoutController.abort();
      if (signal) {
        signal.addEventListener('abort', handleUserAbort, { once: true });
      }

      try {
        const bodyPayload: any = {
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
            response_schema: schema,
            temperature,
          },
        };

        if (systemInstruction) {
          bodyPayload.system_instruction = {
            parts: [{ text: systemInstruction }],
          };
        }

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: timeoutController.signal,
          body: JSON.stringify(bodyPayload),
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

        const parsed: T = JSON.parse(textOutput);
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
 * Paso 1: Busca candidatos ligeros (título, autor, coro distintivo) para desambiguación rápida y bajo consumo de tokens.
 */
export async function searchSongCandidatesWithGemini(
  params: SearchSongParams
): Promise<CandidateSearchResult> {
  const { title, author, youtubeUrl, referenceUrl, lyricsSnippet, signal } = params;

  const prompt = `Identifica las opciones y versiones oficiales de canciones cristianas que coinciden con la búsqueda:
- Título: "${title.trim()}"
${author?.trim() ? `- Autor / Intérprete sugerido: "${author.trim()}"` : ''}
${youtubeUrl?.trim() ? `- Enlace de YouTube: "${youtubeUrl.trim()}"` : ''}
${referenceUrl?.trim() ? `- Enlace de Referencia: "${referenceUrl.trim()}"` : ''}
${lyricsSnippet?.trim() ? `- Frase o fragmento de la letra: "${lyricsSnippet.trim()}"` : ''}

INSTRUCCIONES CLAVE:
1. Devuelve entre 1 y 4 opciones distintas y relevantes que el usuario podría estar buscando (incluyendo si existen diferentes canciones con el mismo título de distintos autores o versiones conocidas).
2. En 'sampleLyric', escribe 2 o 3 líneas del coro o estrofa más famosa para que el músico reconozca de inmediato cuál es su canción.
3. En 'versionOrAlbum', especifica el álbum, año o versión distintiva.
4. Si no existe ninguna canción cristiana con este título, responde found: false.`;

  return callGeminiGeneric<CandidateSearchResult>(
    prompt,
    CANDIDATES_SCHEMA,
    "Eres un catalogador experto de música y cancioneros cristianos. Tu tarea es listar las diferentes opciones o versiones existentes para que el usuario elija la exacta.",
    0.1,
    signal
  );
}

/**
 * Paso 2: Transcribe con acordes completos la versión específica que el usuario eligió de las cards.
 */
export async function transcribeCandidateWithGemini({
  candidate,
  targetKey,
  youtubeUrlOverride,
  signal,
}: {
  candidate: SongCandidate;
  targetKey?: string;
  youtubeUrlOverride?: string;
  signal?: AbortSignal;
}): Promise<GeminiSongResult> {
  const finalYoutube = youtubeUrlOverride?.trim() || candidate.youtubeUrl?.trim() || "";

  const prompt = `Transcribe con máxima fidelidad literal la siguiente canción cristiana seleccionada:
- Título: "${candidate.title}"
- Autor / Intérprete: "${candidate.author}"
${candidate.versionOrAlbum ? `- Versión / Álbum: "${candidate.versionOrAlbum}"` : ''}
- Letra o coro distintivo de referencia: "${candidate.sampleLyric}"
${finalYoutube ? `- Video de YouTube: "${finalYoutube}"` : ''}
${targetKey && targetKey !== "Original" ? `- Tonalidad solicitada: Transportar todos los acordes a ${targetKey}.` : `- Tonalidad: Mantener la tonalidad original (${candidate.originalKey || 'Tono original'}).`}

INSTRUCCIONES CLAVE E INQUEBRANTABLES:
1. Transcribe la letra COMPLETA de principio a fin correspondiente a esta versión exacta identificada por: "${candidate.sampleLyric}".
2. PROHIBIDO alterar la letra, inventar estrofas o mezclar con canciones homónimas.
3. En el campo 'chords', escribe la letra con los acordes reales de cifraclub.com / lacuerda.net colocados en la línea superior exactamente sobre la sílaba donde se tocan.
4. En el campo 'lyrics', escribe la letra limpia estructurada con [Intro], [Verso 1], [Verso 2], [Coro], [Puente], etc.`;

  const SYSTEM_INSTRUCTION = `Eres una base de datos estricta y transcriptor musical para cancioneros de alabanza cristiana. Tu función es devolver la transcripción oficial y literal de la canción seleccionada con acordes reales de CifraClub/LaCuerda.`;

  return callGeminiGeneric<GeminiSongResult>(
    prompt,
    SONG_RESULT_SCHEMA,
    SYSTEM_INSTRUCTION,
    0.0,
    signal
  );
}

/**
 * Búsqueda directa tradicional (compatibilidad hacia atrás)
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

  const SYSTEM_INSTRUCTION = `Eres una base de datos estricta y transcriptor musical para cancioneros de alabanza cristiana.`;

  return callGeminiGeneric<GeminiSongResult>(
    prompt,
    SONG_RESULT_SCHEMA,
    SYSTEM_INSTRUCTION,
    0.0,
    signal
  );
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

  return callGeminiGeneric<GeminiSongResult>(
    prompt,
    SONG_RESULT_SCHEMA,
    "Eres un formateador y estructurador de acordes y partituras de canciones cristianas.",
    0.0,
    signal
  );
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

  return callGeminiGeneric<GeminiSongResult>(
    prompt,
    SONG_RESULT_SCHEMA,
    "Eres un transcriptor musical experto para cancioneros cristianos.",
    0.0,
    signal
  );
}
