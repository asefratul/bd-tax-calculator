/** @type {import('tailwindcss').Config} */
// Brand colors mirror src/tax/theme.js. If you migrate inline styles to
// Tailwind classes, use these tokens (e.g. text-bd-accent, bg-bd-paper).
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bd: {
          ink: "#15211c",
          paper: "#eef1ee",
          card: "#ffffff",
          muted: "#66726b",
          line: "#dfe4e0",
          accent: "#006a4e",
          due: "#b23a2a",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
