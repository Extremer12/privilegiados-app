import {
  VerifiedSongVersion,
  SongVerificationResponse,
  findSongVersions,
  isAllowedSource,
  MIN_CONFIDENCE
} from "./songVerificationService";

export type {
  VerifiedSongVersion,
  SongVerificationResponse,
};

export {
  findSongVersions,
  isAllowedSource,
  MIN_CONFIDENCE
};

// Aliases for compatibility
export type SongCandidate = VerifiedSongVersion;
export type CandidateSearchResult = SongVerificationResponse;

export interface GeminiSongResult {
  found: boolean;
  message?: string;
  title: string;
  author: string;
  version?: string;
  album?: string;
  year?: string;
  category: 'alabanza' | 'adoracion' | 'especial' | 'otro';
  originalKey: string;
  requestedKey?: string;
  bpm?: string;
  lyrics: string;
  chords: string;
  chordsAvailable?: boolean;
  source?: string;
  sourceUrl?: string;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  youtubeQuery?: string;
  notes?: string;
  confidence?: number;
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

const MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
];

const SONG_RESULT_SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean", description: "Indica si la canción y acordes reales fueron encontrados con certeza" },
    message: { type: "string", description: "Mensaje explicativo si no se encontró o advertencias" },
    title: { type: "string", description: "Título oficial de la canción grabada" },
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
    chordsAvailable: { type: "boolean", description: "Indica si los acordes fueron obtenidos de una fuente real verificable" },
    youtubeUrl: { type: "string", description: "URL directa de YouTube" },
    youtubeVideoId: { type: "string", description: "ID de 11 caracteres del video de YouTube" },
    notes: { type: "string", description: "Consejos de interpretación musical" }
  },
  required: ["found", "title", "author", "category", "lyrics", "chords"]
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
          console.warn(`[DEBUG] Error en modelo ${model}:`, message);
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

        console.warn(`[DEBUG] Intento fallido en ${model}:`, fetchErr.message);
        lastError = fetchErr;
      }
    } catch (err: any) {
      if (err.name === "AbortError" || signal?.aborted) {
        throw err;
      }
      console.warn(`[DEBUG] Fallo al consultar ${model}:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error("No se pudo obtener respuesta de los servidores de Gemini. Intenta nuevamente.");
}

/**
 * Paso 1: Busca candidatos verificados (utiliza la arquitectura de verificación)
 */
export async function searchSongCandidatesWithGemini(
  params: SearchSongParams
): Promise<SongVerificationResponse> {
  return findSongVersions(params);
}

/**
 * Paso 2: Transcribe con acordes completos la versión específica verificada seleccionada por el usuario.
 */
export async function transcribeCandidateWithGemini({
  candidate,
  targetKey,
  youtubeUrlOverride,
  signal,
}: {
  candidate: VerifiedSongVersion;
  targetKey?: string;
  youtubeUrlOverride?: string;
  signal?: AbortSignal;
}): Promise<GeminiSongResult> {
  const finalYoutube = youtubeUrlOverride?.trim() || candidate.sourceUrl?.trim() || "";

  const prompt = `Transcribe la siguiente versión VERIFICADA de canción cristiana:
- Título: "${candidate.title}"
- Artista / Intérprete oficial: "${candidate.author}"
${candidate.version ? `- Versión: "${candidate.version}"` : ''}
${candidate.album ? `- Álbum: "${candidate.album}"` : ''}
${candidate.year ? `- Año: "${candidate.year}"` : ''}
- Fuente de referencia: "${candidate.source || 'CifraClub / LaCuerda'}"
- Fragmento verificado de referencia: "${candidate.preview}"
${finalYoutube ? `- Enlace de Video / Fuente: "${finalYoutube}"` : ''}
${targetKey && targetKey !== "Original" ? `- Tonalidad solicitada: Transportar todos los acordes a ${targetKey}.` : `- Tonalidad original: ${candidate.originalKey || 'Original'}.`}

REGLAS DE ORO:
1. Basate estrictamente en la transcripción de CifraClub / LaCuerda para "${candidate.title}" de "${candidate.author}".
2. PROHIBIDO inventar o cambiar la letra. Escribe la letra completa de esta grabación específica.
3. Si los acordes reales están documentados, escribe la tablatura en 'chords' con los acordes colocados en la línea superior sobre cada palabra y marca chordsAvailable: true.
4. Si no están documentados acordes verificables, coloca chordsAvailable: false y entrega la letra limpia en 'lyrics'.`;

  const SYSTEM_INSTRUCTION = `Eres un asistente de transcripción y estructuración musical que utiliza exclusivamente fuentes de cancioneros verificables (CifraClub, LaCuerda). Nunca inventes acordes ni alteres letras.`;

  const result = await callGeminiGeneric<GeminiSongResult>(
    prompt,
    SONG_RESULT_SCHEMA,
    SYSTEM_INSTRUCTION,
    0.0,
    signal
  );

  // Conservar siempre la metadata verificada seleccionada
  return {
    ...result,
    title: result.title || candidate.title,
    author: result.author || candidate.author,
    version: candidate.version,
    album: candidate.album,
    year: candidate.year,
    source: candidate.source,
    sourceUrl: candidate.sourceUrl,
    confidence: candidate.confidence,
    bpm: result.bpm || (candidate.bpm ? String(candidate.bpm) : undefined),
    originalKey: result.originalKey || candidate.originalKey || "",
  };
}

/**
 * Limpia y formatea un texto/letra crudo desordenado con acordes pegado por el usuario
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
    "Eres un formateador y estructurador de acordes y partituras de canciones cristianas. No inventes versos que no estén en el texto proporcionado.",
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
