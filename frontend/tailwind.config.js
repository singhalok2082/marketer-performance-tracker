/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary:        "#18181B",
        "primary-hover": "#3F3F46",
        "primary-tint":  "#F4F4F5",
        "primary-ring":  "#D4D4D8",
        surface:  "#FAFAFA",
        "surface-alt": "#F4F4F5",
        border:   "#E4E4E7",
        "border-soft": "#EFEFF0",
        muted:    "#71717A",
        subtle:   "#A1A1AA",
        dark:     "#18181B",
        medium:   "#3F3F46",
        // Landing-page-only brand palette (kept separate from the
        // app's own neutral `primary` token above so the dashboard
        // is unaffected).
        caOrange:     "#FF5722",
        caOrangeDark: "#E64A19",
        caBlue:       "#1976D2",
        caTeal:       "#00BCD4",
        caNeutral:    "#F5F5F5",
        caText:       "#212121",
      },
      fontFamily: {
        heading: ["Poppins", "-apple-system", "sans-serif"],
        body: ["Roboto", "-apple-system", "sans-serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(24,24,27,0.04), 0 1px 3px rgba(24,24,27,0.05)",
        popover: "0 12px 32px rgba(24,24,27,0.14), 0 2px 8px rgba(24,24,27,0.08)",
      },
    },
  },
  plugins: [],
};
