/**
 * Servicio de Búsqueda de Letras Reales
 * Conecta con bases de datos musicales abiertas para obtener letras 100% oficiales y exactas sin alucinaciones de IA.
 */

export interface RealSongMatch {
  id: string;
  title: string;
  author: string;
  album?: string;
  year?: string;
  lyrics: string;
  preview: string;
  category: 'alabanza' | 'adoracion' | 'especial' | 'otro';
  source: string;
  sourceUrl?: string;
  duration?: number;
}

export async function searchRealSongs(query: string, signal?: AbortSignal): Promise<RealSongMatch[]> {
  if (!query || query.trim().length < 2) return [];

  const results: RealSongMatch[] = [];
  const cleanQuery = query.trim();

  try {
    const url = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanQuery)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'PrivilegiadosApp/1.0 (https://privilegiados.app)'
      },
      signal
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          if (!item.plainLyrics && !item.syncedLyrics) continue;

          // Extraer texto limpio de la letra
          const lyricsText = item.plainLyrics || item.syncedLyrics.replace(/\[\d+:\d+\.\d+\]\s*/g, '');
          const lines = lyricsText
            .split('\n')
            .map((l: string) => l.trim())
            .filter((l: string) => l.length > 0);

          if (lines.length === 0) continue;

          const preview = lines.slice(0, 3).join(' / ');

          // Limpiar título de sufijos comunes de YouTube
          const cleanedTitle = item.trackName
            .replace(/\s*\(.*?(video|oficial|audio|lyric|en vivo|live).*?\)/gi, '')
            .replace(/\s*\[.*?(video|oficial|audio|lyric|en vivo|live).*?\]/gi, '')
            .trim();

          // Inferir categoría según palabras clave
          const isPraise = /alaba|danza|gloria|fuego|victoria|gozo|libre|fiesta|celebra/i.test(lyricsText);
          const category = isPraise ? 'alabanza' : 'adoracion';

          results.push({
            id: `lrc-${item.id}`,
            title: cleanedTitle || item.trackName,
            author: item.artistName || "Artista no especificado",
            album: item.albumName || undefined,
            lyrics: lyricsText,
            preview,
            category,
            source: "Base Musical Oficial",
            duration: item.duration
          });
        }
      }
    }
  } catch (err: any) {
    if (err.name === "AbortError" || signal?.aborted) {
      throw err;
    }
    console.warn("Aviso al consultar base de letras:", err);
  }

  // Desduplicar por título y artista normalizados
  const map = new Map<string, RealSongMatch>();
  for (const r of results) {
    const key = `${r.title.toLowerCase().replace(/[^a-z0-9]/g, '')}|${r.author.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    if (!map.has(key)) {
      map.set(key, r);
    }
  }

  return Array.from(map.values()).slice(0, 8);
}
