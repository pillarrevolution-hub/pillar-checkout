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
        // v2.3.1 (Tomi: "la letra linda y redondeada que usaba el CEO"):
        // sim.pill.ar usa la fuente del SISTEMA (-apple-system → SF Pro en
        // iPhone/Mac, Roboto en Android, Segoe en Windows) — mismo stack acá,
        // y se terminó la Times de los títulos (el viejo font-serif).
        sans: ['-apple-system', 'system-ui', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        archivo: ['var(--font-archivo)', '-apple-system', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
