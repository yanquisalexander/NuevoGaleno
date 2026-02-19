# Plugin API Reference

## PluginContext

El contexto del plugin es el objeto principal que se pasa a la función `activate()` de tu plugin.

```typescript
interface PluginContext {
  plugin: {
    id: string;
    name: string;
    version: string;
  };
  api: PluginAPI;
  hooks: PluginHooks;
}
```

## APIs Disponibles

### Patients API

Requiere permisos: `patients:read` y/o `patients:write`

```typescript
interface PatientsAPI {
  // Obtener todos los pacientes
  getAll(limit?: number, offset?: number): Promise<Patient[]>;
  
  // Obtener paciente por ID
  getById(id: number): Promise<Patient>;
  
  // Buscar pacientes
  search(query: string): Promise<Patient[]>;
  
  // Crear paciente (requiere patients:write)
  create(data: CreatePatientInput): Promise<number>;
  
  // Actualizar paciente (requiere patients:write)
  update(id: number, data: UpdatePatientInput): Promise<void>;
}
```

### Treatments API

Requiere permisos: `treatments:read` y/o `treatments:write`

```typescript
interface TreatmentsAPI {
  // Obtener todos los tratamientos
  getAll(limit?: number, offset?: number): Promise<Treatment[]>;
  
  // Obtener tratamientos de un paciente
  getByPatient(patientId: number): Promise<Treatment[]>;
  
  // Crear tratamiento (requiere treatments:write)
  create(data: CreateTreatmentInput): Promise<number>;
  
  // Actualizar tratamiento (requiere treatments:write)
  update(id: number, data: UpdateTreatmentInput): Promise<void>;
}
```

### Appointments API

Requiere permisos: `appointments:read` y/o `appointments:write`

```typescript
interface AppointmentsAPI {
  // Listar citas con filtros
  list(filter: AppointmentFilter): Promise<Appointment[]>;
  
  // Crear cita (requiere appointments:write)
  create(data: CreateAppointmentInput): Promise<number>;
  
  // Actualizar cita (requiere appointments:write)
  update(data: UpdateAppointmentInput): Promise<void>;
  
  // Eliminar cita (requiere appointments:write)
  delete(id: number): Promise<void>;
}
```

### Payments API

Requiere permisos: `payments:read` y/o `payments:write`

```typescript
interface PaymentsAPI {
  // Obtener pagos de un paciente
  getByPatient(patientId: number): Promise<Payment[]>;
  
  // Obtener pagos de un tratamiento
  getByTreatment(treatmentId: number): Promise<Payment[]>;
  
  // Crear pago (requiere payments:write)
  create(data: CreatePaymentInput): Promise<number>;
}
```

### UI API

Siempre disponible

```typescript
interface UIApi {
  // Mostrar notificación
  showNotification(
    message: string,
    type?: 'info' | 'success' | 'warning' | 'error'
  ): void;
  
  // Abrir ventana
  openWindow(
    title: string,
    component: React.ComponentType,
    data?: any
  ): void;
  
  // Cerrar ventana actual
  closeWindow(): void;
  
  // Mostrar diálogo
  showDialog(options: DialogOptions): Promise<boolean>;
}

interface DialogOptions {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'confirm';
  confirmText?: string;
  cancelText?: string;
}
```

### Storage API

Siempre disponible

```typescript
interface StorageAPI {
  // Obtener valor
  get(key: string): Promise<any>;
  
  // Guardar valor
  set(key: string, value: any): Promise<void>;
  
  // Eliminar valor
  remove(key: string): Promise<void>;
  
  // Limpiar todo
  clear(): Promise<void>;
}
```

### Network API

Requiere permiso: `api:network`

```typescript
interface NetworkAPI {
  // Realizar petición HTTP
  fetch(url: string, options?: RequestInit): Promise<Response>;
}
```

## Hooks System

```typescript
interface PluginHooks {
  // Suscribirse a un evento
  on(event: PluginEvent, handler: Function): void;
  
  // Desuscribirse de un evento
  off(event: PluginEvent, handler: Function): void;
  
  // Emitir evento personalizado
  emit(event: string, data: any): void;
}
```

### Eventos del Sistema

- `patient:open` - Cuando se abre un paciente
- `patient:create` - Cuando se crea un paciente
- `patient:update` - Cuando se actualiza un paciente
- `treatment:create` - Cuando se crea un tratamiento
- `treatment:update` - Cuando se actualiza un tratamiento
- `appointment:create` - Cuando se crea una cita
- `appointment:update` - Cuando se actualiza una cita
- `payment:create` - Cuando se registra un pago
- `app:ready` - Cuando la aplicación está lista
- `app:shutdown` - Cuando la aplicación se cierra

## Ciclo de Vida del Plugin

```javascript
// Activación del plugin
export async function activate(context) {
  // Inicializar plugin
  console.log('Plugin activado');
  
  // Registrar hooks
  context.hooks.on('patient:open', handlePatientOpen);
  
  // Cargar configuración
  const config = await context.api.storage.get('config');
}

// Desactivación del plugin
export async function deactivate() {
  // Limpiar recursos
  console.log('Plugin desactivado');
}
```

## Permisos

Los plugins deben declarar los permisos que necesitan en el manifest:

- `patients:read` - Leer datos de pacientes
- `patients:write` - Modificar datos de pacientes
- `treatments:read` - Leer tratamientos
- `treatments:write` - Crear/modificar tratamientos
- `appointments:read` - Leer citas
- `appointments:write` - Gestionar citas
- `payments:read` - Leer pagos
- `payments:write` - Registrar pagos
- `api:network` - Realizar peticiones HTTP
- `storage:local` - Almacenamiento local (siempre disponible)
- `ui:notifications` - Mostrar notificaciones (siempre disponible)
- `system:commands` - Ejecutar comandos del sistema

## Mejores Prácticas

1. **Manejo de Errores**: Siempre usa try-catch para operaciones asíncronas
2. **Limpieza**: Desregistra hooks en `deactivate()`
3. **Permisos Mínimos**: Solo solicita los permisos que realmente necesitas
4. **Validación**: Valida datos antes de enviarlos a las APIs
5. **Performance**: Evita operaciones pesadas en el hilo principal
6. **Seguridad**: Nunca almacenes credenciales en texto plano
7. **Compatibilidad**: Especifica `minVersion` en el manifest
8. **Documentación**: Incluye README con instrucciones de uso
