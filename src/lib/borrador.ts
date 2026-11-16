// Clave del borrador del checkout en sessionStorage (Checkout.tsx lo
// escribe en cada cambio de paso). Separado en su propio módulo para que
// /gracias (C5) pueda borrarlo sin importar todo el componente Checkout.
export function claveDraft(o: number): string {
  return `pillar-checkout-draft-${o}`;
}
