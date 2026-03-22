/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0A0A0A',
          secondary: '#111111',
          tertiary: '#1A1A1A',
        },
        gold: {
          DEFAULT: '#D4AF37',
          soft: '#F0C040',
          dark: '#A08020',
          muted: 'rgba(212,175,55,0.15)',
        },
        text: {
          primary: '#F5F5F0',
          secondary: '#8A8A8A',
          muted: '#555555',
        },
      },
      fontFamily: {
        heading: ['"Playfair Display"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        input: '8px',
        btn: '6px',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.6)',
        gold: '0 0 20px rgba(212,175,55,0.2)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #D4AF37, #F0C040)',
        'gold-gradient-dark': 'linear-gradient(135deg, #A08020, #D4AF37)',
      },
    },
  },
  plugins: [],
};
