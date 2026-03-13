#!/bin/bash
# Test transcription environment configuration
# Note: Transcription keys are SERVER-ONLY (no NEXT_PUBLIC_ prefix)

echo "🔍 Checking Transcription Environment Configuration..."
echo ""

# Check .env file
echo "1. Checking .env file:"
if grep -q "GROQ_API_KEY" .env; then
  echo "✅ GROQ_API_KEY found in .env (server-only)"
  GROQ_KEY_LINE=$(grep "GROQ_API_KEY" .env | head -1)
  echo "   Value: ${GROQ_KEY_LINE:0:40}..."
else
  echo "❌ GROQ_API_KEY NOT found in .env"
fi

if grep -q "TRANSCRIPTION_PROVIDER" .env; then
  PROVIDER=$(grep "TRANSCRIPTION_PROVIDER" .env | cut -d'=' -f2)
  echo "✅ TRANSCRIPTION_PROVIDER=$PROVIDER"
else
  echo "❌ TRANSCRIPTION_PROVIDER NOT found in .env"
fi

echo ""

# Check Storybook config
echo "2. Checking .storybook/main.ts:"
if grep -q "GROQ_API_KEY" .storybook/main.ts; then
  echo "✅ Storybook env config includes GROQ_API_KEY"
else
  echo "⚠️  Storybook may need GROQ_API_KEY if using transcription playground"
  echo "   Note: API calls are proxied through /api/transcribe (no keys needed in browser)"
fi

echo ""

# Load .env safely (handles spaces in values)
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Test Groq API
echo "3. Testing Groq API key:"
if [ -n "$GROQ_API_KEY" ]; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    https://api.groq.com/openai/v1/models \
    -H "Authorization: Bearer $GROQ_API_KEY")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Groq API key is VALID"
  else
    echo "❌ Groq API returned HTTP $HTTP_CODE (expected 200)"
    if [ "$HTTP_CODE" = "401" ]; then
      echo "   Your API key is invalid or expired"
      echo "   Get a new key: https://console.groq.com/keys"
    fi
  fi
else
  echo "❌ GROQ_API_KEY not set in environment"
fi

echo ""
echo "✨ Diagnostic complete."
echo ""
echo "If all checks pass but Storybook still fails:"
echo "1. Stop Storybook (Ctrl+C)"
echo "2. Run: rm -rf node_modules/.cache/storybook"
echo "3. Run: pnpm storybook"
echo "4. Check browser console for debug logs"

