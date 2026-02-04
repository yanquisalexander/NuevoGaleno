# Galeno Update - Sistema de Actualización Automática

Este sistema implementa actualizaciones automáticas para Nuevo Galeno utilizando Tauri Updater y GitHub Releases.

## 🚀 Características

- ✅ **Actualización automática** desde GitHub Releases
- ✅ **Interfaz moderna** estilo Windows 11 Update
- ✅ **Descarga con progreso** en tiempo real
- ✅ **Instalación automática** con reinicio de la aplicación
- ✅ **Firmas digitales** para seguridad
- ✅ **GitHub Actions** para builds automáticos

## 🔧 Configuración Inicial

### 1. Generar Claves de Firma

Las claves de firma garantizan que solo actualizaciones autorizadas sean instaladas.

```bash
# Instalar Tauri CLI si no lo tienes
cargo install tauri-cli --version "^2.0.0"

# Generar par de claves (pública/privada)
cargo tauri signer generate -w ~/.tauri/nuevogaleno.key
```

Este comando generará:
- **Clave privada**: Guardada en `~/.tauri/nuevogaleno.key` (¡NUNCA LA COMPARTAS!)
- **Clave pública**: Mostrada en consola
- **Contraseña**: Para proteger la clave privada

### 2. Configurar Secrets de GitHub

Ve a tu repositorio en GitHub → Settings → Secrets and variables → Actions

Agrega estos secrets:

| Secret | Descripción | Valor |
|--------|-------------|-------|
| `TAURI_PRIVATE_KEY` | Clave privada generada | Contenido del archivo `~/.tauri/nuevogaleno.key` |
| `TAURI_KEY_PASSWORD` | Contraseña de la clave | La contraseña que usaste al generar |

### 3. Configurar tauri.conf.json

Actualiza la configuración con tu información:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/TU_USUARIO/TU_REPO/releases/latest/download/latest.json"
      ],
      "dialog": false,
      "pubkey": "TU_CLAVE_PUBLICA_AQUI"
    }
  }
}
```

Reemplaza:
- `TU_USUARIO`: Tu usuario de GitHub
- `TU_REPO`: El nombre de tu repositorio
- `TU_CLAVE_PUBLICA_AQUI`: La clave pública generada en el paso 1

## 📦 Crear un Release

### Opción 1: Mediante Tag (Automático)

```bash
# Actualizar versión en package.json y Cargo.toml
# Ejemplo: "version": "0.2.0"

# Crear y pushear tag
git tag v0.2.0
git push origin v0.2.0
```

El GitHub Action se ejecutará automáticamente y creará el release.

### Opción 2: Workflow Manual

1. Ve a Actions → Release
2. Click en "Run workflow"
3. Selecciona la rama
4. El Action compilará y creará el release

## 📝 Estructura de Archivos Generados

Cuando creas un release, GitHub Actions genera:

```
nombre-de-tu-repo/releases/tag/v0.2.0/
├── Nuevo Galeno_0.2.0_x64-setup.nsis.zip     # Instalador
├── Nuevo Galeno_0.2.0_x64-setup.nsis.zip.sig # Firma del instalador
└── latest.json                                # Metadatos del update
```

## 🎨 Uso de la Aplicación

### Para Usuarios

1. Abre **Configuración** (⚙️) desde el escritorio
2. Puedes abrir **Galeno Update** desde el menú de aplicaciones
3. Click en **Buscar Actualizaciones**
4. Si hay una actualización disponible:
   - Verás la nueva versión y notas del release
   - Click en **Descargar e instalar**
   - La aplicación se reiniciará automáticamente

### Para Desarrolladores

El updater usa las APIs oficiales de `@tauri-apps/plugin-updater`:

```typescript
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

// Verificar actualización
const update = await check();

if (update?.available) {
  console.log(`Nueva versión ${update.version} disponible`);
  
  // Descargar e instalar con progreso
  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case 'Started':
        console.log('Descarga iniciada');
        break;
      case 'Progress':
        console.log(`Progreso: ${event.data.chunkLength} bytes`);
        break;
      case 'Finished':
        console.log('Instalación completada');
        break;
    }
  });
  
  // Reiniciar la app
  await relaunch();
}
```

También puedes abrir la ventana de actualizaciones desde el código:

```typescript
import { useWindowManager } from '@/contexts/WindowManagerContext';

const { openWindow } = useWindowManager();
openWindow('galeno-update');
```

## 🔍 Verificación Automática

El hook `useAutoUpdate` verifica automáticamente las actualizaciones al iniciar:

```typescript
import { useAutoUpdate } from '@/hooks/useAutoUpdate';

// En tu componente principal
useAutoUpdate(true); // Verifica al iniciar después de 5 segundos
```

## 🐛 Solución de Problemas

### Error: "Invalid signature"

- Verifica que la `pubkey` en `tauri.conf.json` sea correcta
- Asegúrate de que los secrets de GitHub estén configurados correctamente

### Error: "Failed to download update"

- Verifica que el endpoint en `tauri.conf.json` sea correcto
- Comprueba que el release esté publicado (no borrador)

### Error: "Update not available"

- Verifica que la versión en el release sea mayor que la actual
- Asegúrate de que `latest.json` exista en el release

### La app no se reinicia después de actualizar

- Esto es normal en modo desarrollo
- En producción, la app se reinicia automáticamente

## 📚 Recursos

- [Tauri Updater Docs](https://v2.tauri.app/plugin/updater/)
- [GitHub Actions for Tauri](https://github.com/tauri-apps/tauri-action)
- [Código de firma digital](https://v2.tauri.app/plugin/updater/#signing-updates)

## 🎯 Ejemplo de Flujo Completo

1. **Desarrollo**: Haces cambios en el código
2. **Versión**: Actualizas `package.json` y `Cargo.toml`
3. **Commit**: `git commit -am "feat: nueva característica"`
4. **Tag**: `git tag v0.3.0 && git push origin v0.3.0`
5. **GitHub Action**: Se ejecuta automáticamente
6. **Release**: Se crea con instalador firmado
7. **Usuarios**: Reciben notificación de actualización
8. **Actualización**: Usuarios instalan con un click

## 🔐 Seguridad

- ✅ Todas las actualizaciones están **firmadas digitalmente**
- ✅ Solo actualizaciones de tu repositorio de GitHub
- ✅ Verificación automática de firmas antes de instalar
- ✅ HTTPS para todas las descargas

## 📄 Licencia

Este sistema es parte de Nuevo Galeno.
