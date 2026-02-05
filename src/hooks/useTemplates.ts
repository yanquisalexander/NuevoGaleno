import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Template, CreateTemplateInput, UpdateTemplateInput } from '@/types/templates';

export function useTemplates() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadTemplates = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await invoke<Template[]>('get_all_templates');
            setTemplates(data);
        } catch (error) {
            console.error('Error loading templates:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const getTemplateById = useCallback(async (id: number): Promise<Template | null> => {
        try {
            return await invoke('get_template_by_id', { id });
        } catch (error) {
            console.error('Error loading template:', error);
            return null;
        }
    }, []);

    const getTemplatesByType = useCallback(async (type: string): Promise<Template[]> => {
        try {
            return await invoke('get_templates_by_type', { templateType: type });
        } catch (error) {
            console.error('Error loading templates by type:', error);
            return [];
        }
    }, []);

    const createTemplate = useCallback(async (input: CreateTemplateInput): Promise<Template> => {
        try {
            const newTemplate = await invoke<Template>('create_template', { input });
            setTemplates(prev => [...prev, newTemplate]);
            return newTemplate;
        } catch (error) {
            console.error('Error creating template:', error);
            throw error;
        }
    }, []);

    const updateTemplate = useCallback(async (id: number, input: UpdateTemplateInput): Promise<void> => {
        try {
            await invoke('update_template', { id, input });
            setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...input } : t));
        } catch (error) {
            console.error('Error updating template:', error);
            throw error;
        }
    }, []);

    const deleteTemplate = useCallback(async (id: number): Promise<void> => {
        try {
            await invoke('delete_template', { id });
            setTemplates(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error('Error deleting template:', error);
            throw error;
        }
    }, []);

    const setDefaultTemplate = useCallback(async (id: number, type: string): Promise<void> => {
        try {
            await invoke('set_default_template', { id, templateType: type });
            setTemplates(prev => prev.map(t => ({
                ...t,
                is_default: t.type === type ? t.id === id : t.is_default
            })));
        } catch (error) {
            console.error('Error setting default template:', error);
            throw error;
        }
    }, []);

    return {
        templates,
        isLoading,
        loadTemplates,
        getTemplateById,
        getTemplatesByType,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        setDefaultTemplate,
    };
}
