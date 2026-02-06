# Nuevo Galeno

Sistema de gestión odontológica construido con Tauri + Rust + React + TypeScript.

## 🚀 Características Principales

- **Gestión de Pacientes**: Registro completo de información de pacientes
- **Tratamientos Odontológicos**: Catálogo y seguimiento de tratamientos
- **Odontograma Interactivo**: Visualización y edición de condiciones dentales
- **Agenda de Citas**: Sistema de agendamiento y recordatorios
- **Cuentas Corrientes**: Control de pagos y deudas
- **Multi-Nodo**: Arquitectura distribuida para trabajo en red (⭐ NUEVO)

## 🌐 Arquitectura Multi-Nodo

Nuevo Galeno ahora soporta tres modos de operación:

### 🏠 Modo Standalone (Predeterminado)
Funcionamiento tradicional local sin cambios en la experiencia actual.

### 🖥️ Modo Host
Actúa como servidor exponiendo una API HTTP para que otros nodos se conecten.

**Características:**
- API REST completa
- Autenticación con Bearer tokens
- CORS configurable
- Puerto personalizable (default: 3000)

**Uso típico**: Computadora principal de la clínica que sirve datos a otras estaciones.

### 🌍 Modo Client
Se conecta a un host remoto en lugar de usar la base de datos local.

**Características:**
- Conexión a host remoto via HTTP
- Autenticación segura
- Interfaz idéntica al modo local
- Cambio transparente para el usuario

**Uso típico**: Estaciones de trabajo que acceden a los datos centralizados del host.

## 📚 Documentación

- [**Guía de Arquitectura Multi-Nodo**](MULTI_NODE_ARCHITECTURE.md) - Documentación completa de la arquitectura
- [**Guía para Agregar Funcionalidades**](ADDING_FEATURES_GUIDE.md) - Cómo extender el sistema

## 🛠️ Configuración Inicial

### Modo Standalone (Por Defecto)

No requiere configuración adicional. La aplicación funciona como siempre.

### Modo Host

1. Abre "Configuración Multi-Nodo" desde el menú del sistema
2. Selecciona modo "Host"
3. Configura:
   - Puerto API (ej: 3000)
   - Token de autenticación seguro
   - Habilitar CORS si es necesario
4. Guarda la configuración (el servidor inicia automáticamente)

La API estará disponible en `http://localhost:3000/api`

### Modo Client

1. Asegúrate de tener un host configurado y funcionando
2. Abre "Configuración Multi-Nodo" en el cliente
3. Selecciona modo "Client"
4. Configura:
   - URL del host remoto (ej: `http://192.168.1.100:3000`)
   - Token de autenticación (mismo que el del host)
5. Guarda la configuración

Ahora todas las operaciones usarán el host remoto.

## 🏗️ Arquitectura Técnica

### Backend (Rust)

```
src-tauri/
├── src/
│   ├── services/        # 🎯 Lógica de dominio (independiente)
│   │   ├── mod.rs
│   │   └── patients.rs  # Ejemplo: servicio de pacientes
│   ├── api/            # 🌐 Adaptador HTTP (opcional)
│   │   ├── mod.rs
│   │   ├── routes.rs   # Endpoints REST
│   │   └── server.rs   # Servidor Axum
│   ├── node/           # ⚙️ Configuración de nodos
│   │   ├── mod.rs
│   │   └── config.rs
│   └── lib.rs          # 📡 Comandos Tauri (adaptador)
```

**Principio clave**: La UI nunca accede directamente a SQLite. Toda la lógica vive en servicios de dominio. Los comandos Tauri y la API HTTP son adaptadores que llaman exactamente la misma lógica.

### Frontend (TypeScript/React)

```
src/
├── contexts/
│   └── NodeContext.tsx     # Gestión del contexto activo
├── lib/
│   └── galeno-client.ts    # Cliente unificado (local/remoto)
├── hooks/
│   ├── useGalenoClient.ts  # Hook para usar el cliente
│   └── usePatients.ts      # Operaciones de pacientes
└── apps/
    └── NodeConfig.tsx      # UI de configuración
```

**Principio clave**: El código de la UI no sabe si está hablando con el backend local (invoke) o remoto (HTTP). El cliente unificado maneja automáticamente la comunicación basándose en el contexto activo.

## 🔒 Seguridad

- **Tokens seguros**: Usa tokens criptográficamente aleatorios
- **HTTPS en producción**: Siempre usa HTTPS para conexiones remotas
- **Firewall**: Configura el firewall para exponer solo a redes confiables
- **VPN recomendada**: Usa VPN para acceso remoto cuando sea posible

## 💡 Casos de Uso

### Caso 1: Clínica con Múltiples Estaciones

- **Computadora principal**: Modo Host (almacena datos, ejecuta API)
- **Recepción**: Modo Client (se conecta al principal)
- **Laptops de doctores**: Modo Standalone (pueden trabajar offline)

### Caso 2: Clínica Multi-Sucursal

- **Cada sucursal**: Modo Standalone durante horas de trabajo
- **Sincronización nocturna**: Cambio temporal a modo Client para sincronizar

### Caso 3: App Móvil Companion (Futuro)

- **Desktop**: Modo Host
- **App móvil**: Modo Client

## 🚀 Desarrollo

### Requisitos

- Node.js 18+
- Rust 1.70+
- pnpm

### Instalación

```bash
# Instalar dependencias
pnpm install

# Iniciar en modo desarrollo
pnpm tauri dev
```

### Construir para Producción

```bash
pnpm tauri build
```

## 📝 Agregar Nuevas Funcionalidades

Al agregar nuevas funcionalidades, sigue este flujo:

1. **Servicio de Dominio**: Implementa la lógica en `src-tauri/src/services/`
2. **Comando Tauri**: Crea un comando que llame al servicio
3. **Endpoint HTTP**: Crea una ruta API que llame al servicio
4. **Cliente Frontend**: Agrega métodos a `GalenoClient` interface
5. **Adaptadores**: Implementa en `LocalGalenoClient` y `RemoteGalenoClient`

Ver [ADDING_FEATURES_GUIDE.md](ADDING_FEATURES_GUIDE.md) para detalles completos.

## 🧪 Testing

```bash
# Tests de Rust
cd src-tauri && cargo test

# Tests de TypeScript (por agregar)
pnpm test
```

## 📋 API Reference

Ver [MULTI_NODE_ARCHITECTURE.md](MULTI_NODE_ARCHITECTURE.md#api-reference) para documentación completa de la API.

Ejemplo básico:

```bash
# Obtener lista de pacientes
curl -H "Authorization: Bearer your-token" \
  http://localhost:3000/api/patients

# Crear nuevo paciente
curl -X POST \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Juan","last_name":"Pérez"}' \
  http://localhost:3000/api/patients
```

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Sigue la arquitectura establecida
2. Asegúrate que las nuevas funcionalidades trabajen en todos los modos
3. Actualiza la documentación
4. Escribe tests

## 📄 Licencia

[Especificar licencia]

## 🎯 Roadmap

- [x] Arquitectura multi-nodo básica
- [x] API REST para pacientes
- [ ] API REST para tratamientos
- [ ] API REST para citas
- [ ] Descubrimiento automático de hosts en LAN
- [ ] Sincronización inteligente de datos
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] App móvil companion
- [ ] Sistema de backups automáticos
- [ ] Control de acceso basado en roles

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
