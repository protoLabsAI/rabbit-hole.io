/**
 * LLM Provider Playground - Metrics Calculator Utilities
 */

/**
 * Calculate average response time with new sample
 */
export function calculateAvgResponseTime(
  currentAvg: number,
  newTime: number,
  count: number
): number {
  if (count === 0) return newTime;
  return (currentAvg * count + newTime) / (count + 1);
}

/**
 * Calculate tokens per second
 */
export function calculateTokensPerSecond(
  tokens: number,
  timeMs: number
): number {
  if (timeMs === 0) return 0;
  return tokens / (timeMs / 1000);
}
