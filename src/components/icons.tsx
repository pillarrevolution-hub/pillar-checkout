// Íconos inline (v3, pedido de Tomi: "nada de emoji como ícono" — los
// emoji que quedan son los de los textos de WhatsApp). Server y cliente:
// sin hooks, sirven en /gracias y en el paso a paso por igual.

// circulo=true (default): tilde verde con fondo, para las confirmaciones.
// circulo=false: solo el trazo, hereda el color del texto (currentColor)
// — para usarlo adentro de un botón, tipo "Copiado".
export function IconCheck({ className = 'h-8 w-8', circulo = true }: { className?: string; circulo?: boolean }) {
  if (!circulo) {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M4 12.5l5 5L20 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" className="fill-green-100" />
      <path d="M7 12.5l3 3 7-7" stroke="#15803d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPin({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 21s-7-6.1-7-11.4A7 7 0 0112 2a7 7 0 017 7.6C19 14.9 12 21 12 21z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.6" r="2.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function IconChevron({ abierto, className = 'h-4 w-4' }: { abierto: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLock({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10.5V7.8a4 4 0 018 0v2.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
