import { useState, useEffect, useCallback, useRef } from 'react';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

export interface WallpaperImage {
    url: string;
    name: string;
    photographer: string;
    location: string;
}

export type WallpaperProviderType = 'chromecast' | 'bing' | 'predefined';

export interface WallpaperProvider {
    type: WallpaperProviderType;
    name: string;
    fetchWallpapers: () => Promise<WallpaperImage[]>;
}

// Timeout para fetches
const FETCH_TIMEOUT = 10000;

// Helper para fetch con timeout
const fetchWithTimeout = async (url: string, timeout: number = FETCH_TIMEOUT) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await tauriFetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

// Normalizar URL de Google (http -> https)
const normalizeUrl = (url: string) => url.replace('http://', 'https://');

// Proveedor Chromecast
const chromecastProvider: WallpaperProvider = {
    type: 'chromecast',
    name: 'Chromecast Images',
    fetchWallpapers: async (): Promise<WallpaperImage[]> => {
        const CHROMECAST_API = 'https://chromecastbg.alexmeub.com/images.v9.json';

        try {
            const response = await fetchWithTimeout(CHROMECAST_API);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data: WallpaperImage[] = await response.json();
            return data.map(img => ({ ...img, url: normalizeUrl(img.url) }));
        } catch (error) {
            console.error('[ChromecastProvider] Failed to fetch wallpapers:', error);
            throw error;
        }
    }
};

// Proveedor Bing Image of the Day
const bingProvider: WallpaperProvider = {
    type: 'bing',
    name: 'Bing Image of the Day',
    fetchWallpapers: async (): Promise<WallpaperImage[]> => {
        const BING_API = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=en-US';

        try {
            const response = await fetchWithTimeout(BING_API);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();

            return data.images.map((img: any) => ({
                url: `https://www.bing.com${img.url}`,
                name: img.title || 'Bing Image',
                photographer: img.copyright?.split('(')[0]?.trim() || 'Bing',
                location: img.title || 'Unknown'
            }));
        } catch (error) {
            console.error('[BingProvider] Failed to fetch wallpapers:', error);
            throw error;
        }
    }
};

// Proveedor Predefinidos
const predefinedProvider: WallpaperProvider = {
    type: 'predefined',
    name: 'Predefined Wallpapers',
    fetchWallpapers: async (): Promise<WallpaperImage[]> => {
        // Lista de wallpapers predefinidos (URLs de Unsplash o similares)
        const predefinedWallpapers: WallpaperImage[] = [
            {
                url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
                name: 'Mountain Landscape',
                photographer: 'Unsplash',
                location: 'Mountains'
            },
            {
                url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
                name: 'Forest Path',
                photographer: 'Unsplash',
                location: 'Forest'
            },
            {
                url: 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5',
                name: 'Ocean Waves',
                photographer: 'Unsplash',
                location: 'Ocean'
            },
            {
                url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
                name: 'Desert Dunes',
                photographer: 'Unsplash',
                location: 'Desert'
            },
            {
                url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29',
                name: 'City Skyline',
                photographer: 'Unsplash',
                location: 'City'
            }
        ];

        return predefinedWallpapers;
    }
};

// Mapa de proveedores
const providers: Record<WallpaperProviderType, WallpaperProvider> = {
    chromecast: chromecastProvider,
    bing: bingProvider,
    predefined: predefinedProvider
};

export const useWallpaper = (providerType: WallpaperProviderType = 'chromecast') => {
    const [wallpapers, setWallpapers] = useState<WallpaperImage[]>([]);
    const [currentWallpaper, setCurrentWallpaper] = useState<string>('');
    const [prevWallpaper, setPrevWallpaper] = useState<string>('');
    const [wallpaperInfo, setWallpaperInfo] = useState<WallpaperImage | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Referencias para evitar ciclos
    const usedIndices = useRef<Set<number>>(new Set());
    const wallpapersRef = useRef<WallpaperImage[]>([]);
    const isChangingRef = useRef(false);

    // Actualizar ref cuando wallpapers cambie
    useEffect(() => {
        wallpapersRef.current = wallpapers;
    }, [wallpapers]);

    // Función para cambiar wallpaper
    const changeWallpaper = useCallback((dataList?: WallpaperImage[]) => {
        const list = dataList || wallpapersRef.current;
        if (list.length === 0 || isChangingRef.current) return;

        isChangingRef.current = true;

        // Lógica para no repetir hasta agotar la lista
        if (usedIndices.current.size >= list.length) usedIndices.current.clear();

        let randomIndex: number;
        do {
            randomIndex = Math.floor(Math.random() * list.length);
        } while (usedIndices.current.has(randomIndex));

        usedIndices.current.add(randomIndex);
        const nextData = list[randomIndex];
        const nextUrl = nextData.url;

        // Precarga de imagen
        const img = new Image();
        img.src = nextUrl;
        img.onload = () => {
            console.log(`[WallpaperProvider] Wallpaper loaded: ${nextData.location}`);
            setCurrentWallpaper((prev) => {
                setPrevWallpaper(prev);
                return nextUrl;
            });
            setWallpaperInfo(nextData);

            // Tiempo de la animación (1.5s) + margen
            setTimeout(() => {
                setPrevWallpaper('');
                isChangingRef.current = false;
            }, 1600);
        };
        img.onerror = (err) => {
            console.error('[WallpaperProvider] Error loading wallpaper image:', nextUrl, err);
            isChangingRef.current = false;
            // Intentar otra imagen
            changeWallpaper(list);
        };
    }, []);

    // Fetch wallpapers del proveedor actual
    const fetchWallpapers = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const provider = providers[providerType];
            const data = await provider.fetchWallpapers();
            setWallpapers(data);
            changeWallpaper(data);
        } catch (err) {
            console.error(`[WallpaperProvider] Error fetching from ${providerType}:`, err);
            setError(`Error loading wallpapers from ${providerType}`);
            // Fallback a predefined si falla
            if (providerType !== 'predefined') {
                console.warn('[WallpaperProvider] Falling back to predefined wallpapers');
                try {
                    const fallbackData = await predefinedProvider.fetchWallpapers();
                    setWallpapers(fallbackData);
                    changeWallpaper(fallbackData);
                } catch (fallbackErr) {
                    console.error('[WallpaperProvider] Fallback also failed:', fallbackErr);
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, [providerType, changeWallpaper]);

    // Efecto para cargar wallpapers cuando cambia el provider
    useEffect(() => {
        fetchWallpapers();
    }, [fetchWallpapers]);

    return {
        wallpapers,
        currentWallpaper,
        prevWallpaper,
        wallpaperInfo,
        isLoading,
        error,
        changeWallpaper: () => changeWallpaper(),
        refetch: fetchWallpapers,
        providers: Object.values(providers)
    };
};