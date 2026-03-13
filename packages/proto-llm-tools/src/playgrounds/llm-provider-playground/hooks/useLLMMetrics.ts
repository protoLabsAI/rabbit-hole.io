/**
 * useLLMMetrics Hook
 *
 * Manages LLM usage metrics tracking
 */

import { useState, useCallback } from "react";

import { calculateAvgResponseTime } from "../utils/metrics-calculator";

export interface UseLLMMetricsReturn {
  totalTokens: number;
  avgResponseTime: number;
  messageCount: number;
  recordMetrics: (tokensUsed: number, responseTime: number) => void;
  resetMetrics: () => void;
}

export function useLLMMetrics(): UseLLMMetricsReturn {
  const [totalTokens, setTotalTokens] = useState(0);
  const [avgResponseTime, setAvgResponseTime] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  const recordMetrics = useCallback(
    (tokensUsed: number, responseTime: number) => {
      setTotalTokens((prev) => prev + tokensUsed);
      setMessageCount((prev) => {
        const newCount = prev + 1;
        setAvgResponseTime((prevAvg) =>
          calculateAvgResponseTime(prevAvg, responseTime, prev)
        );
        return newCount;
      });
    },
    []
  );

  const resetMetrics = useCallback(() => {
    setTotalTokens(0);
    setAvgResponseTime(0);
    setMessageCount(0);
  }, []);

  return {
    totalTokens,
    avgResponseTime,
    messageCount,
    recordMetrics,
    resetMetrics,
  };
}
