---
name: Checkout PILL.AR
description: Sistema visual del checkout propio del paciente (repo anidado pillar-checkout/) — estética sim.pill.ar, comparte tokens con Malvinas 4.0 (Opción B, 26-ago-2026)
colors:
  navy: "#0E2238"
  celeste: "#4da3ff"
  fondo: "#edf2f8"
  tinta: "#16232f"
  oro: "#eecb5f"
typography:
  body:
    fontFamily: "-apple-system, system-ui, 'Segoe UI', Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
  wordmark:
    fontFamily: "Archivo"
    fontWeight: 700
rounded:
  lg: "12px"
  xl: "16px"
  full: "9999px"
---

> **La fuente de los tokens es el apéndice "Checkout PILL.AR" del `DESIGN.md` de la raíz del monorepo** (`../DESIGN.md`) — este archivo NO lo reemplaza ni se sincroniza a mano con él; registra solo las decisiones propias de componentes del checkout (como la tarjeta de precio de abajo) para que queden documentadas cerca del código que las implementa.

## Overview

Checkout propio del paciente (`pillar-checkout/`, deploy propio, consumido vía link corto firmado `/c/{id}/{t}`). Estética **sim.pill.ar** (decisión del equipo, ago-2026) — modo Persuade/Operate suave: una sola tarjeta blanca sobre fondo celeste grisáceo, banda/tarjeta navy para el precio. Desde la Opción B (26-ago-2026) comparte tokens con Malvinas 4.0 (app interna); este archivo documenta los detalles propios del checkout (ver también el apéndice "Checkout PILL.AR" en el `DESIGN.md` de la raíz, del que este archivo es la copia de trabajo pedida ahí).

## Colors

- **navy** `#0E2238` — tarjeta oscura del precio. Gradiente de cabecera/tarjeta `#0f2036 → #0E2238`.
- **celeste** `#4da3ff` — acento: punto del logo, números de paso (`.paso`).
- **fondo** `#edf2f8` — fondo de página.
- **tinta** `#16232f` — texto principal.
- **oro** `#eecb5f` — **exclusivo del rótulo de descuento** ("15% de descuento"/"PAGO ÚNICO — 15% DE DESCUENTO"). No se usa para otro rótulo, botón ni acento — si se necesita un segundo rótulo neutro (p. ej. el de cuotas), va en un tono claro de la familia navy (`#dbe3ee`), nunca en oro.

## Typography

Fuente del **sistema** (`-apple-system, system-ui, Segoe UI, Roboto…` — "la letra linda y redondeada"); **Archivo** (600–800) solo para el wordmark `PILL.AR`. Sin serifas.

**Piso de 14px dentro de la tarjeta de precio** (público con gente mayor, pedido explícito 14-nov): ningún texto de esa tarjeta baja de 14px, ni rótulos ni leyendas — el piso general del resto del checkout puede ser menor (12–13px en captions fuera de esta tarjeta), pero la tarjeta de precio es más estricta por ser la pantalla donde se decide pagar.

## Shapes

`.tarjeta` blanca `rounded-2xl` (16px) con sombra suave grande `0 10px 40px rgba(14,34,56,.08)`. Dentro de la tarjeta de precio, los bloques internos usan `rounded-xl` (12px) — mismo radio entre sí.

## Components

- `.chip`, `.paso`, `.opcion`, `.radio`, `.btn-mp` — definidos en `globals.css`, sin cambios.
- **Tarjeta de precio de la Home** (`Home.tsx`) — ver la entrada de abajo.

### Tarjeta de precio de la Home — pago único + 3 cuotas en dos bloques

**Antes (hasta 13-nov):** una sola secuencia vertical dentro de la tarjeta navy — "Valor del tratamiento" → "15% de descuento por pagar de contado" (rótulo+monto en oro) → separador → "Pagás hoy, de contado" + cifra grande → chip "✓ Ahorrás" → separador → línea chica "o 3 cuotas sin interés de…". El pago único y las 3 cuotas no estaban visualmente diferenciados como dos caminos de pago — leían como una sola narrativa con un dato suelto al final.

**Decisión (14-nov-2026, pedido de Tomi, aprobada con 2 ajustes sobre la propuesta):** separar en **dos bloques parejos** (mismo ancho, mismo radio `rounded-xl`, relleno `rgba(255,255,255,.035)` sobre el navy — ninguno de los dos lleva borde, sombra ni estado hover: son agrupadores de lectura, no controles; acá no se elige nada, se elige en el paso de pago), con una **línea divisoria fina de 1px `rgba(255,255,255,.12)` entre ambos** (el relleno al 3,5% solo no alcanza para separarlos con brillo bajo en celular):

1. **Bloque "PAGO ÚNICO — 15% DE DESCUENTO"** (rótulo en oro, el único uso de oro en la tarjeta): precio de lista tachado (secundario `#c3cddb` + `tabular-nums` — **mismo color que "Precio total" del bloque 2**, para que se lea como el mismo número en los dos lugares) → precio de contado grande (protagonista de toda la pantalla, el número más grande de la tarjeta) → leyenda "Por transferencia bancaria o Mercado Pago (saldo en cuenta o débito)".
2. **Bloque "O PAGÁ EN 3 CUOTAS SIN INTERÉS"** (rótulo neutro `#dbe3ee`, nunca oro): "3 cuotas de $X" como cifra principal del bloque (visiblemente más chica que el precio de contado del bloque 1 — nunca compite con el protagonista) → "Precio total: $X" (secundario `#c3cddb`, mismo color que el tachado del bloque 1).

El cálculo no cambia (`listaDesdeContado`/`cuotaDeLista`, `src/lib/precios.ts`); esto es una reestructuración puramente visual de los mismos tres números que ya mostraba la Home. El botón pasa de "Pagar mi tratamiento" a "Continuar con mi tratamiento" (acá todavía no se cobra nada — el pago se elige en el paso 4).

Capturas: `Docs/capturas-13nov/c1-antes-390.png` (línea de base) / `Docs/capturas-13nov/c1-propuesta-390.png` (propuesta, aprobada antes de tocar `Home.tsx`) / `Docs/capturas-13nov/c1-*.png` (resultado final implementado, 360/390/430).
