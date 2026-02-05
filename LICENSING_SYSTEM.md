# Sistema de Licenciamiento - Nuevo Galeno

Sistema de licencias estilo "Activar Windows" integrado con Lemon Squeezy para Nuevo Galeno.

## 📋 Características

- ✅ **Trial de 30 días** - Uso completo de la aplicación sin licencia durante 30 días
- ✅ **Activación online** - Activación de licencias mediante Lemon Squeezy API
- ✅ **Modo offline** - Período de gracia de 7 días sin conexión
- ✅ **Watermark estilo Windows** - Indicador visual en esquina inferior derecha
- ✅ **Status indicator** - Mini applet en menubar estilo Intel Theft Deterrent
- ✅ **Restricciones configurables** - Límites según tipo de licencia
- ✅ **Panel de administración** - Gestión de licencias para administradores

## 🏗️ Arquitectura

### Backend (Rust/Tauri)

#### Archivo: `src-tauri/src/licensing.rs`

Módulo principal que maneja:
- Activación de licencias con Lemon Squeezy API
- Validación online y offline
- Almacenamiento local en SQLite
- Gestión de período de trial
- Caché de respuestas API para modo offline

**Comandos Tauri expuestos:**
```rust
activate_license(license_key, customer_email, instance_name)
validate_license()
deactivate_license()
get_license_status()
start_trial()
```

### Frontend (React/TypeScript)

#### Tipos: `src/types/licensing.ts`

Define todas las interfaces TypeScript para:
- Respuestas de API de Lemon Squeezy
- Estado de licencia local
- Información de trial
- Restricciones por tipo de licencia

#### Hook: `src/hooks/useLicense.ts`

Hook principal para interactuar con el sistema de licencias desde React:

```typescript
const {
  licenseStatus,      // Estado actual
  isLicensed,        // Tiene licencia activada
  isActive,          // Licencia válida y activa
  isTrial,           // En período de prueba
  trialDaysRemaining, // Días restantes de trial
  activateLicense,   // Activar nueva licencia
  deactivateLicense, // Desactivar licencia actual
  validateLicense,   // Validar online
  startTrial,        // Iniciar período de prueba
  hasFeature,        // Verificar si feature está disponible
  isLimitReached,    // Verificar si se alcanzó un límite
} = useLicense();
```

## 📦 Componentes

### 1. `LicenseActivationDialog.tsx`

Diálogo estilo "Activar Windows" para ingresar la clave de licencia:

```tsx
<LicenseActivationDialog 
  open={showDialog} 
  onOpenChange={setShowDialog} 
/>
```

**Características:**
- Input para license key
- Input para email de compra
- Botón para iniciar trial de 30 días
- Validación de campos
- Feedback visual de activación

### 2. `LicenseWatermark.tsx`

Watermark en esquina inferior derecha (estilo Windows):

```tsx
<LicenseWatermark />
```

**Se muestra cuando:**
- No hay licencia activada
- Licencia en trial
- Licencia expirada
- Modo offline

**No se muestra cuando:**
- Licencia activa y válida

### 3. `LicenseStatusIndicator.tsx`

Indicador en menubar/titlebar:

```tsx
<LicenseStatusIndicator />
```

**Muestra:**
- Badge de estado con color (verde/azul/amarillo/rojo)
- Días restantes de trial
- Información de licencia en dropdown
- Acciones: activar, validar, desactivar

### 4. `LicenseManagementPanel.tsx`

Panel completo de administración (solo admin):

```tsx
<LicenseManagementPanel />
```

**Incluye:**
- Estado detallado de licencia
- Información de activación
- Email y clave de licencia
- Última verificación
- Estado de conexión
- Acciones de gestión

### 5. `LicenseGuard.tsx`

Componente para proteger funcionalidades:

```tsx
// Proteger por feature
<LicenseGuard feature="can_export">
  <ExportButton />
</LicenseGuard>

// Proteger por límite
<LicenseGuard 
  limitKey="max_patients" 
  currentCount={patientCount}
>
  <AddPatientButton />
</LicenseGuard>
```

## 🔧 Configuración

### 1. Lemon Squeezy

En `src/types/licensing.ts`, actualiza:

```typescript
export const LEMON_SQUEEZY_CONFIG = {
  STORE_ID: 12345,      // Tu Store ID
  PRODUCT_ID: 67890,    // Tu Product ID
  VARIANT_ID: 11111,    // Tu Variant ID (opcional)
  TRIAL_DAYS: 30,
  VALIDATION_INTERVAL_HOURS: 24,
  OFFLINE_GRACE_PERIOD_DAYS: 7,
};
```

En `src-tauri/src/lib.rs`, función `get_license_manager()`:

```rust
let store_id = 12345;    // Tu Store ID
let product_id = 67890;  // Tu Product ID
let variant_id = 11111;  // Tu Variant ID
```

### 2. Habilitar License Keys en Lemon Squeezy

1. Ve a tu producto en Lemon Squeezy dashboard
2. Habilita "License keys"
3. Configura:
   - **License length**: Según tu modelo (ej: 365 días para suscripción anual)
   - **Activation limit**: Número de activaciones permitidas (ej: 3 para uso en 3 equipos)

### 3. Restricciones

En `src/types/licensing.ts`, personaliza:

```typescript
export const LICENSE_RESTRICTIONS = {
  unlicensed: {
    max_patients: 10,
    max_appointments: 50,
    max_treatments: 20,
    can_export: false,
    can_import: false,
    // ...
  },
  trial: {
    max_patients: 100,
    max_appointments: 500,
    // ...
  },
  active: {
    // Sin límites
  },
};
```

## 🚀 Integración en la App

### 1. App.tsx

Agregar watermark y validación inicial:

```tsx
import { LicenseWatermark } from '@/components/LicenseWatermark';
import { useLicense } from '@/hooks/useLicense';

function App() {
  const { validateLicense } = useLicense();

  useEffect(() => {
    // Validar al iniciar
    validateLicense();
  }, []);

  return (
    <>
      {/* Tu app */}
      <LicenseWatermark />
    </>
  );
}
```

### 2. AppTitleBar.tsx / MenuBar

Agregar indicador de estado:

```tsx
import { LicenseStatusIndicator } from '@/components/LicenseStatusIndicator';

function AppTitleBar() {
  return (
    <div className="titlebar">
      {/* ... otros elementos ... */}
      <LicenseStatusIndicator />
    </div>
  );
}
```

### 3. Sistema de menú para Admin

Agregar opción en menú de administrador:

```tsx
import { LicenseManagementPanel } from '@/components/LicenseManagementPanel';

// En tu router/sistema de navegación
{
  path: '/admin/license',
  element: <LicenseManagementPanel />,
  requiresAdmin: true,
}
```

### 4. Aplicar restricciones

En componentes que necesiten protección:

```tsx
import { LicenseGuard } from '@/components/LicenseGuard';
import { useLicenseRestrictions } from '@/components/LicenseGuard';

function PatientsPage() {
  const { canAdd } = useLicenseRestrictions();
  const [patients, setPatients] = useState([]);

  const handleAddPatient = () => {
    const check = canAdd('max_patients', patients.length);
    
    if (!check.allowed) {
      alert(check.message);
      return;
    }
    
    // Agregar paciente...
  };

  return (
    <div>
      <LicenseGuard 
        limitKey="max_patients" 
        currentCount={patients.length}
      >
        <Button onClick={handleAddPatient}>
          Agregar Paciente
        </Button>
      </LicenseGuard>
    </div>
  );
}
```

## 📊 Base de Datos Local

El sistema crea automáticamente una base de datos SQLite en:

```
Windows: %LOCALAPPDATA%\NuevoGaleno\license.db
macOS: ~/Library/Application Support/NuevoGaleno/license.db
Linux: ~/.local/share/NuevoGaleno/license.db
```

**Tablas:**

1. **license_info** - Información de licencia activada
2. **trial_info** - Fecha de inicio del período de prueba

## 🔄 Flujo de Trabajo

### Primera instalación

1. Usuario inicia la app por primera vez
2. No hay licencia ni trial → Muestra watermark/banner
3. Usuario puede:
   - Activar licencia → Diálogo de activación
   - Iniciar trial → 30 días de uso completo

### Activación de licencia

1. Usuario ingresa license key + email
2. App llama a Lemon Squeezy API `/licenses/activate`
3. Se valida:
   - Key válida
   - Email coincide con el comprador
   - Store/Product ID correctos
   - Hay activaciones disponibles
4. Se guarda localmente:
   - License key
   - Instance ID
   - Customer email
   - Respuesta API (para offline)

### Validación periódica

1. Cada 24 horas (configurable)
2. Intenta validar online con `/licenses/validate`
3. Si hay conexión:
   - Actualiza cache local
   - Verifica estado (active, expired, disabled)
4. Si no hay conexión:
   - Usa cache (hasta 7 días)
   - Marca como "offline mode"

### Modo offline

1. Usuario sin internet
2. App usa última validación en cache
3. Período de gracia: 7 días
4. Después de 7 días → Forzar validación online

## 🎨 Personalización UI

### Watermark

Personaliza posición y estilo en `LicenseWatermark.tsx`:

```tsx
<div className="fixed bottom-8 right-8 ...">
  {/* Cambiar posición: top-8, left-8, etc. */}
</div>
```

### Colores de estado

En `LicenseStatusIndicator.tsx`:

```tsx
const getStatusColor = () => {
  if (isActive && isLicensed) return 'bg-green-500';  // Activa
  if (isTrial && trialDaysRemaining > 7) return 'bg-blue-500';  // Trial OK
  if (isTrial && trialDaysRemaining > 0) return 'bg-yellow-500';  // Trial por acabar
  return 'bg-red-500';  // Sin licencia/expirada
};
```

## 🔐 Seguridad

### Validación de producto

El sistema verifica automáticamente que la license key sea para tu producto:

```rust
if activation_response.meta.store_id != self.store_id
    || activation_response.meta.product_id != self.product_id
{
    return Err(anyhow!("Esta licencia no es válida para este producto"));
}
```

### Validación de cliente

Se verifica que el email coincida:

```rust
if activation_response.meta.customer_email != customer_email {
    return Err(anyhow!("El email no coincide con el cliente de la licencia"));
}
```

### Almacenamiento

- Las claves se almacenan localmente en SQLite
- No se exponen en logs
- La base de datos está en directorio privado de la app

## 🐛 Debug

Para probar el sistema en desarrollo:

```typescript
// En consola de dev tools
import { invoke } from '@tauri-apps/api/core';

// Ver estado
await invoke('get_license_status');

// Iniciar trial
await invoke('start_trial');

// Validar
await invoke('validate_license');
```

## 📝 Notas Importantes

1. **Reemplazar IDs**: Antes de producción, actualiza Store ID, Product ID y Variant ID reales
2. **Endpoints de soporte**: Actualiza URLs en `LicenseManagementPanel.tsx`
3. **Período de trial**: Configurable en `LEMON_SQUEEZY_CONFIG.TRIAL_DAYS`
4. **Offline grace period**: Por defecto 7 días, ajustable en `OFFLINE_GRACE_PERIOD_DAYS`
5. **Restricciones**: Personaliza según tu modelo de negocio en `LICENSE_RESTRICTIONS`

## 🆘 Troubleshooting

### La activación falla

- Verifica que Store ID, Product ID sean correctos
- Verifica que la license key sea válida en Lemon Squeezy dashboard
- Verifica que el email coincida exactamente con el de compra
- Verifica que no se hayan agotado las activaciones

### No valida online

- Verifica conexión a internet
- Verifica que la API de Lemon Squeezy esté disponible
- Revisa logs en consola de Tauri

### Modo offline no funciona

- Verifica que haya una validación exitosa previa (cache)
- Verifica que no hayan pasado más de 7 días
- Revisa la base de datos local

## 🔄 Actualización de Dependencies

Ya se agregaron al `Cargo.toml`:

```toml
reqwest = {version = "0.11", features = ["json"] }
hostname = "0.3"
```

Ejecuta:

```bash
cd src-tauri
cargo update
```

## 📚 Referencias

- [Lemon Squeezy License API Docs](https://docs.lemonsqueezy.com/guides/tutorials/license-keys)
- [Tauri Commands](https://tauri.app/v1/guides/features/command/)
- [React Hooks](https://react.dev/reference/react)

---

**¡Sistema listo para usar!** 🎉

Recuerda configurar tus IDs de Lemon Squeezy antes de deployar a producción.
