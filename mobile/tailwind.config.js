/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        player: "#111111",
      },
      fontFamily: {
        sans: ["Geist-Regular"],
        light: ["Geist-Light"],
        medium: ["Geist-Medium"],
        semibold: ["Geist-SemiBold"],
      },
    },
  },
  plugins: [],
};
