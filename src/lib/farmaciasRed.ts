// Sucursales de Farmacias RED en Córdoba (retiro sin cargo, v3). Copiado de
// ../Docs/farmacias-red-cordoba.json de Malvinas (fuente: https://www.farmaciasred.com.ar/p/sucursales (04-sep-2026, solo Córdoba)).
// Actualizar a mano si Malvinas suma/saca sucursales.
export type FarmaciaRed = {
  nombre: string;
  direccion: string;
  localidad: string;
  mapsQuery: string;
};

export const FARMACIAS_RED: readonly FarmaciaRed[] = [
  {
    nombre: "Cerro",
    direccion: "Avenida Rafael Núñez 3686",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED CERRO, Avenida Rafael Núñez 3686, Córdoba, Córdoba",
  },
  {
    nombre: "Villa Belgrano",
    direccion: "Recta Martinolli 6137",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED VILLA BELGRANO, Recta Martinolli 6137, Córdoba, Córdoba",
  },
  {
    nombre: "Urbana",
    direccion: "Avenida Laplace 5890, Local 4",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED URBANA, Avenida Laplace 5890, Local 4, Córdoba, Córdoba",
  },
  {
    nombre: "Nuevocentro",
    direccion: "Duarte Quirós 1400, Local 1184",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED NUEVOCENTRO, Duarte Quirós 1400, Local 1184, Córdoba, Córdoba",
  },
  {
    nombre: "Urca",
    direccion: "Emilio Lamarca 4135, Locales 11-12",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED URCA, Emilio Lamarca 4135, Locales 11-12, Córdoba, Córdoba",
  },
  {
    nombre: "Martinolli",
    direccion: "Recta Martinolli 8853, Locales 1-5",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED MARTINOLLI, Recta Martinolli 8853, Locales 1-5, Córdoba, Córdoba",
  },
  {
    nombre: "Colón",
    direccion: "Avenida Colón 5034, Local 8",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED COLÓN, Avenida Colón 5034, Local 8, Córdoba, Córdoba",
  },
  {
    nombre: "O'Higgins",
    direccion: "O'Higgins 5450",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED O'HIGGINS, O'Higgins 5450, Córdoba, Córdoba",
  },
  {
    nombre: "Villa Allende",
    direccion: "Avenida Derqui 236, Locales 5-6",
    localidad: "Villa Allende",
    mapsQuery: "FARMACIAS RED VILLA ALLENDE, Avenida Derqui 236, Locales 5-6, Villa Allende, Córdoba",
  },
  {
    nombre: "Real",
    direccion: "Goycoechea 1168",
    localidad: "Villa Allende",
    mapsQuery: "FARMACIAS RED REAL, Goycoechea 1168, Villa Allende, Córdoba",
  },
  {
    nombre: "Paseo Rivera",
    direccion: "Ricardo Rojas esq. Manuel de Falla, Local 1270",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED PASEO RIVERA, Ricardo Rojas esq. Manuel de Falla, Local 1270, Córdoba, Córdoba",
  },
  {
    nombre: "Córdoba Shopping",
    direccion: "Goycoechea 2851, Local 251",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED CÓRDOBA SHOPPING, Goycoechea 2851, Local 251, Córdoba, Córdoba",
  },
  {
    nombre: "Paseo Libertad",
    direccion: "Libertad 1100, Local 90",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED PASEO LIBERTAD, Libertad 1100, Local 90, Córdoba, Córdoba",
  },
  {
    nombre: "Paseo Sabattini",
    direccion: "Av. Amadeo Sabattini 3250, Local 470",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED PASEO SABATTINI, Av. Amadeo Sabattini 3250, Local 470, Córdoba, Córdoba",
  },
  {
    nombre: "Paseo Lugones",
    direccion: "Damián Garat 3255, Local 240",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED PASEO LUGONES, Damián Garat 3255, Local 240, Córdoba, Córdoba",
  },
  {
    nombre: "Armada Argentina",
    direccion: "Avenida Armada Argentina 334, Locales 2-3 (dentro del VEA)",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED ARMADA ARGENTINA, Avenida Armada Argentina 334, Locales 2-3 (dentro del VEA), Córdoba, Córdoba",
  },
];
