/**
 * Light "Mint & Lime" theme.
 *  - slate  : soft green-tinted neutrals (page, borders, text)
 *  - indigo : primary green (existing `indigo-*` classes render as mint/green)
 *  - amber  : lime-yellow accent (pending / highlight states)
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#F7F9F5', 100: '#EFF3EB', 200: '#E3EADE', 300: '#CDD8C6', 400: '#9DAAA2', 500: '#74837A',
          600: '#56665D', 700: '#3F4E45', 800: '#2A3730', 900: '#1B2420', 950: '#0F1512',
        },
        indigo: {
          50: '#EDFAF2', 100: '#D3F3DF', 200: '#B3EACB', 300: '#8BDDAD', 400: '#5CC98A', 500: '#38B06D',
          600: '#27874F', 700: '#1F6F41', 800: '#1A5A35', 900: '#154A2C', 950: '#0B2D1A',
        },
        amber: {
          50: '#FAFCE3', 100: '#F2F8B4', 200: '#E8F37F', 300: '#DCEB54', 400: '#CEDF2F', 500: '#B8C71B',
          600: '#8D9A10', 700: '#6D780D', 800: '#565E0C', 900: '#434A0B', 950: '#262A05',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(27,36,32,0.04)',
        'xs': '0 1px 3px 0 rgba(27,36,32,0.06)',
        'card': '0 2px 12px -2px rgba(31,80,50,0.07)',
      },
    },
  },
  plugins: [],
}
