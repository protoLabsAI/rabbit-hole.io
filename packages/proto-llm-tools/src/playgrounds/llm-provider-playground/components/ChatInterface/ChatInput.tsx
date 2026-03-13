import { Icon } from "@proto/icon-system";
import { Button, Textarea } from "@proto/ui/atoms";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  isLoading: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  isLoading,
}: ChatInputProps) {
  return (
    <div className="flex gap-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
        className="min-h-[60px] max-h-[120px]"
        disabled={isLoading}
      />
      <Button
        onClick={onSend}
        disabled={isLoading || !value.trim() || disabled}
        size="icon"
        className="h-[60px] w-[60px]"
      >
        <Icon name="Send" className="h-5 w-5" />
      </Button>
    </div>
  );
}
