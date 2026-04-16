import { Button } from "@protolabsai/ui/atoms";

export interface ExampleCardProps {
  title: string;
  text: string;
  prompt: string;
  examples?: string;
  onApply: (text: string, prompt: string, examples?: string) => void;
}

export function ExampleCard({
  title,
  text,
  prompt,
  examples,
  onApply,
}: ExampleCardProps) {
  return (
    <div className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors">
      <h4 className="font-semibold text-sm">{title}</h4>
      <p className="text-xs text-muted-foreground line-clamp-2">{text}</p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onApply(text, prompt, examples)}
        className="w-full"
      >
        Try This Example
      </Button>
    </div>
  );
}
