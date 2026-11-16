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

### Paso 1 "¿Cómo querés recibirlo?" — acordeón con los campos de cada modalidad (C2)

**Antes (hasta 13-nov):** el paciente elegía la modalidad en el Paso 1 (retiro/envío, y dentro de retiro: RED/Badra/Colegio) y recién en el Paso 2 — pantalla aparte — aparecían los campos propios de esa modalidad (sucursal, tarjeta de Badra, localidad+fecha del Colegio, o el combobox de dirección) junto con celular y comentarios.

**Decisión (14-nov-2026, pedido de Tomi, implementado):** los campos de la modalidad se despliegan EN EL PASO 1, debajo de la opción tocada — acordeón de una sola rama abierta (ya es así por construcción: `recibe`/`retiroModo` solo pueden valer una cosa a la vez). Visualmente, la opción elegida y su panel de campos se funden en una sola forma: el botón pierde el radio inferior y el panel continúa con el mismo borde/fondo celeste (`#f2f8ff`), en vez de verse como dos elementos sueltos. Mismo componente `DireccionCombobox`/selector de sucursal que ya existía, solo que vive en `Paso1Recibir.tsx` en lugar de `Paso2Datos.tsx` (eliminado). Al cambiar de modalidad se limpian los datos de la que se deja (sucursal, localidad, dirección, verificación) — nuevas acciones del reducer `elegirRecibe`/`elegirRetiroModo` en `Checkout.tsx` (reemplazan los `campo('recibe', …)` sueltos de antes), verificado con Playwright (`tests/c2-modalidad.spec.ts`: Envío con dirección cargada → cambiar a RED → `calle`/`envioLocalidadTexto`/`direccionVerificada` quedan vacíos/false tanto en el estado React como en el borrador de `sessionStorage`).

Accesibilidad del acordeón: cada opción (de modalidad y de sub-modalidad) es un `button` con `role="radio"` (se mantiene, ya eran radios) + `aria-expanded`/`aria-controls` nuevos; cada panel es `role="region"` con `aria-labelledby` apuntando al botón; foco visible y ≥44px de hit target ya los daban `.opcion`/`.opcion-chica`/`.input-paso` existentes. Transición de apertura con la clase `fade-paso` ya existente (`globals.css`), que solo anima bajo `prefers-reduced-motion: no-preference` — con reduced-motion el panel aparece de forma instantánea, sin salto de layout.

**Piso/depto y CP dejan de ser campos propios de Envío.** El pedido original de C2 solo mencionaba mover el `DireccionCombobox`; al definir el placeholder del campo "Comentarios" para Envío ("Piso, depto, timbre o referencias para la entrega"), esos tres datos (piso, timbre, referencias) quedan cubiertos como texto libre en Comentarios en vez de en campos estructurados — se sacaron los inputs "Piso y depto"/"CP" del panel de Envío (una nota corta dentro del panel redirige a "Comentarios, en el próximo paso"). Los campos `piso`/`cp` del estado de `Checkout.tsx` NO se borraron (siguen en `Estado`, en `direccionEnvioCompleta`/`direccionCorta`) para no tocar más superficie de la necesaria — simplemente ya no los llena ninguna UI, quedan siempre en `''`. Si en algún momento se quiere limpiar ese código muerto, es una rama aparte.

**Decisión de alcance — Paso 2 desaparece, 3 pasos en vez de 4 (implementado):** una vez que la modalidad se mudó al Paso 1, lo único que le quedaba al viejo Paso 2 ("Datos", `Paso2Datos.tsx`, eliminado) era celular + comentarios — una pantalla de dos campos, demasiado liviana para justificar un paso propio. Se fusionó con "¿Cómo querés pagar?" (`Paso3Pago.tsx`): celular + comentarios se muestran ahí, ARRIBA de la barra de resumen (texto + monto) que ese paso ya tenía, y "Siguiente" exige celular válido (antes lo exigía el Paso 2) — mismo criterio de error que A3 (`CELULAR_ERROR`, a partir de 6 dígitos tipeados). El indicador pasa de "Paso N de 4" a "Paso N de 3" (`PasoHeader`, `ui.tsx`, tipo `1 | 2 | 3`): 1 Recibir (con los campos de la modalidad) → 2 Pago (celular, comentarios, método de pago) → 3 Pagar (la acción). La Confirmación post-pago (sin indicador de pasos, sin cambios de contenido) pasa de número interno 5 a 4. El campo "Comentarios" pasa a ser uno solo, genérico para las 4 modalidades (antes existía duplicado: "Comentarios" en Badra y "Referencias para la entrega o comentarios" en Envío, mismo campo de estado `referencias`), con placeholder según la modalidad (`placeholderComentarios()`, `ui.tsx`): Envío → "Piso, depto, timbre o referencias para la entrega"; RED/Badra/Colegio → "¿Algo que tengamos que saber? (opcional)". Se guarda para las 4 (antes RED y Colegio no guardaban nada si el paciente comentaba algo, porque ni se les mostraba el campo) en `cotizaciones.direccionEnvio` vía `POST /api/cotizaciones/[id]/contacto-externa` del repo padre (`body.direccion`) — **verificado leyendo ese handler y `Seguimiento.tsx` en modo solo lectura**: la columna que Seguimiento ya muestra como "Dirección de envío" es un campo de texto libre sin restricción por modalidad (ya recibía "Llega por Colegio: …" para ese camino), así que no hizo falta ningún cambio en el repo padre.

El borrador (`sessionStorage`, clave `pillar-checkout-draft-{id}` — NO `localStorage`, el checkout nunca guarda el celular ahí a propósito, ver el comentario de `Checkout.tsx`) sigue siendo el estado completo del `reducer` en un solo `JSON.stringify`, así que celular y comentarios sobreviven a un refresh igual que el resto de los campos — no hizo falta ningún cambio para eso.

Capturas de la propuesta (antes de tocar código): `Docs/capturas-13nov/c2-propuesta-red-390.png` (RED abierta, selector de sucursal visible) / `Docs/capturas-13nov/c2-propuesta-envio-390.png` (Envío abierto, combobox de dirección visible, con los campos de piso/CP que después se sacaron). Resultado final (`tests/c2-modalidad.spec.ts`, contra el stub con reduced-motion): `Docs/capturas-13nov/c2-red-390.png`, `c2-badra-390.png`, `c2-colegio-390.png`, `c2-envio-390.png` (las 4 modalidades abiertas) y `c2-pago-390.png` (el paso de Pago fusionado, celular+comentarios completos).

### Paso de Pagar — comprobante de transferencia por WhatsApp, sin subir archivo (C4)

**Antes (hasta 15-nov):** en el camino transferencia, el paciente tenía que sacarle una foto al comprobante y subirla desde el celular (`<input type=file>`, con reducción de imagen del lado del cliente para no superar el límite del server). Eso guardaba un archivo real en `comprobantes` (repo padre) y dejaba un evento en el historial para que Atención lo vea y confirme el pago a mano.

**Decisión (16-nov-2026, pedido de Tomi, implementado):** se saca el upload entero. En su lugar:

1. Botón primario **"Enviar comprobante por WhatsApp"** (`<a target="_blank">` a `wa.me`, mismo `WHATSAPP_NUMERO`/`linkWhatsApp()` que ya usaba `/gracias` — ninguna variable de entorno nueva) con el mensaje precargado: *"Hola, soy {nombre}. Realicé la transferencia de ${importe} por mi tratamiento, cotización #{numero}. Adjunto el comprobante."* Debajo, un texto secundario: "Cuando lo recibamos, te confirmamos el pago por WhatsApp."
2. Recién **después** de tocar ese botón aparece el secundario **"Ya envié el comprobante"** (`btn-volver`, el mismo patrón visual que el resto de los secundarios del checkout) — antes del click, ese botón no existe en el DOM (verificado por Playwright, no solo oculto por CSS).
3. "Ya envié el comprobante" llama a `POST /api/comprobante` (la ruta del checkout se conserva, pero perdió el archivo) con `{ celular }`; el server reenvía a `comprobante-externa` del repo padre con `{ canal: 'whatsapp', celular, nombre }` — **sin `mime`/`datosBase64`** — y navega a `/gracias?transferencia=1` sin importar lo que responda Malvinas (nunca frena al paciente: el comprobante YA le llegó a Atención por WhatsApp, eso no depende de este aviso).

**Contrato pendiente del lado de Malvinas (repo padre, NO implementado en este commit):** hoy `comprobante-externa` exige `mime`/`datosBase64` válidos (ver su propio código) y devuelve 400 sin archivo — confirmado leyendo el handler en modo solo lectura, igual que `contacto-externa` no tiene ningún flag de "transferencia por verificar". Hasta que se actualice el repo padre, el aviso por WhatsApp se loguea server-side (`console.warn`, con el número de cotización y el status de Malvinas) pero no deja rastro en el sistema. **Falta agregar en Malvinas:** aceptar `comprobante-externa` sin archivo cuando `canal === 'whatsapp'` → insertar una fila en `comprobantes` con `canal` y sin datos de archivo, historial `"📎 Avisó por WhatsApp que transfirió · verificar y confirmar con ✅ PAGADO"`, y que `comprobanteRecibido` (en `checkout-data`) dé `true` igual que con un archivo real. El stub de Playwright (`scripts/stub-malvinas.mjs`) sí acepta este body desde ya (200, guarda el último recibido en `/debug/ultimo-comprobante-externa` para que el test lo verifique) — representa el comportamiento FUTURO de Malvinas, no el actual.

**Limpieza directa de este cambio:** al dejar de navegar a un paso de confirmación propio del wizard (ahora se sale a `/gracias`), el viejo "Paso 5" interno (`Paso5Confirmacion.tsx`, `paso === 4` en `Checkout.tsx`) quedó sin ningún camino que lo alcance — se borró junto con el estado que ya no se usa (`subiendo`, `errorComprobante`, `comprobanteListo`, la función `archivoABase64`). El flujo numerado sigue siendo "Paso N de 3" (eso no cambió, C2); lo que desaparece es la pantalla sin número que venía después. `/gracias` (ya existía para la vuelta de Mercado Pago) suma un caso nuevo con `?transferencia=1`: texto mínimo "Cuando recibamos tu comprobante por WhatsApp te confirmamos el pago" — se pule en C5.

Capturas (`tests/c4-transferencia.spec.ts`, contra el stub): `Docs/capturas-13nov/c4-antes-click.png` (botón de WhatsApp, "Ya envié" todavía no existe) / `c4-despues-click.png` (después del click, con "Ya envié el comprobante" visible) / `c4-gracias.png` (`/gracias?transferencia=1`).

### Envío a domicilio a todo el país — dos tarifas planas por provincia (B1)

**Antes (hasta 15-nov):** "Me lo mandan a casa" solo llegaba a las localidades que trae `checkout-data.envios.tarifas` (un tarifario Córdoba-céntrico, ~181 filas que manda Malvinas). `buscarTarifa()`/`sugerirTarifas()` (`src/lib/envios.ts`) buscaban la localidad tipeada ahí; si no estaba (p. ej. "Rosario" devolvía "Villa Del Rosario" por contención de tokens, o directamente no matcheaba ninguna localidad de otra provincia), aparecía el aviso "Todavía no llegamos a «…» con envío a domicilio" y el paciente no podía avanzar.

**Decisión (16-nov-2026, pedido de Tomi, implementado):** cualquier localidad del país es entregable. El precio deja de depender de la localidad y pasa a depender SOLO de la provincia: `tarifaEnvio(provincia)` (`src/lib/envios.ts`) devuelve `TARIFA_CORDOBA = 15.000` si la provincia normalizada es "cordoba", `TARIFA_RESTO = 17.000` para cualquier otra, y `null` sin provincia todavía resuelta. Se eliminan `buscarTarifa`, `sugerirTarifas` y el tarifario por localidad de todo el camino Envío (el campo `tarifas` de `checkout-data.envios` queda tipado como DEPRECADO en `firma.ts` — Malvinas lo sigue mandando y el stub de Playwright también, para probar que el checkout lo ignora). Sin plazo de entrega: `PLAZO_ENVIO_CORDOBA`/`PLAZO_ENVIO_RESTO` quedan en `null` a propósito ("los define el desarrollador" si algún día se reactivan) — se sacó la línea "Demora estimada" del panel de Envío.

**De dónde sale la provincia:** `DireccionCombobox` ya le pedía a Google Places (`GET places/{placeId}`) el `administrative_area_level_1` (`provinciaGoogle`, `src/lib/direcciones.ts::leerDireccionGoogle` — esto YA estaba implementado, solo faltaba propagarlo). Cuando Google confirma la dirección (coincide con la localidad tipeada, o el paciente elige "Usar {localidad de Google}"), el combobox llama a `setProvincia(provinciaGoogle)`, prop nueva que viaja hasta el estado de `Checkout.tsx`. **Plan B** (Google no respondió, tardó, o degradó a texto libre tras 2 fallos — la regla de oro del combobox sigue intacta: nunca bloquea un pago): mientras `provincia` sea `null`, `Paso1Recibir.tsx` muestra un `<select>` obligatorio "Provincia" (23 provincias + CABA, `src/lib/provincias.ts::PROVINCIAS_ARGENTINA`) debajo del combobox de dirección — sin elegirla, "Siguiente" queda deshabilitado (`falta: 'Elegí la provincia de destino'`). `provincia` se resetea a `null` al cambiar de localidad o al vaciar la dirección (mismo criterio que `calle`/`direccionVerificada`), pero NO en cada tecla que el paciente escribe en "Calle y número" — una provincia ya confirmada (por Google o a mano) sobrevive a editar el número de puerta.

**Contrato pendiente del lado de Malvinas (repo padre, NO tocado desde esta sesión — regla 41, una sesión por repo):** `contacto-externa` y `pagada-externa` reciben ahora, además de `envioLocalidad` (texto libre) y `envioMonto`, un campo nuevo **`envioProvincia`**. Hoy `resolverEleccionEnvio()` (`src/lib/enviosServer.ts` de Malvinas) busca `envioLocalidad` contra `tarifasEnvio` (el mismo tarifario Córdoba-céntrico) y recalcula el monto ahí — para cualquier localidad fuera de esas ~181 filas no encuentra nada y guarda `envioMonto: null`, perdiendo el envío que el paciente sí pagó. **Falta agregar en Malvinas:** si el body trae `envioProvincia`, `resolverEleccionEnvio` NO busca en `tarifasEnvio` — aplica la MISMA regla de dos valores del lado servidor (Córdoba 15.000 / resto 17.000, igual que `tarifaEnvio()` de este repo), guarda ese monto y loguea si difiere del `envioMonto` que mandó el checkout (mismo patrón que ya usa con el monto del cliente). Sin `envioProvincia` (links viejos, checkout desactualizado) sigue el comportamiento actual tal cual. Este cambio en Malvinas tiene que desplegarse ANTES de mergear este checkout a producción — si no, el envío queda roto para cualquier provincia fuera de Córdoba apenas se publique.

**Qué recibe Malvinas, confirmado leyendo `contacto-externa`/`pagada-externa`/`enviosServer.ts` en modo solo lectura:** `celular`, `direccion` (texto libre), `envioLocalidad` (texto libre, ya no canónico de ningún tarifario), `envioProvincia` (nuevo), `envioMonto`, `retiroModo`/`retiroLugar`, `tipo`. El camino Colegio de Farmacéuticos (`matchExactoLocalidad`/`matchUnicoDifuso` sobre `LOCALIDADES_CORDOBA`, el autocompletar de localidades de Córdoba para el retiro vía Colegio) es una lista y una ruta totalmente aparte del tarifario de Envío — **conserva su fallback difuso sin cambios**, no lo tocó este commit.

Tests nuevos: `src/lib/__tests__/envios.test.ts` (`tarifaEnvio`: Córdoba capital y Alta Gracia → 15.000, Rosario/Santa Fe y CABA → 17.000, sin provincia → `null`) y Playwright `tests/b1-envio-pais.spec.ts` (Córdoba → "$15.000" en pantalla y en el body a Malvinas vía `/debug/ultimo-contacto-externa` del stub; Santa Fe → "$17.000"; sin ninguna palabra de demora/plazo visible; cualquier localidad habilita el combobox, sin aviso de "no llegamos"). Capturas: `Docs/capturas-13nov/b1-cordoba-390.png` / `b1-santa-fe-390.png`.
