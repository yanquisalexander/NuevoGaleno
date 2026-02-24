import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { CommandHandler } from '../apps/CommandShell';

interface CommandRegistry {
    register: (name: string, handler: CommandHandler) => void;
    unregister: (name: string) => void;
    getAll: () => Record<string, CommandHandler>;
}

const CommandContext = createContext<CommandRegistry | null>(null);

export function CommandProvider({ children }: { children: ReactNode }) {
    const [commands, setCommands] = useState<Record<string, CommandHandler>>({});

    const register = (name: string, handler: CommandHandler) => {
        setCommands((prev) => ({ ...prev, [name]: handler }));
    };

    const unregister = (name: string) => {
        setCommands((prev) => {
            const copy = { ...prev };
            delete copy[name];
            return copy;
        });
    };

    const getAll = () => ({ ...commands });

    return (
        <CommandContext.Provider value={{ register, unregister, getAll }}>
            {children}
        </CommandContext.Provider>
    );
}

export function useCommandRegistry(): CommandRegistry {
    const ctx = useContext(CommandContext);
    if (!ctx) {
        throw new Error('useCommandRegistry must be used within CommandProvider');
    }
    return ctx;
}

/*
Usage example (any component or initialization module):

import { useEffect } from 'react';
import { useCommandRegistry } from '../contexts/CommandContext';

function SomeInitializer() {
    const { register } = useCommandRegistry();

    useEffect(() => {
        register('foo', {
            description: 'Un comando de ejemplo',
            run: () => 'bar'
        });
    }, [register]);

    return null;
}

// Wrap your app with <CommandProvider> (usually near top-level alongside
// other providers). The shell will automatically include registered commands.
*/