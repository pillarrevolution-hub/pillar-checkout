// Sucursales de Farmacias RED en Córdoba (retiro sin cargo, v3). Direcciones,
// mapsQuery y localidad: copiado de ../Docs/farmacias-red-cordoba.json de Malvinas
// (fuente: https://www.farmaciasred.com.ar/p/sucursales, 04-sep-2026, solo Córdoba).
// Horario, mail, teléfono y telefonoE164: fusionados desde
// ../Docs/farmacias-red-contacto.json de Malvinas por nombre de sucursal.
// "Paseo Libertad" (nombre usado acá) figura como "Libertad" en ese archivo —
// mismo local (Libertad 1100), no matchea por nombre.
// Actualizar a mano si Malvinas suma/saca sucursales.
export type FarmaciaRed = {
  nombre: string;
  direccion: string;
  localidad: string;
  mapsQuery: string;
  horario: string;
  telefono: string;
  telefonoE164: string;
  mail: string;
};

export const FARMACIAS_RED: readonly FarmaciaRed[] = [
  {
    nombre: "Cerro",
    direccion: "Av. Rafael Núñez 3686",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED CERRO, Avenida Rafael Núñez 3686, Córdoba, Córdoba",
    horario: "Lunes a sábado de 8 a 22 hs · Domingo de 9 a 13 hs",
    telefono: "351-6883375",
    telefonoE164: "+543516883375",
    mail: "redcerro3686@gmail.com",
  },
  {
    nombre: "Villa Belgrano",
    direccion: "Av. Recta Martinolli 6137",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED VILLA BELGRANO, Recta Martinolli 6137, Córdoba, Córdoba",
    horario: "Lunes a sábado de 8 a 21 hs",
    telefono: "351-3485196",
    telefonoE164: "+543513485196",
    mail: "redgralpazrecta@gmail.com",
  },
  {
    nombre: "Urbana",
    direccion: "Av. Pedro Laplace 5890",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED URBANA, Avenida Laplace 5890, Local 4, Córdoba, Córdoba",
    horario: "Lunes a viernes de 8 a 21 hs · Sábado de 8 a 14 hs",
    telefono: "351-3937513",
    telefonoE164: "+543513937513",
    mail: "urbanagralpaz1@gmail.com",
  },
  {
    nombre: "Nuevocentro",
    direccion: "Duarte Quirós 1400, Local 1184",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED NUEVOCENTRO, Duarte Quirós 1400, Local 1184, Córdoba, Córdoba",
    horario: "Lunes a domingo de 9 a 22 hs",
    telefono: "351-2893139",
    telefonoE164: "+543512893139",
    mail: "rednuevocentro@gmail.com",
  },
  {
    nombre: "Urca",
    direccion: "Emilio Lamarca 4135, Locales 11 y 12",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED URCA, Emilio Lamarca 4135, Locales 11-12, Córdoba, Córdoba",
    horario: "Lunes a sábado de 8 a 21 hs",
    telefono: "351-6108303",
    telefonoE164: "+543516108303",
    mail: "redlamarca@gmail.com",
  },
  {
    nombre: "Martinolli",
    direccion: "Av. Recta Martinolli 8853, Locales 1 a 5",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED MARTINOLLI, Recta Martinolli 8853, Locales 1-5, Córdoba, Córdoba",
    horario: "Lunes a sábado de 8 a 22 hs · Domingo de 9 a 13 hs",
    telefono: "351-2543525",
    telefonoE164: "+543512543525",
    mail: "redmartinolli@gmail.com",
  },
  {
    nombre: "Colón",
    direccion: "Av. Colón 5034, Local 8",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED COLÓN, Avenida Colón 5034, Local 8, Córdoba, Córdoba",
    horario: "Lunes a sábado de 8 a 21 hs",
    telefono: "351-3937487",
    telefonoE164: "+543513937487",
    mail: "farmaciaredcolon@gmail.com",
  },
  {
    nombre: "O'Higgins",
    direccion: "Bernardo O'Higgins 5450, Local N",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED O'HIGGINS, O'Higgins 5450, Córdoba, Córdoba",
    horario: "Lunes a sábado de 8 a 21 hs",
    telefono: "351-3731168",
    telefonoE164: "+543513731168",
    mail: "farmaciaredohiggins@gmail.com",
  },
  {
    nombre: "Villa Allende",
    direccion: "Derqui 35, Locales 5 y 6",
    localidad: "Villa Allende",
    mapsQuery: "FARMACIAS RED VILLA ALLENDE, Avenida Derqui 236, Locales 5-6, Villa Allende, Córdoba",
    horario: "Lunes a sábado de 8 a 21 hs",
    telefono: "351-6209394",
    telefonoE164: "+543516209394",
    mail: "redvillaallendefarmaciasred@gmail.com",
  },
  {
    nombre: "Real",
    direccion: "Av. Goycoechea 1168",
    localidad: "Villa Allende",
    mapsQuery: "FARMACIAS RED REAL, Goycoechea 1168, Villa Allende, Córdoba",
    horario: "Lunes a sábado de 8 a 22 hs",
    telefono: "3543-694192 / 03543-433500",
    telefonoE164: "+543543694192",
    mail: "farmaciasrealsrl@gmail.com",
  },
  {
    nombre: "Paseo Rivera",
    direccion: "Enrique Bodereau 7571, Local 1270",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED PASEO RIVERA, Ricardo Rojas esq. Manuel de Falla, Local 1270, Córdoba, Córdoba",
    horario: "Lunes a domingo de 9 a 21 hs",
    telefono: "351-2543696",
    telefonoE164: "+543512543696",
    mail: "redpaseorivera@gmail.com",
  },
  {
    nombre: "Córdoba Shopping",
    direccion: "Goycoechea 2851, Local 251",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED CÓRDOBA SHOPPING, Goycoechea 2851, Local 251, Córdoba, Córdoba",
    horario: "Lunes a domingo de 10 a 22 hs",
    telefono: "351-3785442",
    telefonoE164: "+543513785442",
    mail: "redcordobashopping@gmail.com",
  },
  {
    nombre: "Paseo Libertad",
    direccion: "Libertad 1100, Local 380",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED PASEO LIBERTAD, Libertad 1100, Local 90, Córdoba, Córdoba",
    horario: "Lunes a domingo de 9 a 21 hs",
    telefono: "351-2187200",
    telefonoE164: "+543512187200",
    mail: "farmaciaredlibertad@gmail.com",
  },
  {
    nombre: "Paseo Sabattini",
    direccion: "Av. Amadeo Sabattini 3250, Local 470",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED PASEO SABATTINI, Av. Amadeo Sabattini 3250, Local 470, Córdoba, Córdoba",
    horario: "Lunes a domingo de 9 a 21 hs",
    telefono: "351-2134519",
    telefonoE164: "+543512134519",
    mail: "farmaciasredencargados@gmail.com",
  },
  {
    nombre: "Paseo Lugones",
    direccion: "Damián Garat 3255, Local 240",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED PASEO LUGONES, Damián Garat 3255, Local 240, Córdoba, Córdoba",
    horario: "Lunes a domingo de 9 a 21 hs",
    telefono: "351-6513768",
    telefonoE164: "+543516513768",
    mail: "farmaciasredlugones@gmail.com",
  },
  {
    nombre: "Armada Argentina",
    direccion: "Av. Armada Argentina 334 (dentro del VEA)",
    localidad: "Córdoba",
    mapsQuery: "FARMACIAS RED ARMADA ARGENTINA, Avenida Armada Argentina 334, Locales 2-3 (dentro del VEA), Córdoba, Córdoba",
    horario: "Lunes a sábado de 9 a 21 hs",
    telefono: "351-2190827",
    telefonoE164: "+543512190827",
    mail: "redarmadaargentina@gmail.com",
  },
];
