/**
 * Reciprocal Rank Fusion
 *
 * Fuses multiple ranked result lists into a single ranking.
 * k=60 is the standard default from the original RRF paper.
 */

export interface ScoredResult {
  uid: string;
  score: number;
}

export function reciprocalRankFusion(
  ...rankedLists: ScoredResult[][]
): ScoredResult[] {
  const K = 60;
  const scores: Record<string, number> = {};

  for (const list of rankedLists) {
    list.forEach((item, rank) => {
      scores[item.uid] = (scores[item.uid] ?? 0) + 1 / (K + rank + 1);
    });
  }

  return Object.entries(scores)
    .map(([uid, score]) => ({ uid, score }))
    .sort((a, b) => b.score - a.score);
}
