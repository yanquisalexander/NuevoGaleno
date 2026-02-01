import { useEffect, useState } from "react";
import { appDataDir } from "@tauri-apps/api/path";
import { openPath as tauriOpen } from "@tauri-apps/plugin-opener";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const [search, setSearch] = useState("");

    const handleOpenAppDir = async () => {
        try {
            const dir = await appDataDir();
            await tauriOpen(dir);
        } catch (error) {
            console.error("Error opening app directory:", error);
        }
        onOpenChange(false);
    };

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
            <CommandInput
                placeholder="Buscar comandos..."
                value={search}
                onValueChange={setSearch}
            />
            <CommandList>
                <CommandEmpty>No se encontraron comandos.</CommandEmpty>
                <CommandGroup heading="Desarrollador">
                    <CommandItem onSelect={handleOpenAppDir}>
                        Abrir directorio de la app
                    </CommandItem>
                    {/* Agregar más comandos aquí */}
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
