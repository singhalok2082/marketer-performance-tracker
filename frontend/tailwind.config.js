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
      },
    },
  },
  plugins: [],
};
