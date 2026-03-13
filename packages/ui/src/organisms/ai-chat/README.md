# AI Chat Components

Complete shadcn/ui-style components for building AI chat interfaces with CopilotKit headless UI.

## Overview

This collection provides production-ready React components for building ChatGPT-style interfaces with:

- **Streaming responses** with proper scroll management
- **Reasoning display** showing AI thought processes
- **Source citations** for transparency
- **Keyboard shortcuts** (Enter to send, Shift+Enter for newlines)
- **Full TypeScript support** with strict typing
- **Theme-aware styling** using CSS variables
- **Accessibility** with ARIA live regions and screen reader support

## Components

### 1. Conversation Components

Container for chat messages with automatic scroll management.

```tsx
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/app/components/ui/ai-conversation";

<Conversation>
  <ConversationContent>{/* Messages go here */}</ConversationContent>
  <ConversationScrollButton />
</Conversation>;
```

**Features:**

- Auto-scrolls to bottom during streaming
- Detects manual scrolling and disables auto-scroll
- Smart scroll restoration
- "Scroll to bottom" button when scrolled up

**Props:**

- `autoScrollThreshold?: number` - Distance from bottom (in pixels) to trigger auto-scroll (default: 50)

---

### 2. Message Components

Individual message display with role-based styling.

```tsx
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageBubble,
  MessageHeader,
  MessageTimestamp,
} from "@/app/components/ui/ai-message";

<Message role="user">
  <MessageAvatar src={user.imageUrl} name="User Name" />
  <MessageContent>
    <MessageHeader>
      User Name
      <MessageTimestamp timestamp={new Date()} />
    </MessageHeader>
    <MessageBubble>Message content here</MessageBubble>
  </MessageContent>
</Message>;
```

**Supported Roles:**

- `user` - Right-aligned with primary background
- `assistant` - Left-aligned with muted background
- `system` - Full-width with accent background

**MessageAvatar Props:**

- `src?: string` - Avatar image URL
- `name?: string` - User/assistant name
- `fallback?: React.ReactNode` - Custom fallback (defaults to User/Bot icon)

---

### 3. Prompt Input Components

Advanced input with keyboard shortcuts and loading states.

```tsx
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputToolbar,
  PromptInputActions,
} from "@/app/components/ui/ai-prompt-input";

<PromptInput
  value={input}
  onChange={setInput}
  onSubmit={handleSend}
  isLoading={isLoading}
>
  <PromptInputTextarea
    placeholder="Type a message..."
    maxRows={5}
    minRows={1}
  />
  <PromptInputToolbar>
    <PromptInputActions>{/* Additional action buttons */}</PromptInputActions>
    <PromptInputSubmit />
  </PromptInputToolbar>
</PromptInput>;
```

**Features:**

- Auto-resizing textarea
- Enter to submit, Shift+Enter for newlines
- Disabled during loading
- Submit button with loading spinner

**Props:**

- `value: string` - Input value (controlled)
- `onChange: (value: string) => void` - Change handler
- `onSubmit: () => void` - Submit handler
- `isLoading?: boolean` - Loading state
- `disabled?: boolean` - Disable input
- `selectedModel?: string` - Currently selected model ID
- `onModelChange?: (modelId: string) => void` - Model selection handler

#### Model Selector

Add AI model selection to your prompt input:

```tsx
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputToolbar,
  PromptInputActions,
  PromptInputModelSelect,
} from "@/app/components/ui/ai-prompt-input";

<PromptInput
  value={input}
  onChange={setInput}
  onSubmit={handleSend}
  selectedModel={model}
  onModelChange={setModel}
>
  <PromptInputTextarea placeholder="Ask anything..." />
  <PromptInputSubmit />
  <PromptInputToolbar>
    <PromptInputActions>
      <PromptInputModelSelect />
    </PromptInputActions>
  </PromptInputToolbar>
</PromptInput>;
```

**Model Selection Features:**

- Fetches models from `/api/models` endpoint
- Groups by provider and category
- Displays metadata badges (Free, Fast, etc.)
- Persists selection to localStorage
- Integrates with `@proto/llm-providers` configuration

**Custom Model Selector:**

```tsx
<PromptInputModelSelect
  value={model}
  onValueChange={setModel}
  provider="anthropic"  // Filter to specific provider
  category="smart"      // Filter to specific category
>
  <PromptInputModelSelectTrigger className="w-[240px]" />
  <PromptInputModelSelectContent />
</PromptInputModelSelect>
```

**Hooks:**

```tsx
// Fetch model data
const { models, loading, error, defaultModel } = useModelData({
  provider: "anthropic",
  category: "smart",
});

// Persist model selection
const { selectedModel, setSelectedModel } = useModelSelection("my-app-model");
```

---

### 4. Reasoning Components

Collapsible reasoning display for AI transparency.

```tsx
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
  ReasoningStep,
} from "@/app/components/ui/ai-reasoning";

<Reasoning isStreaming={isStreaming} defaultOpen={false}>
  <ReasoningTrigger label="AI Reasoning" />
  <ReasoningContent>
    <ReasoningStep step={1}>First, I'll analyze the question...</ReasoningStep>
    <ReasoningStep step={2}>
      Then, I'll search for relevant information...
    </ReasoningStep>
  </ReasoningContent>
</Reasoning>;
```

**Features:**

- Auto-expands during streaming
- Manual toggle after completion
- Numbered steps
- Collapsible with animation

**Props:**

- `isStreaming?: boolean` - Auto-expand when true
- `defaultOpen?: boolean` - Initial open state

---

### 5. Sources Components

Expandable source citations with automatic counting.

```tsx
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  SourceItem,
  type Source,
} from "@/app/components/ui/ai-sources";

const sources: Source[] = [
  {
    id: "1",
    title: "Source Title",
    url: "https://example.com",
    snippet: "Brief excerpt from source...",
    type: "Documentation",
  },
];

<Sources sources={sources} defaultOpen={false}>
  <SourcesTrigger count={sources.length} />
  <SourcesContent>
    {sources.map((source) => (
      <SourceItem key={source.id} source={source} />
    ))}
  </SourcesContent>
</Sources>;
```

**Source Interface:**

```typescript
interface Source {
  id: string;
  title: string;
  url?: string;
  snippet?: string;
  type?: string;
}
```

---

### 6. AI Loader

Loading indicators for AI processing states.

```tsx
import { AILoader } from "@/app/components/ui/ai-loader";

<AILoader variant="default" />
<AILoader variant="typing" />
<AILoader variant="spinner" />
```

**Variants:**

- `default` - Pulsing dot with text
- `typing` - Three animated dots
- `spinner` - Rotating loader

---

## Complete Example with CopilotKit Headless UI

```tsx
"use client";

import {
  useCopilotChatHeadless_c,
  useCopilotAction,
} from "@copilotkit/react-core";
import { useState, useEffect } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/app/components/ui/ai-conversation";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageBubble,
  MessageHeader,
  MessageTimestamp,
} from "@/app/components/ui/ai-message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputToolbar,
  PromptInputActions,
} from "@/app/components/ui/ai-prompt-input";
import { AILoader } from "@/app/components/ui/ai-loader";

export function ChatInterface() {
  const [input, setInput] = useState("");
  const [mounted, setMounted] = useState(false);

  const { messages, sendMessage, isLoading } = useCopilotChatHeadless_c({
    instructions: "You are a helpful AI assistant.",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Define custom action with generative UI
  useCopilotAction({
    name: "customAction",
    description: "Perform a custom action",
    parameters: [
      {
        name: "query",
        type: "string",
        description: "The query to process",
      },
    ],
    handler: async ({ query }) => {
      return `Processed: ${query}`;
    },
    render: ({ result, args, status }) => {
      if (status === "complete") {
        return (
          <div className="p-3 bg-primary/10 rounded-lg">
            <p>✅ {result}</p>
          </div>
        );
      }
      return <AILoader variant="typing" />;
    },
  });

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      sendMessage({
        id: Date.now().toString(),
        role: "user",
        content: input,
      });
      setInput("");
    }
  };

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.map((message) => (
            <Message key={message.id} role={message.role}>
              <MessageAvatar name={message.role === "user" ? "You" : "AI"} />
              <MessageContent>
                <MessageHeader>
                  {message.role === "user" ? "You" : "AI Assistant"}
                </MessageHeader>
                {message.content && (
                  <MessageBubble>{message.content}</MessageBubble>
                )}
                {message.role === "assistant" && message.generativeUI?.()}
              </MessageContent>
            </Message>
          ))}

          {isLoading && (
            <Message role="assistant">
              <MessageAvatar name="AI" />
              <MessageContent>
                <MessageHeader>AI Assistant</MessageHeader>
                <div className="py-2">
                  <AILoader variant="typing" />
                </div>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput
        value={input}
        onChange={setInput}
        onSubmit={handleSend}
        isLoading={isLoading}
      >
        <PromptInputTextarea placeholder="Type a message..." />
        <PromptInputToolbar>
          <PromptInputActions>
            <span className="text-xs text-muted-foreground">
              Press Enter to send
            </span>
          </PromptInputActions>
          <PromptInputSubmit />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}
```

## CopilotKit Integration

### Setup

1. Add your public license key to the CopilotKit provider:

```tsx
import { CopilotKit } from "@copilotkit/react-core";

<CopilotKit
  publicLicenseKey="your-public-license-key"
  runtimeUrl="/api/copilotkit"
  agent="your-agent-name"
>
  <YourApp />
</CopilotKit>;
```

2. Use the headless hook in your component:

```tsx
const {
  messages, // Array of messages
  sendMessage, // Send a new message
  isLoading, // Loading state
  suggestions, // Suggested responses
  generateSuggestions, // Generate new suggestions
  setSuggestions, // Set suggestions manually
} = useCopilotChatHeadless_c({
  instructions: "Your agent instructions...",
});
```

### Working with Actions

Define actions that can render custom UI:

```tsx
useCopilotAction({
  name: "actionName",
  description: "What this action does",
  parameters: [
    {
      name: "param1",
      type: "string",
      description: "Parameter description",
    },
  ],
  handler: async ({ param1 }) => {
    // Process the action
    return result;
  },
  render: ({ result, args, status }) => {
    // Render custom UI
    return <YourCustomComponent />;
  },
});
```

### Working with Suggestions

Generate or set suggestions programmatically:

```tsx
import { useCopilotChatSuggestions } from "@copilotkit/react-core";

// Generate suggestions automatically
useCopilotChatSuggestions({
  instructions: "Suggest 5 questions about...",
  maxSuggestions: 5,
});

// Or set them manually
useEffect(() => {
  setSuggestions([
    { title: "Question 1", message: "Ask about..." },
    { title: "Question 2", message: "Learn about..." },
  ]);
}, []);
```

## Styling

All components use CSS variables from your theme configuration:

- `--background`
- `--foreground`
- `--primary`
- `--primary-foreground`
- `--muted`
- `--muted-foreground`
- `--border`
- `--accent`
- `--accent-foreground`

Components automatically adapt to your theme's dark/light mode.

## Accessibility

- **Keyboard Navigation**: Full keyboard support with intuitive shortcuts
- **Screen Readers**: ARIA live regions for streaming content
- **Focus Management**: Proper focus handling during updates
- **Reduced Motion**: Respects `prefers-reduced-motion` settings
- **Touch Targets**: 44px minimum touch target sizes

## Performance

- **Optimized Re-renders**: Components use React.memo and proper memoization
- **Scroll Performance**: Efficient scroll tracking with throttled listeners
- **Message Streaming**: Character-by-character updates without re-render storms
- **Bundle Size**: ~15kb gzipped for all components

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- iOS Safari (latest 2 versions)
- Android Chrome (latest 2 versions)

## Related Documentation

- [CopilotKit Headless UI](https://docs.copilotkit.ai/coagents/headless-ui)
- [ResizableChatLayout](../layouts/README.md) - Layout wrapper for chat interfaces
- [shadcn/ui](https://ui.shadcn.com/) - Base component library

## Examples

See `ResizableChatLayout.stories.tsx` for interactive examples in Storybook:

```bash
pnpm storybook
```

## License

MIT
