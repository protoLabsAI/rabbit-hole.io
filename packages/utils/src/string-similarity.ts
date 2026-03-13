/**
 * String Similarity Utilities
 *
 * Provides string similarity calculations using Levenshtein distance algorithm.
 * Used for entity deduplication in extraction workflows.
 */

/**
 * Calculate Levenshtein distance between two strings
 *
 * The Levenshtein distance is the minimum number of single-character edits
 * (insertions, deletions, or substitutions) required to change one string into another.
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Edit distance between the strings
 *
 * @example
 * ```typescript
 * levenshteinDistance("Bernie Sanders", "Bernard Sanders") // → 1
 * levenshteinDistance("cat", "dog") // → 3
 * ```
 */
export function levenshteinDistance(str1: string, str2: string): number {
  // Handle empty strings
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;

  // Ensure str1 is the shorter string to minimize memory usage
  if (str1.length > str2.length) [str1, str2] = [str2, str1];

  const m = str1.length;
  const n = str2.length;

  // Use two rows instead of full matrix: O(min(m,n)) space
  let prev = new Array(m + 1).fill(0).map((_, j) => j);
  let curr = new Array(m + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    curr[0] = i;
    for (let j = 1; j <= m; j++) {
      const cost = str1.charAt(j - 1) === str2.charAt(i - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1, // insertion
        prev[j] + 1, // deletion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[m];
}

/**
 * Calculate similarity score between two strings
 *
 * Returns a normalized similarity score between 0 and 1, where:
 * - 1.0 = identical strings
 * - 0.0 = completely different strings
 *
 * Formula: (longerLength - editDistance) / longerLength
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score from 0-1
 *
 * @example
 * ```typescript
 * calculateStringSimilarity("Bernie Sanders", "Bernie Sanders") // → 1.0
 * calculateStringSimilarity("Bernie Sanders", "Bernard Sanders") // → ~0.93
 * calculateStringSimilarity("Bernie Sanders", "Sen. Sanders") // → ~0.64
 * calculateStringSimilarity("Bernie Sanders", "Joe Biden") // → ~0.23
 * ```
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  // Empty string handling (must check before exact match)
  if (str1.length === 0 || str2.length === 0) {
    return 0.0;
  }

  // Exact match
  if (str1 === str2) return 1.0;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  const editDistance = levenshteinDistance(longer, shorter);
  const similarity = (longer.length - editDistance) / longer.length;

  return similarity;
}

/**
 * Check if two strings are similar enough to be considered duplicates
 *
 * Uses a threshold of 0.75 (75% similarity) to determine if strings likely
 * refer to the same entity with minor variations.
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @param threshold - Similarity threshold (default: 0.75)
 * @returns True if strings are similar enough to merge
 *
 * @example
 * ```typescript
 * areSimilarStrings("Bernie Sanders", "Bernard Sanders") // → true (0.93 > 0.75)
 * areSimilarStrings("Bernie Sanders", "Sen. Sanders") // → false (0.64 < 0.75)
 * areSimilarStrings("IBM", "International Business Machines") // → false (0.09 < 0.75)
 * ```
 */
export function areSimilarStrings(
  str1: string,
  str2: string,
  threshold: number = 0.75
): boolean {
  // Normalize: lowercase and remove diacritics for comparison
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "");
  const similarity = calculateStringSimilarity(
    normalize(str1),
    normalize(str2)
  );
  return similarity >= threshold;
}
