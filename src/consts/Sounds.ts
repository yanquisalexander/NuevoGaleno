export const UI_SOUNDS = {
    GALENO_BOOT: 'galeno_boot.mp3',
} as const;

export type UISound = (typeof UI_SOUNDS)[keyof typeof UI_SOUNDS];

export const playSound = (sound: UISound, volume: number = 1) => {
    const audio = new Audio(`/sounds/${sound}`);

    audio.volume = Math.min(1, Math.max(0, volume));

    audio.play().catch((err) => {
        console.warn('No se pudo reproducir el sonido:', err);
    });
};
