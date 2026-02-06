# Configuración de Variantes de Licencia desde Rust

## Descripción General

El sistema de licenciamiento ahora obtiene toda su configuración desde el lado de Rust, incluyendo el soporte para múltiples variantes de producto (ej: Basic, Professional, Enterprise).

## Cambios Realizados

### 1. Backend (Rust)

#### `src-tauri/src/licensing.rs`

Se agregaron nuevas estructuras para manejar variantes y configuración:

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicenseVariant {
    pub id: i64,
    pub name: String,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LemonSqueezyConfig {
    pub store_id: i64,
    pub product_id: i64,
    pub variants: Vec<LicenseVariant>,
    pub trial_days: i64,
    pub validation_interval_hours: i64,
    pub offline_grace_period_days: i64,
}
```

**LicenseManager actualizado:**

- Ya no recibe `store_id`, `product_id`, `variant_id` por separado
- Ahora recibe un `LemonSqueezyConfig` completo en el constructor
- Método `get_config()` para exponer la configuración al frontend
- Validación actualizada para verificar contra cualquiera de las variantes permitidas:

```rust
// Verificar que la variante sea una de las permitidas
let is_valid_variant = self.config.variants
    .iter()
    .any(|v| v.id == activation_response.meta.variant_id);
```

#### `src-tauri/src/lib.rs`

**Nueva función de inicialización:**

```rust
fn get_license_manager() -> Result<licensing::LicenseManager, String> {
    let mut manager_lock = LICENSE_MANAGER.lock().unwrap();
    
    if manager_lock.is_none() {
        let config = licensing::LemonSqueezyConfig {
            store_id: 0, // TODO: Tu Store ID
            product_id: 0, // TODO: Tu Product ID
            variants: vec![
                licensing::LicenseVariant {
                    id: 0, // Variant ID para licencia Mensual
                    name: "Mensual".to_string(),
                    description: "Licencia mensual con renovación automática".to_string(),
                },
                licensing::LicenseVariant {
                    id: 0, // Variant ID para licencia Anual
                    name: "Anual".to_string(),
                    description: "Licencia anual con descuento".to_string(),
                },
                licensing::LicenseVariant {
                    id: 0, // Variant ID para licencia Vitalicia
                    name: "Vitalicia".to_string(),
                    description: "Licencia de por vida, pago único".to_string(),
                },
            ],
            trial_days: 14,
            validation_interval_hours: 24,
            offline_grace_period_days: 7,
        };
        
        let manager = licensing::LicenseManager::new(config)
            .map_err(|e| e.to_string())?;
        *manager_lock = Some(manager);
    }
    
    Ok(manager_lock.as_ref().unwrap().clone())
}
```

**Nuevo comando Tauri:**

```rust
#[tauri::command]
fn get_lemon_squeezy_config() -> Result<licensing::LemonSqueezyConfig, String> {
    let manager = get_license_manager()?;
    Ok(manager.get_config())
}
```

### 2. Frontend (TypeScript)

#### `src/types/licensing.ts`

Nuevas interfaces agregadas:

```typescript
export interface LicenseVariant {
    id: number;
    name: string;
    description: string;
}

export interface LemonSqueezyConfig {
    store_id: number;
    product_id: number;
    variants: LicenseVariant[];
    trial_days: number;
    validation_interval_hours: number;
    offline_grace_period_days: number;
}
```

La constante `LEMON_SQUEEZY_CONFIG` ahora está marcada como **deprecated** y debe reemplazarse con `getLemonSqueezyConfig()`.

#### `src/hooks/useLicense.ts`

Actualizaciones en el hook:

```typescript
const [config, setConfig] = useState<LemonSqueezyConfig | null>(null);

// Nueva función para cargar configuración
const loadConfig = useCallback(async () => {
    try {
        const lsConfig = await invoke<LemonSqueezyConfig>('get_lemon_squeezy_config');
        setConfig(lsConfig);
        return lsConfig;
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('Error loading Lemon Squeezy config:', errorMsg);
        return null;
    }
}, []);
```

El hook ahora retorna:
- `config`: Configuración de Lemon Squeezy con las variantes disponibles
- `loadConfig()`: Función para recargar la configuración

## Configuración de Lemon Squeezy

### Paso 1: Obtener IDs de Lemon Squeezy

1. Accede a tu dashboard de Lemon Squeezy
2. Ve a **Settings > Stores** y copia tu **Store ID**
3. Ve a **Products** y selecciona tu producto, copia el **Product ID**
4. En el producto, ve a **Variants** y copia los **Variant IDs** de cada licencia:
   - Mensual (Monthly)
   - Anual (Yearly/Annual)
   - Vitalicia (Lifetime)

### Paso 2: Actualizar la Configuración en Rust

Edita `src-tauri/src/lib.rs` en la función `get_license_manager()`:

```rust
let config = licensing::LemonSqueezyConfig {
    store_id: 12345, // Tu Store ID
    product_id: 67890, // Tu Product ID
    variants: vec![
        licensing::LicenseVariant {
            id: 111111, // Variant ID de licencia Mensual
            name: "Mensual".to_string(),
            description: "Licencia mensual con renovación automática".to_string(),
        },
        licensing::LicenseVariant {
            id: 222222, // Variant ID de licencia Anual
            name: "Anual".to_string(),
            description: "Licencia anual con descuento".to_string(),
        },
        licensing::LicenseVariant {
            id: 333333, // Variant ID de licencia Vitalicia
            name: "Vitalicia".to_string(),
            description: "Licencia de por vida, pago único".to_string(),
        },
    ],
    trial_days: 14,
    validation_interval_hours: 24,
    offline_grace_period_days: 7,
};
```

### Paso 3: Uso en el Frontend

```typescript
import { useLicense } from '@/hooks/useLicense';

function LicenseActivationDialog() {
    const { config, activateLicense } = useLicense();

    if (!config) {
        return <div>Cargando configuración...</div>;
    }

    return (
        <div>
            <h2>Selecciona tu plan</h2>
            {config.variants.map(variant => (
                <div key={variant.id}>
                    <h3>{variant.name}</h3>
                    <p>{variant.description}</p>
                </div>
            ))}
            <p>Periodo de prueba: {config.trial_days} días</p>
        </div>
    );
}
```

## Validación de Licencias

Cuando un usuario activa una licencia, el sistema:

1. Verifica que el `store_id` y `product_id` coincidan con la configuración
2. Verifica que el `variant_id` sea uno de los permitidos en `config.variants`
3. Si ambas validaciones pasan, la licencia se activa correctamente

Esto permite que una sola instancia del software acepte licencias de cualquiera de las 3 variantes configuradas.

## Ventajas

✅ **Configuración centralizada**: Todos los valores están en un solo lugar (Rust)  
✅ **Soporte multi-variante**: Una sola build acepta múltiples planes de licencia  
✅ **Type-safe**: TypeScript conoce la estructura completa de la configuración  
✅ **Flexible**: Fácil agregar/quitar variantes sin cambiar la lógica  
✅ **Seguro**: Los IDs no se exponen en el código JavaScript (están compilados en Rust)

## Próximos Pasos

1. **Obtener IDs reales de Lemon Squeezy** y reemplazar los `0` en la configuración
2. **Diseñar UI** para mostrar las variantes disponibles al usuario
3. **Implementar restricciones por variante** (ej: Basic tiene límites, Professional no)
4. **Testing** con licencias reales de cada variante

## Notas Importantes

- Los IDs en la configuración actual están en `0` y deben ser reemplazados
- El sistema valida contra **cualquiera** de las variantes configuradas
- La metadata de Lemon Squeezy incluye `variant_name` que puedes usar en la UI
- El periodo de prueba (`trial_days`) aplica independientemente de la variante
