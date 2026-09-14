import { defineConfig, devices } from '@playwright/test';

// CHECKOUT_SECRET/MALVINAS_URL salen de .env.local (nunca se commitean).
// Corre contra el build de PRODUCCIÓN (npm run build && npm run start):
// es la única forma real de ver si Next fuerza una recarga al volver —
// en dev, Fast Refresh y el doble-invoke de Strict Mode ensucian la
// medición.
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3010',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // devices['Desktop Chrome'] trae su propio viewport (1280x720) que
      // pisaría el de arriba si se pusiera antes del spread — va después,
      // a propósito: casi todos los pacientes entran del celular.
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: 'npm run build && npm run start -- -p 3010',
    url: 'http://localhost:3010',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
