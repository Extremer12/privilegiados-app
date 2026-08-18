import {
  RealSongMatch,
  searchRealSongs
} from "./lyricsApiService";

export type { RealSongMatch };
export { searchRealSongs };

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
    found: { type: "boolean", description: "Indica si la estructuración fue exitosa" },
    message: { type: "string", description: "Mensaje explicativo o advertencias" },
    title: { type: "string", description: "Título oficial de la canción" },
    author: { type: "string", description: "Artista o ministerio" },
    category: { 
      type: "string", 
      enum: ["alabanza", "adoracion", "especial", "otro"],
      description: "Categoría de la canción" 
    },
    originalKey: { type: "string", description: "Tonalidad original de la canción (ej: G, D, C, Em)" },
    bpm: { type: "string", description: "Tempo o BPM estimado (ej: 70 BPM)" },
    lyrics: { type: "string", description: "Letra estructurada con [Verso 1], [Coro], [Puente], etc. SIN cambiar palabras" },
    chords: { type: "string", description: "Letra con acordes reales alineados en líneas superiores sobre cada sílaba" },
    chordsAvailable: { type: "boolean", description: "Indica si se colocaron acordes reales" },
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
      throw new DOMException("Operación cancelada por el usuario.", "AbortError");
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 20000);

      const handleUserAbort = () => timeoutController.abort();
      if (signal) {
        signal.addEventListener('abort', handleUserAbort, { once: true });
      }

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
      if (signal?.aborted) {
        throw new DOMException("Operación cancelada.", "AbortError");
      }
      console.warn(`[DEBUG] Intento fallido en ${model}:`, fetchErr.message);
      lastError = fetchErr;
    }
  }

  throw lastError || new Error("No se pudo conectar con el asistente. Intenta nuevamente.");
}

/**
 * Estructura la letra real descargada de la API musical y le agrega acordes y etiquetas sin modificar el texto
 */
export async function structureRealSongWithChords({
  songMatch,
  targetKey,
  chordNotation = "anglo",
  youtubeUrlOverride,
  signal,
}: {
  songMatch: RealSongMatch;
  targetKey?: string;
  chordNotation?: "anglo" | "latin";
  youtubeUrlOverride?: string;
  signal?: AbortSignal;
}): Promise<GeminiSongResult> {
  const finalYoutube = youtubeUrlOverride?.trim() || songMatch.sourceUrl?.trim() || "";

  const prompt = `Tienes la letra OFICIAL Y REAL obtenida de la base musical para la canción:
- Título: "${songMatch.title}"
- Artista: "${songMatch.author}"
${songMatch.album ? `- Álbum: "${songMatch.album}"` : ''}

LETRA REAL PROPORCIONADA:
---
${songMatch.lyrics}
---

${targetKey && targetKey !== "Original" ? `- Tonalidad solicitada: Transportar todos los acordes a la tonalidad de ${targetKey}.` : '- Tonalidad: Usar la tonalidad original oficial.'}
${chordNotation === "latin" ? '- Sistema de acordes: Escribir los acordes en NOTACIÓN EN ESPAÑOL (ej: Do, Rem, Mim, Fa#m, Sol, Lam, Si7, Sol/Si, Do/Mi).' : '- Sistema de acordes: Escribir los acordes en notación cifrada estándar (C, Dm, Em, F#m, G, Am, B7, G/B, C/E).'}

REGLAS DE ORO:
1. CONSERVA LA LETRA EXACTA: NO inventes estrofas, no sustituyas palabras ni modifiques el texto de la letra proporcionada.
2. ESTRUCTURA: Agrega etiquetas limpias [Intro], [Verso 1], [Verso 2], [Pre-Coro], [Coro], [Puente], [Final].
3. ACORDES: En el campo 'chords', coloca los acordes reales en la línea superior alineados exactamente sobre las sílabas donde se tocan.
4. Identifica la tonalidad original y tempo (BPM) aproximado.`;

  const SYSTEM_INSTRUCTION = `Eres un formateador y transcriptor musical experto para cancioneros de alabanza cristiana. Tu trabajo es estructurar la letra dada y agregar los acordes reales sin alterar ninguna palabra del texto original. Puedes usar tanto cifrado inglés (C, D, Em) como cifrado en español (Do, Re, Mim, Lam) según se solicite.`;

  const result = await callGeminiGeneric<GeminiSongResult>(
    prompt,
    SONG_RESULT_SCHEMA,
    SYSTEM_INSTRUCTION,
    0.0,
    signal
  );

  return {
    ...result,
    title: result.title || songMatch.title,
    author: result.author || songMatch.author,
    album: songMatch.album,
    source: songMatch.source,
    youtubeUrl: finalYoutube || result.youtubeUrl,
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
