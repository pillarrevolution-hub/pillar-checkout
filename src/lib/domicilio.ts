// Domicilio estructurado (B3, 16-nov): lo que el checkout GUARDA al
// elegir una sugerencia del buscador de Google es esto, nunca el texto
// que tipeó el paciente. `armarDomicilioElegido` es un ensamblador puro
// sobre lo que YA devuelve `leerDireccionGoogle` (el único lugar que
// recorre `addressComponents`, en direcciones.ts) — no vuelve a leer
// componentes de Google por su cuenta, para que no haya dos lugares
// con la misma lógica de parseo que puedan divergir.
import { leerDireccionGoogle, type GoogleAddressComponent } from './direcciones.ts';

export type DomicilioElegido = {
  calle: string;
  altura: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  formatted: string;
  placeId: string;
};

export function armarDomicilioElegido(
  componentes: GoogleAddressComponent[],
  formattedAddress: string,
  placeId: string
): DomicilioElegido {
  const { calle, altura, localidadGoogle, provinciaGoogle, codigoPostal } = leerDireccionGoogle(componentes);
  return {
    calle,
    altura,
    localidad: localidadGoogle,
    provincia: provinciaGoogle,
    codigoPostal,
    formatted: formattedAddress,
    placeId,
  };
}
