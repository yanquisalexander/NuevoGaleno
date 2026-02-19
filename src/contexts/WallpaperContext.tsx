import React, { createContext, useContext } from 'react';
import { useWallpaper, WallpaperProviderType } from '@/hooks/useWallpaper';
import { useSession } from '@/hooks/useSession';

type WallpaperContextType = ReturnType<typeof useWallpaper> & { providerType: WallpaperProviderType };

const WallpaperContext = createContext<WallpaperContextType | undefined>(undefined);

export function WallpaperProvider({ children }: { children: React.ReactNode }) {
    const { getUserPreferences } = useSession();
    const userPrefs = getUserPreferences();
    const provider = (userPrefs.wallpaper_provider as WallpaperProviderType) || 'bing';

    const wallpaper = useWallpaper(provider);

    // Añadimos providerType por conveniencia
    const value: WallpaperContextType = { ...wallpaper, providerType: provider } as any;

    return (
        <WallpaperContext.Provider value={value}>
            {children}
        </WallpaperContext.Provider>
    );
}

export function useWallpaperContext() {
    const ctx = useContext(WallpaperContext);
    if (!ctx) throw new Error('useWallpaperContext must be used within WallpaperProvider');
    return ctx;
}

export default WallpaperProvider;
