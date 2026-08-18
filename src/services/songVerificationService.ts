/**
 * Servicio de Verificación e Identificación de Canciones Musicales
 * Arquitectura basada en verificación de fuentes, normalización y desambiguación.
 * REGLA DE ORO: FUENTE VERIFICABLE > MEMORIA DEL MODELO.
 */

export interface VerifiedSongVersion {
  title: string;
  author: string;
  version?: string;
  album?: string;
  year?: string;
  originalKey?: string;
  bpm?: number;
  category: 'alabanza' | 'adoracion' | 'especial' | 'otro';
  source: string;
  sourceUrl?: string;
  preview: string;
  confidence: number;
  reason?: string;
}

export interface SongVerificationResponse {
  found: boolean;
  message?: string;
  results: VerifiedSongVersion[];
}

export interface VerificationSearchParams {
  title: string;
  author?: string;
  youtubeUrl?: string;
  referenceUrl?: string;
  lyricsSnippet?: string;
  targetKey?: string;
  signal?: AbortSignal;
}

export const MIN_CONFIDENCE = 0.80;

export const ALLOWED_DOMAINS = [
  "cifraclub.com",
  "lacuerda.net",
  "letras.com",
  "youtube.com",
  "youtu.be",
  "music.youtube.com",
  "genius.com",
  "songselect.ccli.com",
  "spotify.com"
];

/**
 * Valida si una URL pertenece a un dominio permitido y seguro
 */
export function isAllowedSource(url?: string): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    return ALLOWED_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

/**
 * Normaliza cadenas de texto para comparaciones de identidad
 */
export function normalizeString(str?: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remover tildes
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Elimina duplicados fusionando fuentes coincidentes
 */
export function deduplicateResults(results: VerifiedSongVersion[]): VerifiedSongVersion[] {
  const map = new Map<string, VerifiedSongVersion>();

  for (const item of results) {
    const normTitle = normalizeString(item.title);
    const normAuthor = normalizeString(item.author);
    const normVersion = normalizeString(item.version || "");
    const key = `${normTitle}|${normAuthor}|${normVersion}`;

    if (!map.has(key)) {
      map.set(key, { ...item });
    } else {
      const existing = map.get(key)!;
      // Conservar el que tenga mayor confianza o mejor URL
      if (item.confidence > existing.confidence) {
        map.set(key, { ...item, source: existing.source ? `${existing.source}, ${item.source}` : item.source });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Ordena resultados por nivel de confianza y relevancia
 */
export function rankResults(results: VerifiedSongVersion[]): VerifiedSongVersion[] {
  return [...results].sort((a, b) => b.confidence - a.confidence);
}

const SYSTEM_INSTRUCTION_VERIFIER = `Eres un asistente de verificación e identificación de canciones cristianas.

NO eres una base de datos de letras.

Tu trabajo es identificar versiones reales de canciones utilizando información verificable proporcionada por fuentes externas.

REGLAS ABSOLUTAS:
1. Nunca inventes información.
2. Nunca reconstruyas una canción desde memoria.
3. Nunca completes una letra que no hayas podido verificar.
4. Nunca mezcles letras entre artistas.
5. Nunca mezcles versiones, traducciones, covers o grabaciones diferentes.
6. El título por sí solo nunca es suficiente para identificar una versión.
7. Diferencia siempre entre artista, versión, álbum, año y grabación.
8. Usa las fuentes externas disponibles (CifraClub, LaCuerda, Letras.com, grabaciones discográficas) como fuente principal de verdad.
9. Si una fuente contradice a otra, no inventes una solución. Indica la contradicción.
10. Si no existe evidencia suficiente, devuelve found: false y results: [].
11. No inventes acordes.
12. No inventes tonalidades si no están documentadas.
13. No inventes BPM si no está documentado.
14. No inventes álbumes.
15. No inventes fragmentos de letra. Si no conoces el fragmento exacto, escribe 'Fragmento no disponible'.
16. Devuelve siempre la fuente y URL cuando estén disponibles.
17. Solo devuelve información que pueda ser respaldada por las fuentes.
18. Mantén separadas las distintas versiones de una canción.
19. La confianza (confidence entre 0.0 y 1.0) debe representar la calidad real de la evidencia.
20. No conviertas una coincidencia probable en una coincidencia confirmada.

Tu función principal es VERIFICAR, DESAMBIGUAR y NORMALIZAR resultados, no generar contenido musical de memoria.`;

const VERIFICATION_JSON_SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean", description: "Indica si se encontraron versiones verificables" },
    message: { type: "string", description: "Mensaje explicativo si no hay resultados o contexto adicional" },
    results: {
      type: "array",
      description: "Lista de versiones identificadas y verificadas",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título oficial verificado" },
          author: { type: "string", description: "Artista, ministerio o intérprete oficial" },
          version: { type: "string", description: "Versión específica (ej: Versión en Vivo, Acústica, Original)" },
          album: { type: "string", description: "Álbum documentado donde fue grabada" },
          year: { type: "string", description: "Año de lanzamiento verificado" },
          originalKey: { type: "string", description: "Tonalidad original documentada (ej: G, D, Em)" },
          bpm: { type: "number", description: "Tempo o BPM aproximado" },
          category: { 
            type: "string", 
            enum: ["alabanza", "adoracion", "especial", "otro"],
            description: "Categoría de la canción" 
          },
          source: { type: "string", description: "Fuente verificada (ej: CifraClub, LaCuerda, Letras.com, Discografía Oficial)" },
          sourceUrl: { type: "string", description: "URL de la fuente si es conocida" },
          preview: { type: "string", description: "2 a 3 líneas del coro o estrofa LITERAL verificada, o 'Fragmento no disponible'" },
          confidence: { type: "number", description: "Nivel de certeza de la versión (0.0 a 1.0)" },
          reason: { type: "string", description: "Breve explicación de la verificación" }
        },
        required: ["title", "author", "preview", "confidence", "source", "category"]
      }
    }
  },
  required: ["found", "results"]
};

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
];

/**
 * Busca y desambigua versiones reales de una canción con estricta verificación
 */
export async function findSongVersions(params: VerificationSearchParams): Promise<SongVerificationResponse> {
  const { title, author, youtubeUrl, referenceUrl, lyricsSnippet, signal } = params;

  if (!title?.trim() && !youtubeUrl?.trim() && !referenceUrl?.trim()) {
    return {
      found: false,
      message: "Se requiere al menos un título o enlace para verificar.",
      results: []
    };
  }

  const prompt = `Identifica y verifica las versiones reales de canciones cristianas asociadas a:
- Título buscado: "${title.trim()}"
${author?.trim() ? `- Artista / Intérprete sugerido: "${author.trim()}"` : ''}
${youtubeUrl?.trim() ? `- Video de YouTube: "${youtubeUrl.trim()}"` : ''}
${referenceUrl?.trim() ? `- Enlace de Referencia Web: "${referenceUrl.trim()}"` : ''}
${lyricsSnippet?.trim() ? `- Fragmento de letra aportado por usuario: "${lyricsSnippet.trim()}"` : ''}

CONSULTAS DE FUENTES A VERIFICAR:
- site:cifraclub.com "${title.trim()}" ${author ? `"${author.trim()}"` : ''}
- site:lacuerda.net "${title.trim()}" ${author ? `"${author.trim()}"` : ''}
- site:letras.com "${title.trim()}" ${author ? `"${author.trim()}"` : ''}

CRITERIOS DE IDENTIFICACIÓN Y DESAMBIGUACIÓN:
1. Si existen distintas canciones o grabaciones emblemáticas con este título (ej. "Hosanna" de Marco Barrientos vs "Hosanna" de Hillsong United vs "Hosanna" de Miel San Marcos), lista CADA UNA de manera aislada como un resultado separado.
2. NO mezcles fragmentos de letras entre canciones distintas.
3. El campo 'preview' debe ser el coro o estrofa LITERAL verificado de esa versión particular. Si no puedes confirmar el fragmento exacto, pon 'Fragmento no disponible'.
4. Asigna 'confidence' >= 0.85 solo si la versión corresponde a una grabación o tablatura real de catálogo cristiano. Si es dudosa, pon confidence < 0.80.
5. Si no existe ninguna canción con este título en cancioneros oficiales, devuelve found: false y results: [].`;

  console.log(`[DEBUG] SEARCH QUERY: "${title}" | Author: "${author || 'N/A'}"`);

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

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: timeoutController.signal,
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_INSTRUCTION_VERIFIER }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            response_mime_type: "application/json",
            response_schema: VERIFICATION_JSON_SCHEMA,
            temperature: 0.0,
          }
        })
      });

      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener('abort', handleUserAbort);
      }

      if (!response.ok) {
        console.warn(`[DEBUG] Error HTTP ${response.status} en modelo ${model}`);
        continue;
      }

      const data = await response.json();
      const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textOutput) continue;

      const parsed: SongVerificationResponse = JSON.parse(textOutput);

      if (!parsed.found || !parsed.results || parsed.results.length === 0) {
        console.log(`[DEBUG] No se encontraron resultados verificables para: "${title}"`);
        return {
          found: false,
          message: parsed.message || "No se pudo verificar una versión exacta de esta canción en cancioneros oficiales.",
          results: []
        };
      }

      // Filtrar por MIN_CONFIDENCE y validar URLs
      const accepted: VerifiedSongVersion[] = [];
      const rejected: { title: string; confidence: number; reason: string }[] = [];

      for (const res of parsed.results) {
        const hasMinConfidence = typeof res.confidence === "number" && res.confidence >= MIN_CONFIDENCE;
        
        // Si tiene sourceUrl, verificar si es de dominio permitido
        if (res.sourceUrl && !isAllowedSource(res.sourceUrl)) {
          // Descartar URL sospechosa pero mantener la fuente textual si tiene alta confianza
          res.sourceUrl = undefined;
        }

        if (hasMinConfidence) {
          accepted.push(res);
        } else {
          rejected.push({
            title: `${res.title} - ${res.author}`,
            confidence: res.confidence,
            reason: res.reason || "Confianza por debajo del umbral mínimo (0.80)"
          });
        }
      }

      if (rejected.length > 0) {
        console.log(`[DEBUG] REJECTED RESULTS:`, rejected);
      }

      const deduplicated = deduplicateResults(accepted);
      const ranked = rankResults(deduplicated);

      console.log(`[DEBUG] SOURCES FOUND: ${ranked.length} versiones verificadas`);
      ranked.forEach(r => {
        console.log(`[DEBUG] NORMALIZED: "${r.title}" | Artist: "${r.author}" | Conf: ${r.confidence} | Source: ${r.source}`);
      });

      if (ranked.length === 0) {
        return {
          found: false,
          message: "Los resultados encontrados no alcanzaron el umbral mínimo de verificación.",
          results: []
        };
      }

      return {
        found: true,
        results: ranked
      };
    } catch (err: any) {
      if (err.name === "AbortError" || signal?.aborted) {
        throw err;
      }
      console.warn(`[DEBUG] Intento fallido en ${model}:`, err.message);
    }
  }

  throw new Error("No se pudo contactar el servicio de verificación. Intenta nuevamente.");
}
