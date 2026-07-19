/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary:  "#4F46E5",
        "primary-hover": "#4338CA",
        surface:  "#F3F4F7",
        border:   "#ECEDF2",
        muted:    "#7B8094",
        subtle:   "#A1A5B3",
        dark:     "#16181D",
        medium:   "#383B49",
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
      },
    },
  },
  plugins: [],
};
