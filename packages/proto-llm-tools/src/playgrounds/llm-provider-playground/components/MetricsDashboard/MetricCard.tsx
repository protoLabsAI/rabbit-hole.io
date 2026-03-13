import { Icon } from "@proto/icon-system";
import { Card, CardContent, CardHeader, CardTitle } from "@proto/ui/atoms";

interface MetricCardProps {
  title: string;
  icon: string;
  value: string | number;
  className?: string;
}

export function MetricCard({ title, icon, value, className }: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon name={icon} className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
