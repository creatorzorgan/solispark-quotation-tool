/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          dark: '#0F1A2E',
          mid: '#1A2744',
          light: '#152036',
        },
        gold: {
          primary: '#F5A623',
          light: '#FFD080',
          dark: '#D4891A',
        },
        offwhite: '#F8F6F1',
        cream: {
          100: '#F0EDE8',
          200: '#D9D4CC',
          400: '#9A9590',
          600: '#6B6560',
          800: '#3D3833',
        },
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '20px',
        pill: '50px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(15,26,46,0.06), 0 4px 12px rgba(15,26,46,0.04)',
        cardHover: '0 4px 12px rgba(15,26,46,0.08), 0 12px 28px rgba(15,26,46,0.08)',
        gold: '0 6px 20px rgba(245,166,35,0.35)',
      },
    },
  },
  plugins: [],
};
