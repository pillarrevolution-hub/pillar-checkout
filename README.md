# PILL.AR Checkout

Checkout propio de PILL.AR: el paciente entra desde un **link firmado** que genera
Malvinas, elige **cómo recibir** su pedido (retiro sin cargo por el Colegio de
Farmacéuticos, envío en Córdoba capital o fuera) y **cómo pagarlo** (transferencia
con 15% OFF mostrando alias + monto, Mercado Pago en un pago, o Mercado Pago en
3 cuotas). Un pago aprobado por Mercado Pago avisa a Malvinas y la cotización se
marca **PAGADA** sola, liberando las fórmulas a producción.

## Cómo funciona

1. **Malvinas genera el link** desde la cotización (botón "Generar link del
   checkout"): un payload con nombre, nº de cotización, precios SIN envío y los
   precios de envío, firmado con HMAC-SHA256 (`CHECKOUT_SECRET`). Nadie puede
   fabricar ni retocar un precio.
2. Esta app **verifica la firma en el servidor** y muestra el checkout.
3. Transferencia → muestra alias `pill.ar` + CUIT + monto con botones de copiar
   (el comprobante va por WhatsApp y Tomi confirma con ✅ PAGADO en Malvinas).
4. Mercado Pago → se crea una preferencia de **Checkout Pro** en el servidor y se
   redirige; el **webhook** consulta el pago y, si está aprobado, llama a
   `POST {MALVINAS_URL}/api/cotizaciones/{id}/pagada-externa` con el secreto.

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
