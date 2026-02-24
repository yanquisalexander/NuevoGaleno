export const UI_SOUNDS = {
    GALENO_BOOT: 'galeno-boot.mp3',
    ALERT_05: 'Alert-05.mp3',
    SYSTEM_WARN: 'system-warn.mp3',
} as const;

export type UISound = (typeof UI_SOUNDS)[keyof typeof UI_SOUNDS];

// Mapping of themes to file names. The inner object is keyed by the
// *value* of a UISound (i.e. the actual filename constant) rather than the
// UI_SOUNDS property name. using the value allows callers to pass the string
// directly without having to convert between key/value forms.
export const SOUND_THEMES: Record<string, Partial<Record<UISound, string>>> = {
    default: {
        [UI_SOUNDS.GALENO_BOOT]: 'galeno-boot.mp3',
        [UI_SOUNDS.ALERT_05]: 'Alert-05.mp3',
        [UI_SOUNDS.SYSTEM_WARN]: 'system-warn.mp3',
    },
    nature: {
        [UI_SOUNDS.GALENO_BOOT]: 'nature-galeno-boot.mp3',
        [UI_SOUNDS.ALERT_05]: 'Alert-05.mp3',
        [UI_SOUNDS.SYSTEM_WARN]: 'system-warn.mp3',
    }
};

export function getSoundFile(sound: UISound, theme: string = 'default'): string {
    // make theme lookup case-insensitive and strip whitespace so that
    // preferences like "Nature" or " nature " still resolve correctly.
    const key = theme?.toString().trim().toLowerCase();

    const mapped = SOUND_THEMES[key]?.[sound];
    if (mapped && mapped !== sound) {
        // helpful for debugging which file is actually being used
        // (won't log on production builds unless console is open)
        console.debug(`getSoundFile: theme=\"${key}\" sound=\"${sound}\" mapped=\"${mapped}\"`);
        return mapped;
    }

    // fall back to the raw sound constant (default behaviour)
    console.debug(`getSoundFile: theme=\"${key}\" sound=\"${sound}\" using default`);
    return sound;
}

// Legacy function kept for backwards compatibility. Prefer using usePlaySound hook.
export const playSound = (sound: UISound, volume: number = 1) => {
    const audio = new Audio(`/sounds/${sound}`);

    audio.volume = Math.min(1, Math.max(0, volume));

    audio.play().catch((err) => {
        console.warn('No se pudo reproducir el sonido:', err);
    });
};
