/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary:        "#4F46E5",
        "primary-hover": "#4338CA",
        "primary-tint":  "#EEF2FF",
        "primary-ring":  "#C7D2FE",
        surface:  "#F8FAFC",
        "surface-alt": "#F1F5F9",
        border:   "#E2E8F0",
        "border-soft": "#EDF1F7",
        muted:    "#64748B",
        subtle:   "#94A3B8",
        dark:     "#0F172A",
        medium:   "#334155",
        // Landing-page-only brand palette (kept separate from the
        // app's own indigo `primary` token above so the dashboard
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
        card: "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.05)",
        popover: "0 12px 32px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.08)",
      },
    },
  },
  plugins: [],
};
