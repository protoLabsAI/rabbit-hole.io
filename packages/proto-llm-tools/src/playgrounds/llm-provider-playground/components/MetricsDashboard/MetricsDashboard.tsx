import type { MetricsDashboardProps } from "../../types";

import { MetricCard } from "./MetricCard";

export function MetricsDashboard({
  totalTokens,
  avgResponseTime,
  messageCount,
}: MetricsDashboardProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <MetricCard
        title="Total Tokens"
        icon="Activity"
        value={totalTokens.toLocaleString()}
      />
      <MetricCard
        title="Avg Response"
        icon="Clock"
        value={avgResponseTime > 0 ? `${avgResponseTime.toFixed(0)}ms` : "-"}
      />
      <MetricCard title="Messages" icon="Zap" value={messageCount} />
    </div>
  );
}
