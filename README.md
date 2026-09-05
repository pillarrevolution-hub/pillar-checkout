# PILL.AR Checkout

Checkout propio de PILL.AR: el paciente entra desde un **link firmado** que genera
Malvinas — una Home y un paso a paso de 4 pantallas, una sola versión — y elige
**cómo recibir** su pedido (retiro sin cargo en una Farmacia RED de Córdoba
capital, retiro por el Colegio de Farmacéuticos en el interior, o envío a
domicilio por localidad con precio al instante) y **cómo pagarlo** (transferencia
con 15% OFF mostrando alias + monto, Mercado Pago en un pago, o Mercado Pago en
3 cuotas). Un pago aprobado por Mercado Pago avisa a Malvinas y la cotización se
marca **PAGADA** sola, liberando las fórmulas a producción.

## Cómo funciona

1. **Malvinas genera el link corto** desde la cotización (`/c/{id}/{firma}`): la
   firma es HMAC-SHA256 de "el nº de cotización" (`CHECKOUT_SECRET`, compartido
   entre los dos proyectos) — nadie puede fabricar ni retocar un precio. Esta app
   pide los datos VIVOS a Malvinas (`checkout-data`) en cada carga: precio
   vigente, el **tarifario de envíos por localidad** (`envios.tarifas`, ya con el
   recargo resuelto), las localidades de Córdoba para el autocompletar del
   retiro por Colegio, y si la cotización ya está paga o ya tiene un comprobante
   subido. Sin fecha de entrega: el paciente nunca ve una fecha estimada.
2. **Home**: cotización con el 15% de descuento (siempre derivado del precio de
   contado, nunca del valor que manda Malvinas) y 3 cuotas sin interés.
3. **Paso 1 — ¿Cómo lo recibís?**: retiro (Córdoba capital en una Farmacia RED a
   elección, o interior de la provincia por el Colegio de Farmacéuticos) o envío
   a domicilio (deshabilitado en los links viejos `?p=`, que no traen tarifario).
4. **Paso 2 — datos**: según lo elegido, sucursal RED + link al mapa, localidad
   del Colegio con autocompletar, o localidad de envío con precio y demora al
   instante contra el tarifario vivo (sinónimos y contención por tokens
   resuelven "Córdoba capital" → CORDOBA, "Carlos Paz" → Villa Carlos Paz,
   etc.). Todo se guarda en Malvinas (`contacto-externa`: celular, dirección,
   retiro/localidad elegidos y total esperado) apenas se completa — si después
   paga por transferencia no hay ningún webhook, así que este es el único
   momento seguro.
5. **Paso 3 — ¿Cómo pagás?**: transferencia, Mercado Pago de contado o 3 cuotas.
6. **Paso 4 — pagar**: transferencia → alias `pill.ar` + CUIT + monto con
   botones de copiar y el comprobante se sube ACÁ MISMO (Atención lo verifica y
   confirma manualmente); Mercado Pago → se crea una preferencia de **Checkout
   Pro** en el servidor (el monto SIEMPRE se recalcula ahí, nunca se confía en
   el del navegador) y se redirige.
7. El **webhook** de Mercado Pago (y `/gracias` al volver del pago, que es la
   confirmación principal) consultan el pago real y llaman a
   `POST {MALVINAS_URL}/api/cotizaciones/{id}/pagada-externa` con el secreto —
   la cotización queda PAGADA sin depender de qué tan rápido llegue el webhook.
   El mensaje de WhatsApp de confirmación (con el pedido y el celular) sale de
   la metadata que la preferencia le mandó a Mercado Pago, sin volver a
   pedirle nada a Malvinas.

El estado del paso a paso vive en un único reducer que se guarda en
`sessionStorage` en cada cambio (nunca en `localStorage`): un refresh accidental
en cualquier paso no pierde lo que el paciente ya escribió.

## Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Qué es |
| --- | --- |
| `CHECKOUT_SECRET` | Secreto compartido con Malvinas (el MISMO en los dos proyectos). Generá uno largo: `openssl rand -hex 32` |
| `MP_ACCESS_TOKEN` | Access Token de PRODUCCIÓN de Mercado Pago (`APP_USR-…`) |
| `MALVINAS_URL` | URL de Malvinas, ej. `https://malvinasv4.vercel.app` |
| `BASE_URL` | Opcional: URL pública de este checkout. Si falta, usa `VERCEL_URL` |

### ¿Dónde saco el Access Token de Mercado Pago?

1. Entrá a <https://www.mercadopago.com.ar/developers/panel/app> con la cuenta de
   Mercado Pago de la farmacia (la que cobra).
2. **Tus integraciones → Crear aplicación** (nombre: `PILLAR Checkout`; producto:
   pagos online / Checkout Pro).
3. En el menú de la aplicación: **Producción → Credenciales de producción** —
   completá industria y sitio web si te lo pide.
4. Copiá el **Access Token** (empieza con `APP_USR-`) y pegalo como
   `MP_ACCESS_TOKEN` en Vercel. Nunca lo compartas por chat.

## Deploy

1. Vercel → **Add New → Project** → importar `pillarrevolution-hub/pillar-checkout`.
2. Cargar las variables de entorno de arriba.
3. Deploy — la URL `pillar-checkout-….vercel.app` es el dominio de prueba; cuando
   esté pulido se le conecta un subdominio (ej. `pagos.pill.ar`).
4. En Malvinas, cargar `CHECKOUT_SECRET` (el mismo) y `CHECKOUT_URL` (la URL de
   este deploy) para que el botón "Generar link del checkout" arme links de acá.

## Probar sin plata real

En **Tus integraciones → Credenciales de prueba** tenés un Access Token de prueba
(`TEST-…`): cargalo temporalmente como `MP_ACCESS_TOKEN` y pagá con las
[tarjetas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards)
de la documentación. Después lo cambiás por el de producción.
