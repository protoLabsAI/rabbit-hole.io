/**
 * Test file to verify autocomplete functionality
 * This file is for manual testing in the IDE - not an automated test
 */

import { getModel, getProvider, getModelByName } from "./src/server";

// Test 1: Category autocomplete
// Type "getModel(" and see autocomplete for categories: "fast", "smart", "reasoning", "vision", "long", "coding"
const model1 = getModel("smart");

// Test 2: Provider autocomplete
// Type the second parameter and see autocomplete: "openai", "anthropic", "google", "groq", "ollama", "bedrock", "custom-openai"
const model2 = getModel("smart", "anthropic");

// Test 3: Provider name autocomplete
// Type "getProvider(" and see all provider names
const provider = getProvider("openai");

// Test 4: Model name autocomplete
// Type the first parameter and see all model names across all providers
const model3 = getModelByName("gpt-4o", "openai");

// Test 5: Options override
const model4 = getModel("smart", "openai", {
  temperature: 0.9,
  maxTokens: 4000,
});

console.log("Autocomplete test file - check IDE suggestions above");
