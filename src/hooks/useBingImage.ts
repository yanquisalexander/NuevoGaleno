import { useEffect, useState } from 'react';

// Hook sencillo que obtiene la imagen del día (Bing) con un fallback local.
export const useBingImage = (): string => {
    const [bgUrl, setBgUrl] = useState(
        'https://images.unsplash.com/photo-1620121692029-d088224ddc74?q=80&w=2064'
    );

    useEffect(() => {
        let mounted = true;

        const fetchBingImage = async () => {
            try {
                // pedir una resolución apropiada al dispositivo para evitar descargar imágenes innecesariamente grandes
                const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? Math.ceil(window.devicePixelRatio) : 1;
                const targetWidth = (typeof window !== 'undefined')
                    ? Math.min(3840, Math.max(900, Math.round(window.innerWidth * dpr)))
                    : 1920;

                const res = await fetch(`https://bing.biturl.top/?resolution=${targetWidth}&format=json&index=0&mkt=es-ES`);
                const data = await res.json();
                const url = data?.url;
                if (!url) return;

                // Preload + decode para evitar que la actualización de background provoque jank/layout shifts
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = url;

                // Si el navegador soporta decode(), úsalo (mejor rendimiento), sino esperar onload
                if (typeof (img as any).decode === 'function') {
                    await (img as any).decode();
                } else {
                    await new Promise<void>((resolve, reject) => {
                        img.onload = () => resolve();
                        img.onerror = () => reject(new Error('failed to load image'));
                    });
                }

                if (!mounted) return;
                setBgUrl(url);
            } catch (err) {
                console.warn('useBingImage: no se pudo obtener/decodificar la imagen de Bing, usando fallback', err);
            }
        };

        fetchBingImage();

        return () => { mounted = false; };
    }, []);

    return bgUrl;
};
