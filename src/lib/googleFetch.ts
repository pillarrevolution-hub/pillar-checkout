// fetch con timeout (AbortController) y UN reintento — para las
// llamadas a Google Places desde los route handlers de
// src/app/api/direcciones/*. Si el segundo intento también falla, se
// propaga el error tal cual para que el caller decida (siempre
// devolviendo un mensaje genérico al cliente, nunca el de Google).
export async function fetchConTimeoutYReintento(url: string, init: RequestInit, timeoutMs = 4000): Promise<Response> {
  async function unIntento(): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
  }

  try {
    return await unIntento();
  } catch {
    return await unIntento();
  }
}
