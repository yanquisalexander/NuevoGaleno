# Sistema de Logging y Manejo de Errores

## Resumen

El sistema de logging está completamente integrado con el logger de Tauri, capturando automáticamente todos los errores de la aplicación.

## Componentes

### 1. **ErrorBoundary** (`src/components/ErrorBoundary.tsx`)
Componente React que captura errores en el árbol de componentes y los registra en Tauri.

**Características**:
- Captura errores en componentes hijos
- Registra automáticamente en el logger de Tauri
- Muestra UI de error amigable
- Permite recuperación o recarga de la app

### 2. **Error Logging System** (`src/utils/errorLogging.ts`)
Sistema de captura de errores globales.

**Características**:
- Attach de console methods a Tauri logger
- Captura errores no manejados (`window.error`)
- Captura promesas rechazadas (`unhandledrejection`)
- Captura violaciones CSP
- Override de `console.error`, `console.warn`, `console.info`

### 3. **Logger Utilities** (`src/utils/logger.ts`)
Re-exportación de funciones de logging para uso en toda la app.

## Uso

### Importar funciones de logging

```typescript
import { error, warn, info, debug, trace } from '@/utils/logger';
import { logAppError, logAppWarning, logAppInfo } from '@/utils/logger';
```

### Logging manual en componentes

```typescript
import { error, info } from '@/utils/logger';

function MyComponent() {
  const handleAction = async () => {
    try {
      await someAsyncOperation();
      await info('Operation completed successfully');
    } catch (err) {
      await error(`Operation failed: ${err.message}`);
      // O usar la función helper
      // await logAppError(err as Error, 'MyComponent.handleAction');
    }
  };
  
  return <button onClick={handleAction}>Action</button>;
}
```

### Usar Error Boundary personalizado

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div>
          <h1>Custom Error UI</h1>
          <p>{error.message}</p>
          <button onClick={reset}>Try Again</button>
        </div>
      )}
    >
      <YourApp />
    </ErrorBoundary>
  );
}
```

### Logging helpers

```typescript
import { logAppError, logAppWarning, logAppInfo } from '@/utils/logger';

// Log de error con contexto
try {
  await riskyOperation();
} catch (error) {
  await logAppError(error as Error, 'UserProfile.save');
}

// Log de warning
await logAppWarning('User attempted invalid action', 'SecurityCheck');

// Log de info
await logAppInfo('User logged in successfully', 'Authentication');
```

## Errores automáticamente capturados

### ✅ Ya están siendo capturados:
- Errores en componentes React (Error Boundary)
- Errores no manejados (`window.error`)
- Promesas rechazadas sin catch (`unhandledrejection`)
- Errores en console.error/warn/info
- Violaciones de Content Security Policy

### 📁 Ubicación de logs

Los logs se guardan automáticamente en:
```
Windows: C:\Users\<usuario>\AppData\Roaming\dev.alexitoo.nuevogaleno\logs\
```

Cada sesión crea un archivo con timestamp:
```
nuevogaleno_2026-02-05_14-30-45.log
```

## Mejores prácticas

### ✅ Hacer:
```typescript
// Usar async/await con logging
try {
  await operation();
  await info('Success');
} catch (err) {
  await error(`Failed: ${err.message}`);
}

// Proporcionar contexto en errores
await logAppError(err, 'FeatureName.functionName');

// Log de operaciones importantes
await info('User started checkout process');
```

### ❌ No hacer:
```typescript
// No usar console.log para producción (usa info)
console.log('Something happened'); // ❌

// Mejor:
await info('Something happened'); // ✅

// No silenciar errores sin log
try {
  await operation();
} catch (err) {
  // ❌ Silenciar error
}

// Mejor:
try {
  await operation();
} catch (err) {
  await logAppError(err as Error, 'Context'); // ✅
  throw err; // Re-throw si es necesario
}
```

## Integración en la app

El sistema está completamente integrado en `main.tsx`:

1. ✅ Error Boundary rodea toda la app
2. ✅ `initErrorLogging()` se ejecuta antes del render
3. ✅ Todos los console methods redirigen a Tauri
4. ✅ Errores globales son capturados automáticamente

## Testing

Para probar el sistema de errores:

```typescript
// Probar Error Boundary
function BuggyComponent() {
  throw new Error('Test Error Boundary');
}

// Probar unhandled rejection
Promise.reject('Test unhandled rejection');

// Probar console.error
console.error('Test console error logging');
```

Los logs aparecerán automáticamente en los archivos de log de Tauri.
