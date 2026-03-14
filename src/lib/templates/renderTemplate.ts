import { TEMPLATE_VARIABLES, TemplateType } from '@/types/templates';

export type TemplateRenderValues = Record<string, string | number | null | undefined>;

export function renderTemplateContent(content: string, values: TemplateRenderValues) {
    return content.replace(/{{\s*([\w.-]+)\s*}}/g, (_, key: string) => {
        const value = values[key];

        if (value === null || value === undefined) {
            return '';
        }

        return String(value);
    });
}

export function buildTemplateExampleValues(templateType: TemplateType, overrides: TemplateRenderValues = {}) {
    const baseValues = Object.fromEntries(
        (TEMPLATE_VARIABLES[templateType] ?? []).map((variable) => [
            variable.key,
            variable.example ?? variable.label,
        ])
    );

    return {
        ...baseValues,
        ...overrides,
    };
}
