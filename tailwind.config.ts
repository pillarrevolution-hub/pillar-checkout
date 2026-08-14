import type { Config } from 'tailwindcss';

// Paleta de la web de referencia (sim.pill.ar): navy profundo, celeste,
// fondo claro azulado y amarillo para el badge de descuento.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0E2238', // tarjeta oscura del precio
        celeste: '#4da3ff', // acento (punto del logo, números de paso)
        fondo: '#edf2f8', // fondo de página
        tinta: '#16232f', // texto principal
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        archivo: ['var(--font-archivo)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
