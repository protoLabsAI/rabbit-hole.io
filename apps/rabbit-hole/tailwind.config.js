import baseConfig from "@proto/config-tailwind/base.config.js";

/** @type {import('tailwindcss').Config} */
export default {
  ...baseConfig,
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
    "../../packages/charts/src/**/*.{js,ts,jsx,tsx}",
    "../../packages/icon-system/src/**/*.{js,ts,jsx,tsx}",
  ],
};
