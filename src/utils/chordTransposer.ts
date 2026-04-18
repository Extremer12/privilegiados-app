const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const transposeChord = (chord: string, steps: number): string => {
  // Match the root note and optional modifier (m, 7, sus, etc.)
  const match = chord.match(/^([A-G][#b]?)(.*)/);
  if (!match) return chord;

  const [, root, modifier] = match;
  
  // Check if we're using sharps or flats
  const isFlat = root.includes('b');
  const noteArray = isFlat ? FLAT_NOTES : NOTES;
  
  // Find current note position
  let currentIndex = noteArray.indexOf(root);
  if (currentIndex === -1) {
    // Try converting between sharp and flat
    const altRoot = root.replace('#', 'b').replace('b', '#');
    currentIndex = noteArray.indexOf(altRoot);
    if (currentIndex === -1) return chord;
  }
  
  // Calculate new position
  let newIndex = (currentIndex + steps) % 12;
  if (newIndex < 0) newIndex += 12;
  
  return noteArray[newIndex] + modifier;
};

// Helper to check if a line is likely a chord line
const isChordLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  
  // Remove known chords and spaces. If very few other characters remain, it's a chord line
  const withoutChords = trimmed.replace(/\b([A-G][#b]?(?:m|maj|sus|dim|aug|add)?[0-9]*)\b/g, '').replace(/\s+/g, '');
  
  // If the line is mostly chords (less than 3 non-chord/non-space chars, like slashes or dashes), it's a chord line
  return withoutChords.length < 3 || (withoutChords.length / trimmed.length < 0.3);
};

export const transposeChords = (chordsText: string, steps: number): string => {
  // Split by lines and process each line
  return chordsText.split('\n').map(line => {
    // Only transpose if the line looks like a chord line
    if (isChordLine(line)) {
      return line.replace(/\b([A-G][#b]?(?:m|maj|sus|dim|aug|add)?[0-9]*)\b/g, (chord) => {
        return transposeChord(chord, steps);
      });
    }
    return line;
  }).join('\n');
};
