# Migration Guide: CopilotChat to Headless UI

## Overview

The ResearchChatInterface has been updated from using CopilotKit's default `<CopilotChat>` component to a fully custom headless UI implementation using shadcn/ui components.

## What Changed

### Before (Old Implementation)

```tsx
"use client";

import { CopilotChat } from "@copilotkit/react-ui";

export function ResearchChatInterface() {
  return (
    <CopilotChat
      instructions="You are a research agent..."
      labels={{
        title: "Research Agent",
        initial: "Hi! I'm your research agent...",
        placeholder: "Start researching...",
      }}
      className="h-full"
    />
  );
}
```

**Limitations:**

- Limited customization of UI
- No control over message rendering
- Can't add custom features like reasoning or sources
- Styling requires CSS overrides
- No TypeScript support for message structure

### After (New Implementation)

```tsx
"use client";

import {
  useCopilotChatHeadless_c,
  useCopilotAction,
} from "@copilotkit/react-core";
import { Conversation, Message, PromptInput } from "@/app/components/ui";

export function ResearchChatInterface() {
  const { messages, sendMessage, isLoading } = useCopilotChatHeadless_c({
    instructions: "You are a research agent...",
  });

  return (
    <div className="flex flex-col h-full">
      <Conversation className="flex-1">
        {/* Full control over message rendering */}
      </Conversation>
      <PromptInput />
    </div>
  );
}
```

**Benefits:**

- Complete UI control
- Custom message rendering
- Built-in reasoning and source components
- Full TypeScript support
- Theme-aware styling
- Better accessibility
- Generative UI support

## Breaking Changes

### 1. Import Changes

**Before:**

```tsx
import { CopilotChat } from "@copilotkit/react-ui";
```

**After:**

```tsx
import {
  useCopilotChatHeadless_c,
  useCopilotAction,
} from "@copilotkit/react-core";
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
} from "@/app/components/ui/ai-message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/app/components/ui/ai-prompt-input";
```

### 2. Hook Usage

**Before:**

```tsx
// No hook needed, CopilotChat handles everything
<CopilotChat {...props} />
```

**After:**

```tsx
const {
  messages, // Array of messages
  sendMessage, // Function to send messages
  isLoading, // Loading state
} = useCopilotChatHeadless_c({
  instructions: "Your instructions...",
});
```

### 3. Message Rendering

**Before:**

```tsx
// Messages rendered automatically by CopilotChat
```

**After:**

```tsx
{
  messages.map((message) => (
    <Message key={message.id} role={message.role}>
      <MessageAvatar name={message.role === "user" ? "You" : "AI"} />
      <MessageContent>
        <MessageBubble>{message.content}</MessageBubble>
      </MessageContent>
    </Message>
  ));
}
```

### 4. Input Handling

**Before:**

```tsx
// Input handled automatically
```

**After:**

```tsx
const [input, setInput] = useState("");

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

<PromptInput
  value={input}
  onChange={setInput}
  onSubmit={handleSend}
  isLoading={isLoading}
>
  <PromptInputTextarea />
  <PromptInputSubmit />
</PromptInput>;
```

## New Features Available

### 1. Reasoning Display

Show AI thought processes:

```tsx
{
  message.reasoning && (
    <Reasoning isStreaming={message.isStreaming}>
      <ReasoningTrigger />
      <ReasoningContent>
        <ReasoningStep>{message.reasoning}</ReasoningStep>
      </ReasoningContent>
    </Reasoning>
  );
}
```

### 2. Source Citations

Display sources with automatic counting:

```tsx
{
  message.sources && message.sources.length > 0 && (
    <Sources sources={message.sources}>
      <SourcesTrigger count={message.sources.length} />
      <SourcesContent>
        {message.sources.map((source) => (
          <SourceItem key={source.id} source={source} />
        ))}
      </SourcesContent>
    </Sources>
  );
}
```

### 3. Generative UI

Render custom UI for tool calls:

```tsx
useCopilotAction({
  name: "researchEntity",
  handler: async ({ entityName, entityType }) => {
    return `Researching ${entityType}: ${entityName}`;
  },
  render: ({ result, args, status }) => {
    return (
      <div className="p-3 bg-primary/10 rounded-lg">
        <Sparkles className="h-4 w-4" />
        <span>{args.entityName}</span>
        {status === "complete" && <Badge>Complete</Badge>}
      </div>
    );
  },
});

// In your message rendering:
{
  message.role === "assistant" && message.generativeUI?.();
}
```

### 4. Custom Actions

Define actions with full UI control:

```tsx
useCopilotAction({
  name: "actionName",
  description: "Action description",
  parameters: [
    {
      name: "param1",
      type: "string",
      description: "Parameter description",
    },
  ],
  handler: async ({ param1 }) => {
    // Your logic here
    return result;
  },
  render: ({ result, args, status }) => {
    // Custom UI here
    return <YourComponent />;
  },
});
```

## Migration Steps

1. **Update imports**
   - Remove `@copilotkit/react-ui` imports
   - Add `@copilotkit/react-core` imports
   - Import new UI components

2. **Add the headless hook**
   - Replace `<CopilotChat>` with `useCopilotChatHeadless_c()`
   - Extract `messages`, `sendMessage`, `isLoading`

3. **Build the UI**
   - Add `<Conversation>` container
   - Map over messages with `<Message>` components
   - Add `<PromptInput>` for user input

4. **Add state management**
   - Add `useState` for input value
   - Create `handleSend` function
   - Connect to `sendMessage`

5. **Enhance with new features**
   - Add reasoning display
   - Add source citations
   - Define custom actions with generative UI

## CSS Changes

### Before

```css
/* research-chat.css */
.copilotKitChat {
  /* Custom overrides to fight default styles */
}
```

### After

```css
/* research-chat.css */
/* Most styling now handled by shadcn/ui CSS variables */
/* Only custom styling needed for specific features */
```

The new components use CSS variables from your theme:

- `--background`, `--foreground`
- `--primary`, `--primary-foreground`
- `--muted`, `--muted-foreground`
- `--border`, `--accent`

## Testing Checklist

- [ ] Messages display correctly
- [ ] Streaming works without scroll issues
- [ ] Input submits with Enter
- [ ] Shift+Enter creates new lines
- [ ] Loading states show properly
- [ ] User avatars display (if using Clerk)
- [ ] Reasoning sections expand/collapse
- [ ] Source citations display and link correctly
- [ ] Custom actions render UI
- [ ] Theme switching works
- [ ] Mobile responsive
- [ ] Keyboard navigation works
- [ ] Screen readers work correctly

## Rollback Plan

If you need to rollback to the old implementation:

1. Restore the old `ResearchChatInterface.tsx` from git:

   ```bash
   git checkout HEAD~1 -- app/research/components/ResearchChatInterface.tsx
   ```

2. Keep the new UI components (they're separate and don't interfere)

3. The old CSS file remains compatible

## Support

- See `AI_CHAT_COMPONENTS.md` for full component documentation
- Check `ai-chat-example.stories.tsx` for interactive examples
- Run Storybook: `pnpm storybook`
- [CopilotKit Headless UI Docs](https://docs.copilotkit.ai/coagents/headless-ui)

## Benefits Summary

✅ **Full UI Control** - Customize every aspect of the interface
✅ **Type Safety** - Complete TypeScript support for all components
✅ **Better Performance** - Optimized rendering and scroll management
✅ **Accessibility** - ARIA support and keyboard navigation
✅ **Theme Support** - Automatic dark/light mode adaptation
✅ **Extensibility** - Easy to add new features
✅ **Maintainability** - Clear component structure
✅ **Developer Experience** - Better tooling and documentation

## Next Steps

1. Test the new interface thoroughly
2. Customize styling to match your brand
3. Add custom actions for your specific use cases
4. Implement reasoning and source displays
5. Consider adding suggestions UI
6. Set up analytics for user interactions
