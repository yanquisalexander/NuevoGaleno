# Sistema de Gestión de Plantillas

## Descripción General

El sistema de gestión de plantillas permite crear, editar y administrar plantillas personalizables para documentos como recibos, facturas, recetas médicas y reportes. Las plantillas utilizan un sistema de variables que se reemplazan dinámicamente con información real al momento de imprimir.

## Características Principales

### 1. **Editor WYSIWYG**
- Editor visual basado en TipTap con capacidades avanzadas de formato
- Barra de herramientas con opciones de:
  - Formato de texto (negrita, cursiva, subrayado)
  - Alineación de texto (izquierda, centro, derecha)
  - Listas ordenadas y sin ordenar
  - Encabezados (H1, H2)
  - Deshacer/Rehacer

### 2. **Sistema de Variables**
Las variables se insertan en el formato `{{nombre_variable}}` y se reemplazan automáticamente con datos reales.

#### Variables Disponibles para Recibos:
- `{{receipt_number}}` - Número de Recibo
- `{{receipt_date}}` - Fecha del Recibo
- `{{patient_name}}` - Nombre del Paciente
- `{{patient_id}}` - ID del Paciente
- `{{amount}}` - Monto
- `{{payment_method}}` - Método de Pago
- `{{concept}}` - Concepto
- `{{notes}}` - Notas
- `{{clinic_name}}` - Nombre de la Clínica
- `{{clinic_address}}` - Dirección de la Clínica
- `{{clinic_phone}}` - Teléfono de la Clínica
- `{{doctor_name}}` - Nombre del Doctor

#### Variables Disponibles para Facturas:
- `{{invoice_number}}` - Número de Factura
- `{{invoice_date}}` - Fecha de Factura
- `{{due_date}}` - Fecha de Vencimiento
- `{{patient_name}}` - Nombre del Paciente
- `{{patient_address}}` - Dirección del Paciente
- `{{treatment_description}}` - Descripción del Tratamiento
- `{{subtotal}}` - Subtotal
- `{{tax}}` - Impuestos
- `{{total}}` - Total
- `{{clinic_name}}` - Nombre de la Clínica
- `{{clinic_tax_id}}` - RFC/NIT de la Clínica

### 3. **Tipos de Plantillas**
- **Recibo** - Para pagos y recibos de pago
- **Factura** - Para facturación formal
- **Receta** - Para prescripciones médicas
- **Reporte** - Para reportes médicos
- **Otro** - Para cualquier otro tipo de documento

### 4. **Funcionalidades de Gestión**
- Crear nuevas plantillas desde cero
- Editar plantillas existentes
- Duplicar plantillas
- Eliminar plantillas
- Establecer plantilla predeterminada por tipo
- Vista previa en tiempo real

## Uso del Sistema

### Acceso a la Gestión de Plantillas
1. Navegar a **Configuración** en el menú principal
2. Hacer clic en **"Gestionar Plantillas"** en la sección "Plantillas de Documentos"

### Crear una Nueva Plantilla
1. Clic en **"Nueva Plantilla"**
2. Ingresar nombre descriptivo
3. Seleccionar tipo de plantilla
4. Usar el editor WYSIWYG para diseñar el contenido
5. Insertar variables desde el selector desplegable
6. Guardar la plantilla

### Editar una Plantilla
1. Seleccionar la plantilla de la lista
2. Clic en el botón **"Editar"**
3. Realizar los cambios necesarios
4. Guardar cambios

### Establecer Plantilla Predeterminada
1. Seleccionar la plantilla deseada
2. Clic en el icono de **estrella** (⭐)
3. La plantilla se marcará como predeterminada para su tipo

### Imprimir un Recibo
1. Navegar al historial de pagos de un paciente
2. Seleccionar el pago para el cual desea generar el recibo
3. Clic en **"Imprimir"**
4. Seleccionar plantilla (se usa la predeterminada automáticamente)
5. Revisar vista previa
6. Clic en **"Imprimir"** para enviar a la impresora

## Estructura Técnica

### Frontend (TypeScript/React)

#### Tipos
```typescript
// src/types/templates.ts
- Template
- TemplateVariable
- CreateTemplateInput
- UpdateTemplateInput
- TemplateType
```

#### Componentes
```typescript
// src/components/templates/
- TemplateManager.tsx    // Gestor principal
- TemplateEditor.tsx     // Editor WYSIWYG
- PrintReceipt.tsx       // Modal de impresión
```

#### Hooks
```typescript
// src/hooks/useTemplates.ts
- loadTemplates()
- getTemplateById()
- getTemplatesByType()
- createTemplate()
- updateTemplate()
- deleteTemplate()
- setDefaultTemplate()
```

### Backend (Rust/Tauri)

#### Base de Datos
```sql
-- Tabla templates
CREATE TABLE templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    variables TEXT NOT NULL DEFAULT '[]',
    is_default BOOLEAN NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

#### Comandos Tauri
```rust
// src-tauri/src/lib.rs
- get_all_templates()
- get_template_by_id()
- get_templates_by_type()
- create_template()
- update_template()
- delete_template()
- set_default_template()
```

## Plantilla Predeterminada

El sistema incluye una plantilla predeterminada para recibos que se puede usar como punto de partida:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1>{{clinic_name}}</h1>
        <p>{{clinic_address}}</p>
        <p>Tel: {{clinic_phone}}</p>
    </div>
    
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
        <h2>RECIBO DE PAGO</h2>
        <p><strong>No. Recibo:</strong> {{receipt_number}}</p>
        <p><strong>Fecha:</strong> {{receipt_date}}</p>
    </div>
    
    <div>
        <p><strong>Paciente:</strong> {{patient_name}}</p>
        <p><strong>Concepto:</strong> {{concept}}</p>
        <p><strong>Método de Pago:</strong> {{payment_method}}</p>
    </div>
    
    <div style="background: #e8f4f8; padding: 15px;">
        <h3 style="text-align: right;">Total: {{amount}}</h3>
    </div>
</div>
```

## Extensibilidad

El sistema está diseñado para ser fácilmente extensible:

1. **Nuevos Tipos de Plantillas**: Agregar nuevos valores al enum `TemplateType`
2. **Nuevas Variables**: Agregar entradas en el objeto `TEMPLATE_VARIABLES`
3. **Personalización del Proceso de Impresión**: Modificar el componente `PrintReceipt`

## Integración con Módulo de Pagos

El sistema se integra directamente con el módulo de pagos:

```typescript
// En PaymentHistory.tsx
<PrintReceipt
    payment={paymentData}
    patientName={patientName}
    onClose={() => setPrintingPayment(null)}
/>
```

Las variables se mapean automáticamente desde los datos del pago y del paciente.

## Notas de Implementación

- Las plantillas se almacenan como HTML en la base de datos
- El reemplazo de variables es seguro y se realiza mediante expresiones regulares
- Solo una plantilla puede ser predeterminada por tipo
- Las plantillas eliminadas no afectan los documentos ya impresos
- El sistema soporta estilos inline CSS en las plantillas

## Próximas Mejoras

Posibles mejoras futuras:
- Soporte para imágenes en plantillas
- Más tipos de plantillas (órdenes de laboratorio, consentimientos, etc.)
- Exportación/Importación de plantillas
- Versionado de plantillas
- Vista previa con datos de ejemplo
- Soporte para plantillas multi-idioma
