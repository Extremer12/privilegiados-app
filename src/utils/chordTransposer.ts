/**
 * Utility for Transposing, Converting Notation (Anglo/Latin) and Cleaning Chords & Lyrics.
 */

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const LATIN_NOTES: Record<string, string> = {
  'C': 'Do',
  'C#': 'Do#',
  'Db': 'Reb',
  'D': 'Re',
  'D#': 'Re#',
  'Eb': 'Mib',
  'E': 'Mi',
  'F': 'Fa',
  'F#': 'Fa#',
  'Gb': 'Solb',
  'G': 'Sol',
  'G#': 'Sol#',
  'Ab': 'Lab',
  'A': 'La',
  'A#': 'La#',
  'Bb': 'Sib',
  'B': 'Si',
};

const ANGLO_NOTES: Record<string, string> = {
  'DO': 'C',
  'DO#': 'C#',
  'REB': 'Db',
  'RE': 'D',
  'RE#': 'D#',
  'MIB': 'Eb',
  'MI': 'E',
  'FA': 'F',
  'FA#': 'F#',
  'SOLB': 'Gb',
  'SOL': 'G',
  'SOL#': 'G#',
  'LAB': 'Ab',
  'LA': 'A',
  'LA#': 'A#',
  'SIB': 'Bb',
  'SI': 'B',
};

export type ChordNotation = 'anglo' | 'latin';

/**
 * Transposes a single Anglo chord by N semitone steps.
 */
export const transposeChord = (chord: string, steps: number): string => {
  if (steps === 0) return chord;

  // Check if it's a slash chord like G/B
  if (chord.includes('/')) {
    const [main, bass] = chord.split('/');
    return `${transposeChord(main, steps)}/${transposeChord(bass, steps)}`;
  }

  // Match root note and modifier (m, 7, sus, etc.)
  const match = chord.match(/^([A-G][#b]?)(.*)/);
  if (!match) return chord;

  const [, root, modifier] = match;
  const isFlat = root.includes('b');
  const noteArray = isFlat ? FLAT_NOTES : NOTES;

  let currentIndex = noteArray.indexOf(root);
  if (currentIndex === -1) {
    const altRoot = root.replace('#', 'b').replace('b', '#');
    currentIndex = noteArray.indexOf(altRoot);
    if (currentIndex === -1) return chord;
  }

  let newIndex = (currentIndex + steps) % 12;
  if (newIndex < 0) newIndex += 12;

  return noteArray[newIndex] + modifier;
};

/**
 * Converts a single chord between Anglo (C, D, Em) and Latin (Do, Re, Mim).
 */
export const convertSingleChord = (chord: string, targetNotation: ChordNotation): string => {
  if (!chord) return chord;

  // Handle slash chords like G/B or Sol/Si
  if (chord.includes('/')) {
    const parts = chord.split('/');
    return parts.map(p => convertSingleChord(p, targetNotation)).join('/');
  }

  if (targetNotation === 'latin') {
    // Anglo -> Latin (e.g., C#m7 -> Do#m7, Em -> Mim)
    const match = chord.match(/^([A-G][#b]?)(.*)/);
    if (!match) return chord;
    const [, root, mod] = match;
    const latinRoot = LATIN_NOTES[root] || root;
    return `${latinRoot}${mod}`;
  } else {
    // Latin -> Anglo (e.g., Do#m7 -> C#m7, Mim -> Em, Sol -> G)
    const match = chord.match(/^(Do#|Reb|Re#|Mib|Fa#|Solb|Sol#|Lab|La#|Sib|Do|Re|Mi|Fa|Sol|La|Si)(.*)/i);
    if (!match) return chord;
    const [, latinRoot, mod] = match;
    const angloRoot = ANGLO_NOTES[latinRoot.toUpperCase()] || latinRoot;
    return `${angloRoot}${mod}`;
  }
};

/**
 * Regex identifying chord lines in both Anglo and Latin notations.
 */
export const CHORD_REGEX_ANGLO = /\b([A-G][b#]?(?:2|4|5|6|7|9|11|13|maj|min|sus|dim|aug|add|m)?(?:\d)?(?:\/[A-G][b#]?)?)\b/g;
export const CHORD_REGEX_LATIN = /\b((?:Do#|Reb|Re#|Mib|Fa#|Solb|Sol#|Lab|La#|Sib|Do|Re|Mi|Fa|Sol|La|Si)(?:2|4|5|6|7|9|11|13|maj|min|menor|sus|dim|aug|add|m)?(?:\d)?(?:\/(?:Do#|Reb|Re#|Mib|Fa#|Solb|Sol#|Lab|La#|Sib|Do|Re|Mi|Fa|Sol|La|Si))?)\b/gi;

/**
 * Checks if a line consists predominantly of chords (Anglo or Latin) or section tags.
 */
export const isChordLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Section headers like [Coro], [Verso 1] are not chord lines
  if (/^\[.*\]$/.test(trimmed)) return false;

  // Test strict Anglo chord line
  const isStrictAnglo = /^[A-G][b#]?(?:2|4|5|6|7|9|11|13|maj|min|sus|dim|aug|add|m)?(?:\d)?(?:\/[A-G][b#]?)?(?:\s+[A-G][b#]?(?:2|4|5|6|7|9|11|13|maj|min|sus|dim|aug|add|m)?(?:\d)?(?:\/[A-G][b#]?)?)*\s*$/.test(trimmed);
  if (isStrictAnglo) return true;

  // Test Latin chord line
  const isStrictLatin = /^(?:Do#|Reb|Re#|Mib|Fa#|Solb|Sol#|Lab|La#|Sib|Do|Re|Mi|Fa|Sol|La|Si)(?:2|4|5|6|7|9|11|13|maj|min|menor|sus|dim|aug|add|m)?(?:\d)?(?:\/(?:Do#|Reb|Re#|Mib|Fa#|Solb|Sol#|Lab|La#|Sib|Do|Re|Mi|Fa|Sol|La|Si))?(?:\s+(?:Do#|Reb|Re#|Mib|Fa#|Solb|Sol#|Lab|La#|Sib|Do|Re|Mi|Fa|Sol|La|Si)(?:2|4|5|6|7|9|11|13|maj|min|menor|sus|dim|aug|add|m)?(?:\d)?(?:\/(?:Do#|Reb|Re#|Mib|Fa#|Solb|Sol#|Lab|La#|Sib|Do|Re|Mi|Fa|Sol|La|Si))?)*\s*$/i.test(trimmed);
  if (isStrictLatin) return true;

  // Relaxed density check
  const withoutChords = trimmed
    .replace(CHORD_REGEX_ANGLO, '')
    .replace(CHORD_REGEX_LATIN, '')
    .replace(/[\s/\\|#b\d\-_()]/g, '');

  return withoutChords.length === 0 || (withoutChords.length / trimmed.length < 0.25);
};

/**
 * Transposes entire song chord sheet by N semitone steps.
 */
export const transposeChords = (chordsText: string, steps: number): string => {
  if (steps === 0) return chordsText;

  return chordsText
    .split('\n')
    .map(line => {
      if (isChordLine(line)) {
        return line.replace(CHORD_REGEX_ANGLO, (chord) => transposeChord(chord, steps));
      }
      return line;
    })
    .join('\n');
};

/**
 * Converts all chords in a text to Anglo (C, D, Em) or Latin (Do, Re, Mim).
 */
export const convertChordsNotation = (chordsText: string, targetNotation: ChordNotation): string => {
  return chordsText
    .split('\n')
    .map(line => {
      if (isChordLine(line)) {
        if (targetNotation === 'latin') {
          return line.replace(CHORD_REGEX_ANGLO, (chord) => convertSingleChord(chord, 'latin'));
        } else {
          return line.replace(CHORD_REGEX_LATIN, (chord) => convertSingleChord(chord, 'anglo'));
        }
      }
      return line;
    })
    .join('\n');
};

/**
 * Strips out chord lines to leave clean lyrics with section headers intact.
 */
export const extractCleanLyrics = (content: string): string => {
  if (!content) return "";

  const lines = content.split('\n');
  const cleanLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (cleanLines.length > 0 && cleanLines[cleanLines.length - 1] !== "") {
        cleanLines.push("");
      }
      continue;
    }

    // Keep section tags [Verso 1], [Coro], etc.
    if (/^\[.*\]$/.test(trimmed)) {
      if (cleanLines.length > 0 && cleanLines[cleanLines.length - 1] !== "") {
        cleanLines.push("");
      }
      cleanLines.push(trimmed);
      continue;
    }

    // Skip chord lines
    if (isChordLine(line)) {
      continue;
    }

    cleanLines.push(line);
  }

  return cleanLines.join('\n').trim();
};
