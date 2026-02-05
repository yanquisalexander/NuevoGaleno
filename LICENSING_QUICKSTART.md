# 🔐 Sistema de Licenciamiento - Guía Rápida

## ⚡ Inicio Rápido

### 1. Configurar Lemon Squeezy (5 minutos)

1. **Crear cuenta en [Lemon Squeezy](https://lemonsqueezy.com)**

2. **Crear un producto** con License Keys habilitados:
   - Ve a Products → New Product
   - Activa "License keys"
   - Configura:
     - **License length**: 365 días (para suscripción anual) o permanente
     - **Activation limit**: 3 (para 3 equipos)

3. **Obtener IDs**:
   - Store ID: En Settings → General
   - Product ID: En tu producto (URL o settings)
   - Variant ID: En tu producto → Variants

### 2. Configurar la Aplicación (2 minutos)

#### a) Frontend: `src/types/licensing.ts` línea 96

```typescript
export const LEMON_SQUEEZY_CONFIG = {
  STORE_ID: 12345,      // ⚠️ REEMPLAZAR con tu Store ID
  PRODUCT_ID: 67890,    // ⚠️ REEMPLAZAR con tu Product ID
  VARIANT_ID: 11111,    // ⚠️ REEMPLAZAR con tu Variant ID
  TRIAL_DAYS: 30,
  VALIDATION_INTERVAL_HOURS: 24,
  OFFLINE_GRACE_PERIOD_DAYS: 7,
};
```

#### b) Backend: `src-tauri/src/lib.rs` línea ~420

```rust
fn get_license_manager() -> Result<licensing::LicenseManager, String> {
    let mut manager_lock = LICENSE_MANAGER.lock().unwrap();
    
    if manager_lock.is_none() {
        let store_id = 12345;    // ⚠️ REEMPLAZAR
        let product_id = 67890;  // ⚠️ REEMPLAZAR
        let variant_id = 11111;  // ⚠️ REEMPLAZAR
        
        let manager = licensing::LicenseManager::new(store_id, product_id, variant_id)
            .map_err(|e| e.to_string())?;
        *manager_lock = Some(manager);
    }
    
    Ok(manager_lock.as_ref().unwrap().clone())
}
```

### 3. Personalizar Restricciones (opcional)

En `src/types/licensing.ts` línea 108:

```typescript
export const LICENSE_RESTRICTIONS = {
  unlicensed: {
    max_patients: 10,           // ⚡ Ajustar según tu modelo
    max_appointments: 50,
    max_treatments: 20,
    can_export: false,
    can_import: false,
    // ...
  },
  trial: {
    max_patients: 100,          // ⚡ Ajustar según tu modelo
    max_appointments: 500,
    // ...
  },
  active: {
    // Sin límites
  },
};
```

### 4. Integrar en tu App

#### a) Agregar Watermark en `App.tsx`:

```tsx
import { LicenseWatermark } from '@/components/LicenseWatermark';

function App() {
  return (
    <>
      <YourAppContent />
      <LicenseWatermark />
    </>
  );
}
```

#### b) Agregar Indicador en `AppTitleBar.tsx`:

```tsx
import { LicenseStatusIndicator } from '@/components/LicenseStatusIndicator';

<div className="titlebar-right">
  <LicenseStatusIndicator />
  {/* otros controles */}
</div>
```

#### c) Agregar Panel de Admin en menú de Sistema:

```tsx
import { LicenseManagementPanel } from '@/components/LicenseManagementPanel';

// En tu router o tabs
<TabsContent value="license">
  <LicenseManagementPanel />
</TabsContent>
```

### 5. Aplicar Restricciones

```tsx
import { LicenseGuard } from '@/components/LicenseGuard';

// Proteger por feature
<LicenseGuard feature="can_export">
  <ExportButton />
</LicenseGuard>

// Proteger por límite
<LicenseGuard limitKey="max_patients" currentCount={patients.length}>
  <AddPatientButton />
</LicenseGuard>
```

### 6. Compilar

```bash
cd src-tauri
cargo build

cd ..
pnpm install
pnpm build
```

## ✅ Verificación

### Test de desarrollo:

```bash
pnpm tauri dev
```

1. Debería aparecer el watermark en esquina inferior derecha
2. Click en indicador de estado en titlebar
3. Probar "Iniciar prueba de 30 días"
4. Ir a Sistema → Licencia
5. Ver estado actualizado

### Test de activación:

1. Comprar/crear una license key de prueba en Lemon Squeezy
2. Click en "Activar ahora" en watermark
3. Ingresar:
   - License key (de Lemon Squeezy)
   - Email de compra
4. Click "Activar licencia"
5. Debería desaparecer el watermark
6. Verificar en panel de admin

## 📚 Documentación Completa

Ver [LICENSING_SYSTEM.md](./LICENSING_SYSTEM.md) para:
- Arquitectura detallada
- API Reference
- Ejemplos de integración
- Troubleshooting
- Seguridad

Ver [LICENSING_INTEGRATION_EXAMPLES.tsx](./LICENSING_INTEGRATION_EXAMPLES.tsx) para:
- Ejemplos de código completos
- Patrones de uso
- Integraciones en cada módulo

## 🎯 Archivos Creados

### Backend (Rust)
- ✅ `src-tauri/src/licensing.rs` - Lógica principal
- ✅ `src-tauri/src/lib.rs` - Comandos Tauri (modificado)
- ✅ `src-tauri/Cargo.toml` - Dependencies (modificado)

### Frontend (React/TypeScript)
- ✅ `src/types/licensing.ts` - Tipos e interfaces
- ✅ `src/hooks/useLicense.ts` - Hook principal
- ✅ `src/components/LicenseActivationDialog.tsx` - Diálogo de activación
- ✅ `src/components/LicenseWatermark.tsx` - Watermark estilo Windows
- ✅ `src/components/LicenseStatusIndicator.tsx` - Indicador en menubar
- ✅ `src/components/LicenseManagementPanel.tsx` - Panel de admin
- ✅ `src/components/LicenseGuard.tsx` - Protección de features

### Documentación
- ✅ `LICENSING_SYSTEM.md` - Documentación completa
- ✅ `LICENSING_INTEGRATION_EXAMPLES.tsx` - Ejemplos de código
- ✅ `LICENSING_QUICKSTART.md` - Esta guía

## 🚨 IMPORTANTE antes de producción

- [ ] Reemplazar Store ID, Product ID, Variant ID
- [ ] Configurar restricciones según tu modelo de negocio
- [ ] Personalizar mensajes y URLs de soporte
- [ ] Test completo del flujo de activación
- [ ] Test de modo offline
- [ ] Test de validación periódica

## 🆘 Soporte

Si encuentras problemas:

1. Revisa la consola de Tauri para errores
2. Verifica logs de Rust: `RUST_LOG=debug pnpm tauri dev`
3. Consulta [LICENSING_SYSTEM.md](./LICENSING_SYSTEM.md#troubleshooting)
4. Revisa [Lemon Squeezy Docs](https://docs.lemonsqueezy.com/guides/tutorials/license-keys)

---

**¡Sistema listo! 🎉** Solo configura tus IDs y estará funcionando.
