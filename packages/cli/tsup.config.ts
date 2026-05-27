import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  // Bundle runtime deps into the output so `dist/index.js` is a single
  // self-contained file. The CLI is COPY'd / symlinked into fleet agent
  // images with no accompanying node_modules, so a bare `import "commander"`
  // would otherwise throw ERR_MODULE_NOT_FOUND at runtime (#301). tsup marks
  // package.json `dependencies` as external by default; force them in here.
  noExternal: ["commander", "yaml"],
  banner: {
    // Line 1: make the built file executable as a CLI on node — Linux/macOS
    // pick this up via the package.json `bin` field + chmod +x at install time.
    // Lines 2-3: commander (CJS) does `require("events")` internally; an ESM
    // bundle has no `require` in scope, so esbuild's __require helper throws
    // "Dynamic require not supported" (#301). Provide a real require via
    // createRequire so the helper uses it and node built-ins resolve.
    js: [
      "#!/usr/bin/env node",
      "import { createRequire as __createRequire } from 'module';",
      "const require = __createRequire(import.meta.url);",
    ].join("\n"),
  },
});
