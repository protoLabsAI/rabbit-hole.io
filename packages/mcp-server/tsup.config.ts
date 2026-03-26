import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/http-server.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
});
