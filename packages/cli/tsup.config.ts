import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  banner: {
    // Make the built file executable as a CLI on node — Linux/macOS pick
    // this up via the package.json `bin` field + chmod +x at install time.
    js: "#!/usr/bin/env node",
  },
});
