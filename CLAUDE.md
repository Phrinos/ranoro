# Ranoro — instrucciones del proyecto

Sistema de gestión para un **taller mecánico en Aguascalientes, México** (Ranoro). Next.js 16 (App Router) + Firebase. Este archivo es la capa de **dominio**; las convenciones generales (idioma, estilo, árbol-siempre-verde, patrones Firestore/Next, secretos) viven en el `CLAUDE.md` global y NO se repiten aquí.

## Stack y deploy
- **Frontend:** Next.js 16 App Router (`src/app`), TypeScript strict, shadcn/ui + Radix, Tailwind, React Hook Form + Zod, framer-motion. Paquete npm se llama `studio`.
- **Backend:** Firebase. Firestore (rules en `firestore.rules`, indexes en `firestore.indexes.json`), Storage (`storage.rules`), Cloud Functions de cron en `functions/` (codebase `backend`, `lib/` compilado).
- **Hosting del Next:** **Firebase App Hosting** (`apphosting.yaml`, `maxInstances: 1`). App Hosting **reconstruye y despliega el front automáticamente con cada `git push` a `main`**. Proyecto Firebase: `ranoro-jm8l0` (`.firebaserc`).
- **OJO — `hosting` en `firebase.json` es legacy MUERTO:** su rewrite `** → nextServer` apunta a una function que no existe (`functions/src/index.ts` solo exporta crons). No se sirve nada por ahí; el front lo sirve App Hosting. **Nunca** incluyas `hosting` en un deploy.

### `npm run ship` (deploy completo)
`git add -A` → commit con timestamp (si hay cambios) → `git push` (dispara App Hosting para el front) → `firebase deploy --only functions,firestore:rules,firestore:indexes,storage` (lo que App Hosting NO cubre). Auxiliares: `deploy:rules`, `deploy:functions`, `typecheck:functions`.
- Antes de `ship`: `npm run typecheck` (root) **y** `npm run typecheck:functions` deben estar verdes. El predeploy de functions ya corre `lint` + `build` (tsc).
- `.env`, `.env.local`, `firebase-admin-key.json` están gitignored (no se pushean). Env de producción se inyecta por App Hosting / functions config, no por archivos.

## Arquitectura de datos
- **Capa de servicios:** `src/lib/services/*.service.ts` centraliza TODO el acceso a Firestore (no llamar `collection()`/`doc()` suelto desde componentes). Uno por dominio: `service.service.ts` (órdenes), `sale.service.ts` (POS), `inventory.service.ts`, `rental.service.ts` (flotilla), `cash.service.ts` (caja), `admin.service.ts` (usuarios/roles/auditoría), `billing.service.ts` (Facturapi), `agenda.service.ts`, `purchase.service.ts`, `personnel.service.ts`, `dashboard.service.ts`, `export.service.ts`. Barrel en `src/lib/services/index.ts`.
- **Tipos centrales:** `src/types/index.ts` (Vehicle, ServiceRecord, ServiceItem, Payment, SaleReceipt, Driver, InventoryItem, Appointment, AuditLog, User, AppRole, WhatsAppAgentConfig…). Enums centralizados aquí (PaymentMethod, ServiceSubStatus, AppointmentStatus…). No dupliques uniones: si necesitas extender una, hazlo en este archivo.
- **Firebase clients:** `src/lib/firebaseClient.ts` (cliente), `src/lib/firebaseAdmin.ts` (admin SDK, solo server). Config en `src/lib/firebase.config.ts`.
- **Limpieza pre-write:** usar el helper de saneado (undefined→null, Date→ISO) antes de `setDoc`/`addDoc`/`updateDoc`.
- **Dinero:** `src/lib/money.ts` (`formatMXN`, IVA 16%), `src/lib/money-helpers.ts` (comisión de tarjeta, profit efectivo). Todo MXN, redondeo a 2 decimales.

## Auth, roles y permisos
- `src/hooks/useAuth.ts`: Firebase Auth + `onSnapshot` a `users/{uid}`. Auto-logout a medianoche; expulsa si el usuario está archivado.
- Roles en `appRoles` (Firestore), contexto en `src/lib/contexts/roles-context.tsx`, gate en `src/hooks/usePermissions.ts` y `src/lib/permissions.ts`. Permisos granulares por módulo (inventario, pos, servicios, flotilla, finanzas, admin…). **Gatea en UI y en el submit handler.**
- Server Actions: validar con `src/lib/server-auth.ts` (`requireActionAuth`, minRole). Nunca exponer secretos (Facturapi `sk_live_`) al cliente — viven en `settings/billing` (solo Superadmin) en Firestore.

## Reglas de negocio mexicanas (no obvias)
- **IVA fijo 16%** (`src/lib/money.ts`), no configurable.
- **Comisiones de tarjeta** netas (afectan profit) en `src/lib/money-helpers.ts`: contado 4.06%, y MSI escalonado (3/6/9/12/18/24 meses).
- **Facturación CFDI 4.0 vía Facturapi** (`billing.service.ts`, `src/app/api/invoices/[id]/download`): credenciales en `settings/billing`. RFC/régimen validados con `src/lib/sat-catalogs.ts`. Portal público `/facturar` timbra sin login (server action). **Idempotente:** si ya hay `invoiceId`, no re-timbra (evita CFDI duplicado).
- **Flotilla:** la Cloud Function `generateDailyRentalCharges` corre **diario 15:00 hora CDMX** (`America/Mexico_City`) y genera `dailyRentalCharges` por conductor con vehículo asignado (`vehicle.dailyRentalCost`).
- **Zona horaria:** reportes/cortes siempre en `America/Mexico_City` con `date-fns-tz` (no UTC).

## Colecciones Firestore clave
`users`, `appRoles`, `vehicles`, `serviceRecords`, `publicServices` (copias desnormalizadas para el portal público sin login), `sales`, `inventoryItems`, `suppliers`, `purchases`, `serviceTypes`, `pricingGroups`, `drivers` + colecciones de flotilla (`dailyRentalCharges`, `rentalPayments`, `manualDebts`, `vehicleExpenses`, `fleetMonthlyBalances`), caja (`cashDrawerState`, `cashDrawerTransactions`, `dailyCuts`, `monthlyBalances`), `appointments`, `workshopConfig` (config pública del taller), `settings` (secretos: `billing`, `whatsapp-agent` — solo Superadmin), `auditLogs` (inmutable; reemplaza a Sentry), `systemStats`/`system` (agregados, solo Functions), `whatsapp-conversations/{id}/messages`. Lista completa y permisos en `firestore.rules`.

## Integraciones externas
- **WhatsApp (SofIA):** Baileys (engine externo) + Gemini. Webhook en `src/app/api/whatsapp/webhook`; rutea cliente vs staff; flag `humanTakeover` detiene el bot. Config en `settings/whatsapp-agent`. Modo asistido: el bot escala a asesor, no agenda/cancela solo.
- **Facturapi** (CFDI), **Google Gemini** (IA del bot), **Firebase Admin** (server actions/functions).

## Módulos (rutas bajo `src/app/(app)`)
`dashboard` (KPIs), `servicios` (órdenes: activos/historial/cotizaciones/[id]/nuevo), `punto-de-venta` (POS), `vehiculos`, `personal`, `usuarios` (roles/permisos), `facturacion`, `listadeprecios` (precios por grupo de vehículo), `flotilla` (conductores/vehículos de renta), `administracion` (finanzas/cortes), `agenda`, `opciones`, `whatsapp`, `ticket`. Rutas `[id]` son client con `useParams` + getDoc→onSnapshot.

## Sitio público y SEO
- `src/app/(public)`: `/` (landing, = `/landing`), `/facturar`, `/s/[id]` (servicio compartido). Metadata global + JSON-LD AutoRepair en `src/app/layout.tsx`. SEO técnico (robots, sitemap, llms.txt, OG) — ver trabajo en curso. Dominio público: `https://ranoro.mx`.
- `/login`, `/acceso-denegado` no deben indexarse.
