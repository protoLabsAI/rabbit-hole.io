#!/usr/bin/env bash
# Safety guard — block destructive bash commands
# Exit code 2 = block the tool call

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# Block patterns
if echo "$COMMAND" | grep -qE '(rm -rf /|rm -rf \.|git reset --hard|git push.*--force.*main|git push.*--force.*master|git clean -f)'; then
  echo "Blocked: destructive command detected"
  exit 2
fi

exit 0
