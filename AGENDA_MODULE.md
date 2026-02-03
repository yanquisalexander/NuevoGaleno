# Módulo de Agenda y Reservas

Sistema completo de gestión de citas médicas con calendario timeline, recordatorios automáticos y notificaciones integradas.

## 🎯 Características

### 📅 Calendario Interactivo
- **Vista Timeline**: Calendario semanal, mensual, diario y agenda
- **Vista de horarios**: Timeline de 8:00 a 20:00 con intervalos de 15 minutos
- **Arrastrar y soltar**: Crear citas seleccionando slots de tiempo
- **Navegación fluida**: Cambio entre vistas y navegación por fechas
- **Tema Windows 11**: Estilos adaptados al diseño de la aplicación

### 📝 Gestión de Citas
- **CRUD Completo**: Crear, leer, actualizar y eliminar citas
- **Información detallada**:
  - Paciente asociado
  - Título y descripción
  - Fecha y hora de inicio/fin
  - Tipo de cita (Consulta, Limpieza, Ortodoncia, etc.)
  - Ubicación/consultorio
  - Estado (Programada, Confirmada, Completada, Cancelada, No Asistió)
  - Color personalizado
  
### 🔔 Sistema de Recordatorios
- **Recordatorios automáticos**: Configurables de 15 minutos a 1 día antes
- **Notificaciones desktop**: Integradas con el NotificationContext
- **Servicio en segundo plano**: Revisa recordatorios pendientes cada minuto
- **Persistencia**: Los recordatorios se marcan como enviados en la base de datos
- **Acciones rápidas**: Ver detalles de la cita desde la notificación

### 🎨 Codificación Visual
- Colores por estado de cita
- Badges visuales para estados
- Indicador de cita actual en tiempo real
- Resaltado de día actual

### 🔍 Filtrado
- Por estado (programada, confirmada, completada, etc.)
- Por rango de fechas
- Por paciente
- Filtros rápidos en la interfaz

## 🏗️ Arquitectura

### Backend (Rust/Tauri)

#### Base de Datos
```sql
-- Tabla de citas
CREATE TABLE appointments (
    id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT NOT NULL,
    appointment_type TEXT,
    location TEXT,
    reminder_minutes INTEGER,
    color TEXT,
    created_by INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- Tabla de recordatorios
CREATE TABLE appointment_reminders (
    id INTEGER PRIMARY KEY,
    appointment_id INTEGER NOT NULL,
    scheduled_time TEXT NOT NULL,
    sent INTEGER NOT NULL DEFAULT 0,
    sent_at TEXT,
    notification_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);
```

#### Módulos
- **`db/appointments.rs`**: Operaciones de base de datos
  - `create_appointment`: Crear cita con recordatorio automático
  - `update_appointment`: Actualizar y recalcular recordatorios
  - `delete_appointment`: Eliminar cita y recordatorios
  - `get_appointment`: Obtener cita por ID
  - `list_appointments`: Listar con filtros
  - `get_pending_reminders`: Recordatorios pendientes
  - `mark_reminder_sent`: Marcar como enviado
  - `get_upcoming_appointments`: Próximas X horas

#### Comandos Tauri
```rust
#[tauri::command]
fn create_appointment(appointment: Appointment) -> Result<i64, String>
fn update_appointment(appointment: Appointment) -> Result<(), String>
fn delete_appointment(id: i64) -> Result<(), String>
fn get_appointment(id: i64) -> Result<Appointment, String>
fn list_appointments(filter: AppointmentFilter) -> Result<Vec<AppointmentWithPatient>, String>
fn get_pending_reminders() -> Result<Vec<AppointmentReminder>, String>
fn mark_reminder_sent(reminder_id: i64, notification_id: String) -> Result<(), String>
fn get_upcoming_appointments(hours: i32) -> Result<Vec<AppointmentWithPatient>, String>
```

### Frontend (React/TypeScript)

#### Componentes Principales

##### `Appointments.tsx`
Aplicación principal que integra todo el sistema:
- Gestión de estado del calendario
- Integración con servicio de recordatorios
- Manejo de formularios y detalles
- Filtros y navegación

##### `AppointmentCalendar.tsx`
Componente de calendario basado en `react-big-calendar`:
- Configuración de localización (español)
- Estilos personalizados Windows 11
- Manejo de eventos y slots
- Múltiples vistas (mes, semana, día, agenda)

##### `AppointmentForm.tsx`
Formulario para crear/editar citas:
- Selección de paciente
- Campos de fecha/hora con `datetime-local`
- Tipos de cita predefinidos
- Configuración de recordatorios
- Validación de campos

##### `AppointmentDetails.tsx`
Vista de detalles de cita:
- Información completa de la cita
- Datos del paciente
- Acciones (editar, eliminar)
- Formato de fechas localizado

##### `calendar-styles.css`
Estilos personalizados para el calendario:
- Tema oscuro Windows 11
- Colores y espaciados consistentes
- Hover effects y transiciones
- Responsive design

#### Hooks

##### `useAppointments.ts`
Hook principal para gestión de citas:
```typescript
const {
  appointments,
  loading,
  error,
  fetchAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getAppointment,
  getPendingReminders,
  markReminderSent,
  getUpcomingAppointments,
} = useAppointments();
```

#### Servicios

##### `appointmentReminders.ts`
Servicio de recordatorios en segundo plano:
```typescript
class AppointmentReminderService {
  start(onReminder: (notification) => void)
  stop()
  markReminderSent(reminderId, notificationId)
  setCheckInterval(intervalMs)
}
```

**Características**:
- Ejecuta checks cada 60 segundos (configurable)
- Detecta recordatorios pendientes
- Emite notificaciones a través del callback
- Marca recordatorios como enviados automáticamente
- Se inicia/detiene con el ciclo de vida del componente

#### Tipos

##### `types/appointments.ts`
```typescript
interface Appointment {
  id?: number;
  patient_id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  appointment_type?: string;
  location?: string;
  reminder_minutes?: number;
  color?: string;
  // ...
}

type AppointmentStatus = 
  | 'scheduled' 
  | 'confirmed' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show';
```

## 🚀 Uso

### Crear una Cita

1. Clic en "Nueva Cita" o seleccionar un slot en el calendario
2. Completar el formulario:
   - Seleccionar paciente
   - Ingresar título y tipo
   - Establecer fecha/hora
   - Configurar recordatorio (opcional)
   - Agregar notas
3. Guardar

### Ver/Editar Cita

1. Clic en una cita en el calendario
2. Ver detalles completos
3. Clic en "Editar" para modificar
4. Guardar cambios

### Eliminar Cita

1. Abrir detalles de la cita
2. Clic en "Eliminar"
3. Confirmar acción

### Filtrar Citas

- Usar botones de filtro rápido por estado
- El calendario se actualiza automáticamente

### Recordatorios

Los recordatorios se procesan automáticamente:
1. Al crear/editar una cita con recordatorio
2. El servicio revisa cada minuto
3. Cuando llega el momento, muestra notificación
4. La notificación incluye botón "Ver Cita"
5. Se marca como enviado en la base de datos

## 📚 Dependencias

### Frontend
- `react-big-calendar`: Componente de calendario
- `date-fns`: Manejo de fechas
- `@types/react-big-calendar`: Tipos TypeScript
- `motion`: Animaciones (ya incluido)

### Backend
- `rusqlite`: Base de datos SQLite
- `chrono`: Manejo de fechas en Rust
- `serde`: Serialización

## 🔧 Configuración

### Horario de Atención
Modificar en `AppointmentCalendar.tsx`:
```typescript
min={new Date(2000, 1, 1, 8, 0, 0)}  // 8:00 AM
max={new Date(2000, 1, 1, 20, 0, 0)} // 8:00 PM
```

### Intervalo de Recordatorios
Modificar en `appointmentReminders.ts`:
```typescript
private checkIntervalMs = 60000; // 60 segundos
```

### Intervalos del Calendario
Modificar en `AppointmentCalendar.tsx`:
```typescript
step={15}      // Intervalos de 15 minutos
timeslots={4}  // 4 slots por hora
```

## 🎨 Personalización

### Colores de Estado
Editar en `types/appointments.ts`:
```typescript
export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: '#60cdff',
  confirmed: '#6ccb5f',
  completed: '#8b8b8b',
  cancelled: '#ff99a4',
  no_show: '#ffda6a',
};
```

### Tipos de Cita
Agregar en `types/appointments.ts`:
```typescript
export const APPOINTMENT_TYPES = [
  'Consulta General',
  'Limpieza',
  // ... más tipos
] as const;
```

## 🔐 Seguridad

- ✅ Validación de campos requeridos
- ✅ Foreign keys en base de datos
- ✅ Transacciones para operaciones críticas
- ✅ Sanitización de inputs
- ✅ Permisos por usuario (created_by)

## 📊 Optimizaciones

- Índices en `patient_id`, `start_time`, `status`
- Índices en `appointment_id`, `scheduled_time` para recordatorios
- Carga de datos bajo demanda
- Filtros en backend
- Memo de componentes costosos
- Debounce en búsquedas

## 🐛 Debugging

### Logs del Servicio de Recordatorios
```typescript
// En la consola del navegador:
console.log('Reminder service started/stopped')
console.log('Found X pending reminders')
console.log('Error checking reminders:', error)
```

### Verificar Base de Datos
```sql
-- Ver citas próximas
SELECT * FROM appointments 
WHERE start_time >= datetime('now') 
ORDER BY start_time;

-- Ver recordatorios pendientes
SELECT * FROM appointment_reminders 
WHERE sent = 0 
AND scheduled_time <= datetime('now');
```

## 🚧 Mejoras Futuras

- [ ] Vista de recurso (por consultorio/doctor)
- [ ] Drag & drop de citas
- [ ] Citas recurrentes
- [ ] Confirmación por SMS/Email
- [ ] Lista de espera
- [ ] Estadísticas de citas
- [ ] Exportar a iCal/Google Calendar
- [ ] Sincronización con servicios externos
- [ ] Notificaciones push
- [ ] Recordatorios por WhatsApp

## 📝 Notas

- Las fechas se almacenan en formato ISO 8601 (UTC)
- La localización es en español (es)
- El servicio de recordatorios se ejecuta mientras la app esté abierta
- Los recordatorios no enviados se procesarán al abrir la app
- Se pueden tener múltiples recordatorios por cita (futuro)

---

**Versión**: 1.0.0  
**Autor**: Sistema NuevoGaleno  
**Fecha**: Febrero 2026
