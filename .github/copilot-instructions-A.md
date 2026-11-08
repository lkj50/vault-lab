# Instrucciones para Copilot — Proyecto A "Vault"

Laboratorio de Seguridad Móvil (Universidad de La Sabana): OAuth 2.0 + PKCE, almacenamiento seguro con silent refresh, TOTP propio (RFC 6238), y step-up 2FA con anti-replay. Monorepo con `/mobile-app` (Expo + TypeScript) y `/backend-auth` (Node.js + Express + TypeScript).

**Principio: código simple y fácil de explicar.** Nada de patrones avanzados, clases innecesarias ni capas extra. Funciones cortas y con nombres claros.

## Identidad de ESTE proyecto

### Backend (`/backend-auth`), puerto 4000
- Express 5 + TypeScript, ejecutado con `tsx watch src/server.ts` en desarrollo.
- JWT con `jsonwebtoken`, algoritmo **HS256** y `JWT_SECRET`.
- Persistencia **en memoria** con `Map` (auth codes, refresh tokens). Caché anti-replay: `Map<string, number>` con la hora de expiración y un `setInterval` cada 30 s que borra las vencidas.
- Estructura plana por ruta:
  ```
  src/
    server.ts            # arranque, HOST/PORT
    app.ts               # express(), middlewares, montaje de rutas
    config.ts            # lectura y validación de .env
    store.ts             # todos los Map en un solo módulo
    lib/ pkce.ts  jwt.ts  totp.ts  base32.ts
    middleware/ requireAuth.ts
    routes/ oauth.ts  auth.ts  api.ts  dev.ts
    views/ loginPage.ts  # HTML del login como template string
  ```
- QR de `/dev/qr` generado con el paquete `qrcode` (toDataURL).

### App (`/mobile-app`)
- **Expo Router** (navegación por archivos dentro de `app/`).
- Estado de sesión con **Redux Toolkit**: **un solo slice `authSlice`** con `status: 'idle' | 'authenticating' | 'authenticated' | 'error'`, `accessToken`, `elevatedToken`, `user`, y acciones `loginStarted`, `loginSucceeded`, `tokenRefreshed`, `mfaElevated`, `loggedOut`. Selectores escritos en el mismo archivo (`selectAccessToken`, etc.). Hooks tipados `useAppDispatch` / `useAppSelector`.
- Cliente HTTP: **Axios** con interceptor de respuesta. La cola de silent refresh vive en el mismo archivo del interceptor: una variable `refreshPromise: Promise<string> | null` compartida; cuando llega un 401 y ya hay refresh en curso, las peticiones esperan esa misma promesa. Si el refresh falla: limpiar SecureStore, `store.dispatch(loggedOut())` y `router.replace("/")`. El interceptor lee el token con `store.getState()`.
- HMAC-SHA1: usar `Crypto.digest(CryptoDigestAlgorithm.SHA1, …)` de `expo-crypto` como función hash y construir el HMAC a mano (bloque de 64 bytes, `ipad = 0x36`, `opad = 0x5c`).
- Base32: decodificador propio con tabla de lookup (`Record<string, number>`).
- Contador de 8 bytes: con `Uint8Array(8)` y desplazamientos (`>>> 24`, `>>> 16`…) sobre las mitades alta y baja.
- Estructura:
  ```
  app/
    _layout.tsx  index.tsx (bienvenida/login)  oauth/callback.tsx
    (tabs)/_layout.tsx  (tabs)/home.tsx  (tabs)/authenticator.tsx  (tabs)/boveda.tsx
    scan.tsx
  src/
    store/ index.ts  authSlice.ts  hooks.ts
    auth/ pkce.ts  oauthFlow.ts  tokenStorage.ts
    api/  client.ts (axios + interceptor + cola)
    totp/ base32.ts  hmacSha1.ts  totp.ts  useTotp.ts  __tests__/totp.test.ts
    components/ CountdownRing.tsx  CodeDisplay.tsx  MfaModal.tsx
    theme.ts
  ```
- Diseño visual: **tema oscuro** (fondo `#0B0F1A`, acento cian `#22D3EE`, texto `#E5E7EB`). Temporizador como **anillo circular** con `react-native-svg` (`strokeDashoffset` animado). Código en fuente monoespaciada (`Menlo` en iOS) con un espacio en medio: `054 231`. Estilos con `StyleSheet.create` y tokens en `theme.ts`.
## Contrato de API (OBLIGATORIO — no cambiar rutas, payloads ni códigos)

Usuario demo: `estudiante@unisabana.edu.co` / `Sabana2026*`. Secreto TOTP del usuario en `TOTP_SECRET` (Base32).

| Método | Ruta | Entrada | Respuestas |
|---|---|---|---|
| GET | `/health` | — | 200 `{ status: "ok" }` |
| GET | `/oauth/authorize` | query: `response_type=code`, `client_id`, `redirect_uri`, `code_challenge`, `code_challenge_method=S256`, `state` | 200 HTML con formulario de login (email + password). 400 si falta algo, si `code_challenge_method` ≠ `S256` o si `redirect_uri` no empieza por un prefijo de `ALLOWED_REDIRECT_PREFIXES` |
| POST | `/oauth/authorize` | form (`application/x-www-form-urlencoded`): email, password + los mismos parámetros en campos ocultos | 302 a `redirect_uri?code=AUTH_CODE&state=STATE`. El code es de un solo uso, vive 60 s y queda ligado a `code_challenge`, `client_id` y `redirect_uri`. Credenciales malas → se vuelve a mostrar el formulario con error |
| POST | `/auth/oauth/token` | JSON `{ grant_type: "authorization_code", code, code_verifier, redirect_uri, client_id }` | 200 `{ access_token, refresh_token, token_type: "Bearer", expires_in }`. 400 `{ error: "invalid_grant" }` si el code no existe, expiró, ya se usó, o `BASE64URL(SHA256(code_verifier)) !== code_challenge` |
| POST | `/auth/refresh` | JSON `{ refresh_token }` | 200 `{ access_token, refresh_token, expires_in }` (rotación: el refresh viejo queda revocado). 401 `{ error: "invalid_refresh_token" }` |
| POST | `/auth/logout` | JSON `{ refresh_token }` | 204 (revoca el refresh) |
| GET | `/api/perfil` | `Authorization: Bearer <access_token>` | 200 datos del usuario. 401 `{ error: "token_expired" \| "invalid_token" }` |
| GET | `/api/boveda-critica` | `Authorization: Bearer <token>` | 401 sin token / token inválido o expirado. 403 `{ error: "mfa_required", step_up_token }` si el token tiene `mfa_verified: false`. 200 con datos sensibles ficticios si es un `elevated_token` válido |
| POST | `/auth/mfa/verify` | JSON `{ step_up_token, code }` | 200 `{ elevated_token, expires_in: 600 }`. 401 `{ error: "invalid_code" }` o `{ error: "invalid_step_up_token" }`. **409 `{ error: "replay_attack_detected", message: "Replay Attack Detected" }`** si ese código ya se usó para ese usuario hace < 90 s |
| GET | `/dev/qr` | — | Página HTML con el QR de `otpauth://totp/UniSabana:estudiante@unisabana.edu.co?secret=<TOTP_SECRET>&issuer=UniSabana` y el secreto en texto (solo para la demo) |

Tokens (JWT, firmados y verificados con la librería `jsonwebtoken`; al verificar, pasar siempre `algorithms: [<el algoritmo del proyecto>]`):
- `access_token`: claims `sub`, `email`, `mfa_verified: false`, `typ: "access"`; vida `ACCESS_TOKEN_TTL` (por defecto 300 s).
- `refresh_token`: string opaco aleatorio (32 bytes, base64url) guardado en el servidor; vida `REFRESH_TOKEN_TTL` (por defecto 2592000 s = 30 días).
- `step_up_token`: JWT `typ: "step_up"`, vida 300 s.
- `elevated_token`: JWT `typ: "access"`, `mfa_verified: true`, vida 600 s.

TOTP en el backend: se implementa a mano con `node:crypto` (`createHmac('sha1', …)`); se valida en las ventanas C-1, C y C+1. **Prohibido** otplib, speakeasy, notp o similares, también en el backend.

Variables de entorno (`backend-auth/.env`, con `.env.example` en el repo): `HOST=0.0.0.0`, `PORT`, `JWT_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `TOTP_SECRET=JBSWY3DPEHPK3PXP`, `ALLOWED_REDIRECT_PREFIXES=exp://,unisabana-auth://`.

## Reglas generales (aplican a todo el repo)

- TypeScript con `"strict": true` en app y backend. Nada de `any` salvo justificado con un comentario.
- Paquetes de Expo: instalar SIEMPRE con `npx expo install <paquete>`, nunca con `npm install`, y no fijar versiones a mano. La app corre en **Expo Go** (SDK más reciente) en un iPhone físico: no usar nada que requiera un development build ni código nativo propio.
- La app lee la URL del backend de `EXPO_PUBLIC_API_URL` (`mobile-app/.env`), que es la IP LAN del PC con Windows (ej. `http://192.168.1.50:4000`). Nunca `localhost`.
- Redirect URI: generarla con `AuthSession.makeRedirectUri({ scheme: "unisabana-auth", path: "oauth/callback" })` (en Expo Go devuelve `exp://…/--/oauth/callback`). `app.json` debe declarar `"scheme": "unisabana-auth"`.
- Navegador: solo `WebBrowser.openAuthSessionAsync`. **Prohibido** `react-native-webview` y cualquier WebView.
- PKCE: `code_verifier` de 64 caracteres del alfabeto `[A-Za-z0-9-._~]` a partir de `Crypto.getRandomBytes`; `code_challenge` = Base64URL sin padding de SHA-256. El `state` es aleatorio por solicitud, se guarda en memoria, y si no coincide se aborta el intercambio y se muestra un error.
- No existe `client_secret` en la app. `client_id` es público (`unisabana-mobile`).
- Estado global con **Redux Toolkit** (`@reduxjs/toolkit` + `react-redux`, instalados con `npx expo install`). `<Provider store={store}>` en `app/_layout.tsx`. **Prohibido `redux-persist`** (guardaría tokens en AsyncStorage).
- `access_token`, `step_up_token` y `elevated_token` viven SOLO en memoria (en el store de Redux). `refresh_token` SOLO en `expo-secure-store`. **Prohibido** AsyncStorage, MMKV o cualquier almacenamiento en texto plano para tokens o para el secreto TOTP (el secreto TOTP también va en SecureStore).
- TOTP en la app: implementado a mano (Base32 → bytes, contador de 8 bytes big-endian, HMAC-SHA1, truncamiento dinámico, `% 1_000_000`, `padStart(6, "0")`). **Prohibido** otplib, speakeasy, totp-generator, hi-base32 ni ninguna librería de TOTP/HOTP/HMAC de alto nivel. Debe funcionar sin red (cero `fetch` en ese módulo).
- Tests del TOTP (Jest con `jest-expo`) contra los vectores del RFC 6238 (secreto ASCII `12345678901234567890`): T=59 → `287082`, T=1111111109 → `081804`, T=1111111111 → `050471`, T=1234567890 → `005924`, T=2000000000 → `279037`.
- Escaneo de QR con `expo-camera` (`CameraView` + `barcodeScannerSettings: { barcodeTypes: ["qr"] }`), parseando `otpauth://totp/...?secret=...&issuer=...`. También debe existir un campo de texto para pegar la semilla Base32, que valide el alfabeto A–Z / 2–7.
- Código de 6 dígitos en fuente monoespaciada grande, temporizador visual de 30 → 0 que regenera el código sin parpadeos (calcular el siguiente código antes de que cambie la ventana o mantener el anterior hasta tener el nuevo).
- Input del código 2FA: `keyboardType="number-pad"`, `textContentType="oneTimeCode"`, `maxLength={6}`.
- El modal de 2FA debe tener un botón "Reenviar último código" que mande otra vez el mismo código ya usado, para demostrar el 409 en la sustentación.
- Pantalla o botón de demo que dispare 3 peticiones simultáneas a `/api/perfil` para mostrar la cola de silent refresh.
- Mensajes de error claros para el usuario, en español. Comentarios del código en español.
- No inventar endpoints ni cambiar el contrato. Si algo del contrato parece faltar, pregúntame antes.
