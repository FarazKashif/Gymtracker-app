/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0A0A0A',
          card: '#111111',
          elevated: '#141414',
          active: '#1C1C1A',
        },
        border: {
          DEFAULT: '#222222',
          emphasis: '#2E2E2E',
        },
        text: {
          primary: '#DEDED6',
          muted: '#5A5A54',
          faint: '#3A3A34',
        },
        accent: {
          DEFAULT: '#F97316',
          hover: '#EA6A0A',
        },
        green: { DEFAULT: '#34D399' },
        purple: { DEFAULT: '#C084FC' },
        yellow: { DEFAULT: '#FBBF24' },
        teal: { DEFAULT: '#2DD4BF' },
        red: { DEFAULT: '#F87171' },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'Impact', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'Courier New', 'monospace'],
        body: ['"Barlow Condensed"', 'Impact', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '2px',
        sm: '2px',
        md: '3px',
        lg: '4px',
        xl: '4px',
        '2xl': '4px',
        full: '9999px',
      },
      letterSpacing: {
        widest: '0.25em',
        ultra: '0.35em',
      },
    },
  },
  plugins: [],
};
