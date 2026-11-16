// Lógica de las dos rutas de Google Places (v3.2, tema 2/3), separada de
// los route handlers de Next a propósito: así se puede testear con
// node:test mockeando fetch, sin depender de `next/server` (que fuera
// del bundler de Next no resuelve bien con ESM nativo). Los route
// handlers en src/app/api/direcciones/* son wrappers finitos sobre esto.
import { permitir } from './rateLimit.ts';
import { fetchConTimeoutYReintento } from './googleFetch.ts';
import { armarInputAutocomplete, leerDireccionGoogle } from './direcciones.ts';

const TIMEOUT_MS = 4000;
// Sesgo geográfico del autocomplete (B2, 16-nov): antes era un círculo de
// 50 km alrededor de Córdoba capital — "Rosario", "Mendoza" o "Ushuaia"
// casi no aparecían. Es solo un SESGO (no filtra resultados fuera del
// rectángulo, el `input` con la localidad + `includedRegionCodes: ['ar']`
// ya hacen el trabajo pesado), así que ahora es un rectángulo que cubre
// toda la Argentina de punta a punta (incluye Tierra del Fuego).
const ARGENTINA_BIAS = {
  low: { latitude: -55.1, longitude: -73.6 },
  high: { latitude: -21.8, longitude: -53.6 },
};

export type RespuestaApi = { status: number; body: unknown };

export async function sugerirDirecciones(params: {
  ip: string;
  apiKey: string | undefined;
  texto: unknown;
  localidad: unknown;
  provincia: unknown;
  sessionToken: unknown;
}): Promise<RespuestaApi> {
  if (!permitir(params.ip)) {
    return { status: 429, body: { error: 'Demasiadas solicitudes' } };
  }
  if (!params.apiKey) {
    console.warn('direcciones/sugerir: GOOGLE_MAPS_API_KEY no configurada — el checkout sigue con texto libre');
    return { status: 200, body: { disponible: false } };
  }

  const texto = typeof params.texto === 'string' ? params.texto.trim() : '';
  const localidad = typeof params.localidad === 'string' ? params.localidad.trim() : '';
  const provincia = typeof params.provincia === 'string' ? params.provincia.trim() : '';
  const sessionToken = typeof params.sessionToken === 'string' ? params.sessionToken : undefined;

  if (texto.length < 4 || !localidad) {
    return { status: 200, body: { sugerencias: [] } };
  }

  const googleBody = {
    input: armarInputAutocomplete(texto, localidad, provincia || null),
    languageCode: 'es-419',
    regionCode: 'AR',
    includedRegionCodes: ['ar'],
    includedPrimaryTypes: ['street_address', 'premise', 'subpremise', 'route'],
    sessionToken,
    locationBias: { rectangle: ARGENTINA_BIAS },
  };

  try {
    const res = await fetchConTimeoutYReintento(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': params.apiKey,
          'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat',
        },
        body: JSON.stringify(googleBody),
      },
      TIMEOUT_MS
    );

    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      console.error(`direcciones/sugerir: Google respondió ${res.status}`, detalle.slice(0, 500));
      return { status: 502, body: { error: 'No pudimos buscar direcciones ahora' } };
    }

    const data = await res.json();
    const sugerencias = (Array.isArray(data?.suggestions) ? data.suggestions : [])
      .slice(0, 5)
      .map((s: any) => ({
        placeId: s?.placePrediction?.placeId ?? '',
        principal: s?.placePrediction?.structuredFormat?.mainText?.text ?? '',
        secundario: s?.placePrediction?.structuredFormat?.secondaryText?.text ?? '',
      }))
      .filter((s: { placeId: string }) => s.placeId);

    return { status: 200, body: { sugerencias } };
  } catch (e) {
    console.error('direcciones/sugerir: fallo llamando a Google', e);
    return { status: 502, body: { error: 'No pudimos buscar direcciones ahora' } };
  }
}

export async function detalleDireccion(params: {
  ip: string;
  apiKey: string | undefined;
  placeId: unknown;
  sessionToken: unknown;
}): Promise<RespuestaApi> {
  if (!permitir(params.ip)) {
    return { status: 429, body: { error: 'Demasiadas solicitudes' } };
  }
  if (!params.apiKey) {
    console.warn('direcciones/detalle: GOOGLE_MAPS_API_KEY no configurada — el checkout sigue con texto libre');
    return { status: 200, body: { disponible: false } };
  }

  const placeId = typeof params.placeId === 'string' ? params.placeId.trim() : '';
  const sessionToken = typeof params.sessionToken === 'string' ? params.sessionToken : undefined;
  if (!placeId) return { status: 400, body: { error: 'Falta placeId' } };

  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  if (sessionToken) url.searchParams.set('sessionToken', sessionToken);

  try {
    const res = await fetchConTimeoutYReintento(
      url.toString(),
      {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': params.apiKey,
          'X-Goog-FieldMask': 'id,formattedAddress,addressComponents,location',
        },
      },
      TIMEOUT_MS
    );

    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      console.error(`direcciones/detalle: Google respondió ${res.status}`, detalle.slice(0, 500));
      return { status: 502, body: { error: 'No pudimos verificar esa dirección ahora' } };
    }

    const data = await res.json();
    const { calle, altura, localidadGoogle, provinciaGoogle, codigoPostal } = leerDireccionGoogle(
      Array.isArray(data?.addressComponents) ? data.addressComponents : []
    );

    return {
      status: 200,
      body: {
        calle,
        altura,
        localidadGoogle,
        provinciaGoogle,
        codigoPostal,
        formateada: data?.formattedAddress ?? '',
        lat: typeof data?.location?.latitude === 'number' ? data.location.latitude : null,
        lng: typeof data?.location?.longitude === 'number' ? data.location.longitude : null,
      },
    };
  } catch (e) {
    console.error('direcciones/detalle: fallo llamando a Google', e);
    return { status: 502, body: { error: 'No pudimos verificar esa dirección ahora' } };
  }
}
