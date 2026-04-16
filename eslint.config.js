// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format

// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import path from "path";
import { fileURLToPath } from "url";

import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-plugin-prettier";
import storybook from "eslint-plugin-storybook";
import unusedImports from "eslint-plugin-unused-imports";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  // MUST BE FIRST: Ignores don't work if placed after other configs
  {
    ignores: [
      "**/node_modules/",
      "**/.next/",
      "**/dist/",
      "**/build/",
      "**/coverage/",
      "**/build-diagnostics-output/",
      "**/*.d.ts",
      "**/*.generated.ts",
      "**/public/admin/**", // TinaCMS generated admin UI
      "**/.tina/__generated__/**", // TinaCMS generated types
      "**/tina/__generated__/**", // TinaCMS generated types (alternative location)
      "**/tina/tina-lock.json", // TinaCMS lock file
      "external/**", // External libraries - not part of main codebase standards
      "storybook-static/**", // Storybook build output
      ".worktrees/**", // Git worktrees - separate checkouts, not part of main tree
      ".claude/worktrees/**", // Claude Code worktrees
    ],
  },
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "lucide-react",
              message:
                "Use Icon from @protolabsai/icon-system instead of direct lucide-react imports. See docs/developer/icon-system-migration.md",
            },
            {
              name: "@langchain/openai",
              message:
                "Use getModel() or getModelByName() from @protolabsai/llm-providers/server instead of direct LangChain imports. Direct LangChain imports are only allowed in packages/llm-providers/",
            },
            {
              name: "@langchain/anthropic",
              message:
                "Use getModel() or getModelByName() from @protolabsai/llm-providers/server instead of direct LangChain imports. Direct LangChain imports are only allowed in packages/llm-providers/",
            },
            {
              name: "@langchain/google-genai",
              message:
                "Use getModel() or getModelByName() from @protolabsai/llm-providers/server instead of direct LangChain imports. Direct LangChain imports are only allowed in packages/llm-providers/",
            },
            {
              name: "@langchain/groq",
              message:
                "Use getModel() or getModelByName() from @protolabsai/llm-providers/server instead of direct LangChain imports. Direct LangChain imports are only allowed in packages/llm-providers/",
            },
            {
              name: "@langchain/ollama",
              message:
                "Use getModel() or getModelByName() from @protolabsai/llm-providers/server instead of direct LangChain imports. Direct LangChain imports are only allowed in packages/llm-providers/",
            },
          ],
          patterns: [
            {
              group: ["@langchain/*/chat_models"],
              message:
                "Use getModel() or getModelByName() from @protolabsai/llm-providers/server instead of direct LangChain chat model imports. Direct LangChain imports are only allowed in packages/llm-providers/",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.name='crypto'][property.name='randomUUID']",
          message:
            "Do not use crypto.randomUUID() directly. Import { generateSecureId } from '@protolabsai/utils' instead for consistent secure ID generation.",
        },
        {
          selector:
            "MemberExpression[object.object.name='window'][object.property.name='crypto'][property.name='randomUUID']",
          message:
            "Do not use window.crypto.randomUUID() directly. Import { generateSecureId } from '@protolabsai/utils' instead for consistent secure ID generation.",
        },
        {
          selector: "NewExpression[callee.name='Pool']",
          message:
            "Do not create Pool instances directly. Import { getGlobalPostgresPool } from '@protolabsai/database' to use the shared connection pool.",
        },
      ],
    },
  },
  {
    files: [
      "packages/icon-system/src/providers/**/*",
      "packages/icon-system/src/Icon.tsx",
    ],
    rules: {
      "no-restricted-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["packages/llm-providers/**/*"],
    rules: {
      "no-restricted-imports": "off", // Allow direct LangChain imports in llm-providers package
    },
  },
  {
    files: ["agent/**/*"],
    rules: {
      "no-restricted-imports": "off", // Allow direct LangChain imports in agent (LangGraph service)
    },
  },
  {
    files: ["apps/curious-minds/**/*"],
    rules: {
      "no-restricted-imports": "off", // Allow lucide-react for TinaCMS compatibility
    },
  },
  {
    files: ["packages/utils/src/secure-id.ts", "packages/utils/src/uuid.ts"],
    rules: {
      "no-restricted-syntax": "off", // Allow crypto.randomUUID in UUID utility implementations
    },
  },
  {
    files: ["packages/database/src/postgres-pool.ts"],
    rules: {
      "no-restricted-syntax": "off", // Allow Pool creation in global pool implementation
    },
  },
  {
    files: [
      "packages/utils/src/tenancy/tenant-utils.ts",
      "services/**/*.ts",
      "app/lib/app-database.ts",
      "app/lib/hocuspocus-db.ts",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off", // Allow require() for global pool import (avoid circular deps)
    },
  },
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    settings: {
      next: {
        rootDir: "apps/rabbit-hole/",
      },
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],

    plugins: {
      "@typescript-eslint": typescriptEslint,
      import: importPlugin,
      "unused-imports": unusedImports,
      prettier: prettier,
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: "module",

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    rules: {
      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/no-empty-function": "warn",

      // Import organization
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
          pathGroups: [
            {
              pattern: "@protolabsai/**",
              group: "external",
              position: "after",
            },
            // Path aliases within apps (e.g., @/components, @/lib)
            {
              pattern: "@/**",
              group: "internal",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["builtin", "type"],
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
          warnOnUnassignedImports: false,
        },
      ],
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",

      // Prettier integration
      "prettier/prettier": "warn",

      // Unused imports
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],

      // General code quality
      // TODO(v0.1.0): Re-enable no-console warnings before release
      "no-console": "off", // Temporarily disabled - too many warnings during development
      "prefer-const": "error",
      "no-var": "error",
      "no-case-declarations": "error", // Require block statements in switch cases with declarations

      // Note: Neo4j driver restrictions moved to packages-specific configuration below

      // React specific
      "react/no-unescaped-entities": [
        "error",
        {
          forbid: [
            {
              char: '"',
              alternatives: ["&quot;", "&ldquo;", "&#34;", "&rdquo;"],
            },
            {
              char: "'",
              alternatives: ["&apos;", "&lsquo;", "&#39;", "&rsquo;"],
            },
          ],
        },
      ],

      // Temporarily disable react-hooks rules due to ESLint 9.x compatibility issues
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    files: [
      "**/*.config.js",
      "**/*.config.ts",
      "**/next.config.js",
      "**/eslint.config.js",
    ],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
  {
    files: ["scripts/**/*.js", "scripts/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off",
    },
  },
  {
    files: ["apps/torin-stephens/**/*.ts", "apps/torin-stephens/**/*.tsx"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  ...storybook.configs["flat/recommended"],
];
