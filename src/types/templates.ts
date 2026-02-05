export type TemplateType = 'receipt' | 'invoice' | 'prescription' | 'report' | 'other';

export interface TemplateVariable {
    key: string;
    label: string;
    description?: string;
    example?: string;
}

export interface Template {
    id: number;
    name: string;
    type: TemplateType;
    content: string; // HTML content del template
    variables: string[]; // Array de variables disponibles para este template
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateTemplateInput {
    name: string;
    type: TemplateType;
    content: string;
    variables?: string[];
    is_default?: boolean;
}

export interface UpdateTemplateInput {
    name?: string;
    type?: TemplateType;
    content?: string;
    variables?: string[];
    is_default?: boolean;
}

// Variables predefinidas disponibles para los templates
export const TEMPLATE_VARIABLES: Record<string, TemplateVariable[]> = {
    receipt: [
        { key: 'receipt_number', label: 'Número de Recibo', example: '00123' },
        { key: 'receipt_date', label: 'Fecha del Recibo', example: '01/02/2026' },
        { key: 'patient_name', label: 'Nombre del Paciente', example: 'Juan Pérez' },
        { key: 'patient_id', label: 'ID del Paciente', example: '12345' },
        { key: 'amount', label: 'Monto', example: '$1,500.00' },
        { key: 'payment_method', label: 'Método de Pago', example: 'Efectivo' },
        { key: 'concept', label: 'Concepto', example: 'Consulta general' },
        { key: 'notes', label: 'Notas', example: 'Pago parcial' },
        { key: 'clinic_name', label: 'Nombre de la Clínica', example: 'Clínica Dental' },
        { key: 'clinic_address', label: 'Dirección de la Clínica', example: 'Av. Principal 123' },
        { key: 'clinic_phone', label: 'Teléfono de la Clínica', example: '555-1234' },
        { key: 'doctor_name', label: 'Nombre del Doctor', example: 'Dr. García' },
    ],
    invoice: [
        { key: 'invoice_number', label: 'Número de Factura', example: 'INV-001' },
        { key: 'invoice_date', label: 'Fecha de Factura', example: '01/02/2026' },
        { key: 'due_date', label: 'Fecha de Vencimiento', example: '15/02/2026' },
        { key: 'patient_name', label: 'Nombre del Paciente', example: 'Juan Pérez' },
        { key: 'patient_address', label: 'Dirección del Paciente', example: 'Calle 123' },
        { key: 'treatment_description', label: 'Descripción del Tratamiento', example: 'Limpieza dental' },
        { key: 'subtotal', label: 'Subtotal', example: '$1,500.00' },
        { key: 'tax', label: 'Impuestos', example: '$240.00' },
        { key: 'total', label: 'Total', example: '$1,740.00' },
        { key: 'clinic_name', label: 'Nombre de la Clínica', example: 'Clínica Dental' },
        { key: 'clinic_tax_id', label: 'RFC/NIT de la Clínica', example: 'ABC123456XYZ' },
    ],
};

// Template por defecto para recibos
export const DEFAULT_RECEIPT_TEMPLATE = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; color: #333;">{{clinic_name}}</h1>
        <p style="margin: 5px 0; color: #666;">{{clinic_address}}</p>
        <p style="margin: 5px 0; color: #666;">Tel: {{clinic_phone}}</p>
    </div>
    
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 10px 0; color: #333;">RECIBO DE PAGO</h2>
        <div style="display: flex; justify-content: space-between;">
            <span><strong>No. Recibo:</strong> {{receipt_number}}</span>
            <span><strong>Fecha:</strong> {{receipt_date}}</span>
        </div>
    </div>
    
    <div style="margin-bottom: 20px;">
        <p><strong>Paciente:</strong> {{patient_name}}</p>
        <p><strong>ID Paciente:</strong> {{patient_id}}</p>
    </div>
    
    <div style="margin-bottom: 20px;">
        <p><strong>Concepto:</strong> {{concept}}</p>
        <p><strong>Método de Pago:</strong> {{payment_method}}</p>
    </div>
    
    <div style="background: #e8f4f8; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <h3 style="margin: 0; text-align: right; font-size: 24px;">Total: {{amount}}</h3>
    </div>
    
    <div style="margin-bottom: 20px;">
        <p><strong>Notas:</strong> {{notes}}</p>
    </div>
    
    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc;">
        <p style="color: #666; font-size: 12px;">Gracias por su pago</p>
        <p style="color: #666; font-size: 12px;">{{doctor_name}}</p>
    </div>
</div>
`;
