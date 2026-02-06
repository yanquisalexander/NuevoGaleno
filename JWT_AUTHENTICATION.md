# JWT Authentication Guide

## Overview

Nuevo Galeno utiliza JWT (JSON Web Tokens) para autenticación remota. Este sistema permite que clientes remotos se autentiquen de manera segura sin necesidad de mantener sesiones en el servidor.

## ¿Por qué JWT?

- **Stateless**: El servidor no necesita almacenar sesiones
- **Seguro**: Los tokens están firmados criptográficamente
- **Escalable**: Funciona perfectamente en arquitecturas distribuidas
- **Estándar**: Compatible con múltiples plataformas y lenguajes

## Flujo de Autenticación

### 1. Login (Obtener Token)

```typescript
// Cliente TypeScript
const response = await fetch('http://host:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'doctor1',
    password: 'mypassword'
  })
});

const { token, user } = await response.json();
// Guardar token para usar en próximas requests
```

**Respuesta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkb2N0b3IxIiwidXNlcl9pZCI6MSwicm9sZSI6ImRvY3RvciIsImV4cCI6MTczODg1MDAwMCwiaWF0IjoxNzM4NzYzNjAwfQ.signature",
  "user": {
    "id": 1,
    "username": "doctor1",
    "name": "Dr. John Doe",
    "role": "doctor",
    "active": true
  }
}
```

### 2. Usar Token en Requests

```typescript
// Todas las peticiones subsiguientes
const response = await fetch('http://host:3000/api/patients', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 3. Verificar Token

```typescript
// Verificar si el token aún es válido
const response = await fetch('http://host:3000/api/auth/verify', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { valid, user } = await response.json();
```

## Estructura del Token JWT

Un JWT de Nuevo Galeno contiene:

```json
{
  "sub": "doctor1",        // Username
  "user_id": 1,            // ID del usuario
  "role": "doctor",        // Rol del usuario
  "exp": 1738850000,       // Expiración (Unix timestamp)
  "iat": 1738763600        // Emitido en (Unix timestamp)
}
```

## Diferencias: Local vs Remote

### Modo Local (Tauri)

```typescript
// Login con password
const user = await client.login(username, password);
// Retorna: { user }

// Login con PIN (solo local)
const user = await client.loginWithPin(username, pin);
// Retorna: { user }
```

**Características:**
- ✅ Soporta password
- ✅ Soporta PIN
- ✅ Sesión en memoria del proceso
- ❌ No usa JWT

### Modo Remote (HTTP/JWT)

```typescript
// Login con password
const response = await client.login(username, password);
// Retorna: { token, user }

// loginWithPin no disponible en remoto
```

**Características:**
- ✅ Soporta password
- ❌ **NO soporta PIN** (por seguridad)
- ✅ Usa JWT tokens
- ✅ Token válido por 24 horas

## Seguridad

### ¿Por qué PIN no está disponible en modo remoto?

Los PINs son convenientes pero menos seguros que passwords:

1. **Espacio de claves reducido**: Solo 10,000 combinaciones (4 dígitos) vs millones (password)
2. **Vulnerable a ataques de fuerza bruta** a través de red
3. **Diseñado para acceso físico local**, no remoto

Por estas razones, **PIN solo funciona en modo local** donde el acceso físico al dispositivo ya es un nivel de seguridad.

### Mejores Prácticas

**Para Desarrollo:**
```rust
// src-tauri/src/services/auth.rs
const JWT_SECRET: &str = "NUEVO_GALENO_JWT_SECRET_CHANGE_IN_PRODUCTION";
```

**Para Producción:**
1. Cambiar `JWT_SECRET` a un valor aleatorio largo
2. Usar variables de entorno:
   ```bash
   export GALENO_JWT_SECRET="your-very-long-random-secret-here"
   ```
3. **Siempre usar HTTPS** para transmisión de passwords y tokens
4. Considerar reducir el tiempo de expiración de tokens
5. Implementar rotación de tokens (refresh tokens)

### Configuración del Secret

Para cambiar el JWT secret en producción:

1. Editar `src-tauri/src/services/auth.rs`:
   ```rust
   const JWT_SECRET: &str = env!("GALENO_JWT_SECRET");
   ```

2. Al compilar, proveer la variable:
   ```bash
   export GALENO_JWT_SECRET="your-secret-here"
   cargo build --release
   ```

## Implementación en el Cliente

El `GalenoClient` maneja automáticamente el modo de autenticación:

```typescript
import { useGalenoClient } from '@/hooks/useGalenoClient';

function MyComponent() {
  const client = useGalenoClient();
  const { login } = useSession();
  
  const handleLogin = async () => {
    try {
      // Funciona en local (retorna { user })
      // Funciona en remoto (retorna { token, user })
      const user = await login(username, password, client);
      
      // El cliente guarda automáticamente el JWT si está en modo remoto
      console.log('Login exitoso:', user);
    } catch (error) {
      console.error('Error:', error);
    }
  };
}
```

## Middleware de Autenticación

El servidor acepta dos tipos de tokens:

```rust
// API Token estático (para comunicación host-to-host)
Authorization: Bearer <api-token-from-config>

// JWT Token (para autenticación de usuarios)
Authorization: Bearer <jwt-from-login>
```

Orden de verificación:
1. Si el path es `/api/auth/login` o `/api/health` → permitir sin auth
2. Extraer token del header `Authorization`
3. Intentar verificar como API token estático
4. Si falla, intentar verificar como JWT token
5. Si ambos fallan → 401 Unauthorized

## Troubleshooting

### "Token inválido"

- El token puede haber expirado (24 horas)
- El JWT secret cambió en el servidor
- El token está malformado

**Solución**: Hacer login nuevamente

### "PIN no disponible en modo remoto"

Esto es intencional por seguridad. En modo remoto, usa password.

### "Authentication failed"

- Usuario no existe
- Password incorrecta
- Usuario inactivo

**Solución**: Verificar credenciales y estado del usuario

## Testing

### Probar Login Local

```bash
# Abrir app y hacer login normalmente
# El login usa invoke() de Tauri directamente
```

### Probar Login Remoto

1. Configurar nodo en modo Host
2. En otra instancia, configurar conexión remota
3. Login con password (no PIN)
4. Verificar que se recibe JWT en developer tools

### Probar API directamente

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Usar el token recibido
TOKEN="eyJhbGci..."
curl http://localhost:3000/api/patients \
  -H "Authorization: Bearer $TOKEN"

# Verificar token
curl http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer $TOKEN"
```

## Roadmap

Futuras mejoras al sistema de autenticación:

- [ ] Refresh tokens (tokens de larga duración que pueden generar nuevos access tokens)
- [ ] Token revocation list (lista de tokens invalidados antes de expiración)
- [ ] Configuración de tiempo de expiración desde UI
- [ ] Two-factor authentication (2FA)
- [ ] OAuth2 support para integraciones externas
- [ ] Audit log de intentos de login

## Referencias

- [JWT.io](https://jwt.io/) - Herramienta para decodificar y verificar JWTs
- [RFC 7519](https://tools.ietf.org/html/rfc7519) - Especificación oficial de JWT
- [jsonwebtoken crate](https://docs.rs/jsonwebtoken/) - Librería usada en el backend
