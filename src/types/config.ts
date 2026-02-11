export type ConfigValueType = 'string' | 'integer' | 'float' | 'boolean' | 'enum';

export interface ConfigDefinition {
    type: ConfigValueType;
    default: string | number | boolean | null;
    description: string;
    ui_section?: string;
    admin_only?: boolean;
    user_preference?: boolean;
    choices?: Array<string | number | boolean>;
    min?: number;
    max?: number;
}
