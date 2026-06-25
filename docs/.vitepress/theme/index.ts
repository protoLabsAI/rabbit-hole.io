import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { h } from "vue";

import protoTheme from "@protolabsai/vitepress-theme";

import StudioFooter from "./StudioFooter.vue";
// rabbit-hole brand token overrides — loaded AFTER the shared theme so they win.
import "./custom.css";

// Extends the shared @protolabsai/vitepress-theme (fleet-standard styling) and
// adds the studio footer, matching protoAgent / ORBIS. Brand colors are
// recolored to rabbit-hole's warm palette in custom.css.
export default {
  ...protoTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      "layout-bottom": () => h(StudioFooter),
    });
  },
} satisfies Theme;
