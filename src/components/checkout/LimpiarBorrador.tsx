'use client';
import { useEffect } from 'react';
import { claveDraft } from '@/lib/borrador';

// C5 (16-nov): al llegar a /gracias el checkout terminó — si quedó un
// borrador en sessionStorage (refresh a mitad de pago, etc.) se borra acá,
// nunca se lo vuelve a leer. /gracias es un server component sin acceso a
// sessionStorage, por eso esto vive en una hoja 'use client' aparte.
export default function LimpiarBorrador({ o }: { o: number | null }) {
  useEffect(() => {
    if (o === null) return;
    try {
      sessionStorage.removeItem(claveDraft(o));
    } catch {
      /* sessionStorage no disponible — no había nada que borrar */
    }
  }, [o]);
  return null;
}
