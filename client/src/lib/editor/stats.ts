export interface DocumentStats {
  charCount: number;
  wordCount: number;
  readingTimeMinutes: number;
}

export function countWordsFast(text: string): number {
  let count = 0;
  let inWord = false;

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (
      code === 32 ||
      code === 9 ||
      code === 10 ||
      code === 13 ||
      code === 12 ||
      code === 11 ||
      code === 160
    ) {
      inWord = false;
    } else if (!inWord) {
      count += 1;
      inWord = true;
    }
  }

  return count;
}

export function getDocumentStats(text: string): DocumentStats {
  const wordCount = countWordsFast(text);
  return {
    charCount: text.length,
    wordCount,
    readingTimeMinutes: Math.ceil(wordCount / 200)
  };
}
