# Vault - Taller TOTP

Laboratorio de seguridad móvil con backend Express y app Expo.

## Cómo correr el proyecto

### Obtener la IP de la computadora

En Windows, abre una terminal y ejecuta:

```powershell
ipconfig
```

Busca la dirección IPv4 de la conexión Wi-Fi o Ethernet. Actualiza
`mobile-app/.env` con esa IP:

```env
EXPO_PUBLIC_API_URL=http://TU_IP_LAN:4000
```

No uses `localhost` en el teléfono físico.

### Backend

```powershell
cd backend-auth
npm install
npm run dev
```

El backend queda disponible en `http://0.0.0.0:4000`; desde el teléfono usa
la IP LAN de la computadora.

### App móvil

```powershell
cd mobile-app
npm install
npx expo start
```

Abre Expo Go en el teléfono y escanea el código QR mostrado por Expo.
