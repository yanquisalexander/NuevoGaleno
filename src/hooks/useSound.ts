import { useSessionContext } from '../contexts/SessionContext';
import { UISound, getSoundFile, UI_SOUNDS } from '../consts/Sounds';

export type PlayFunction = (sound: UISound, volume?: number) => void;

// Hook that returns a play function respecting user preferences (theme & boot sound)
export function usePlaySound(): PlayFunction {
    const { getUserPreferences } = useSessionContext();

    return (sound: UISound, volume: number = 1) => {
        const prefs = getUserPreferences();
        // make sure we don't accidentally carry leftover whitespace or
        // unexpected casing from the stored preferences.
        let theme = (prefs.sound_theme as string) || 'default';
        theme = theme.toString().trim().toLowerCase();
        const playBoot = prefs.play_boot_sound !== false; // default true

        if (sound === UI_SOUNDS.GALENO_BOOT && !playBoot) {
            return; // user disabled boot sound
        }

        const file = getSoundFile(sound, theme);
        // debugging helper: if the wrong file is played we can inspect logs
        console.debug(`usePlaySound: requested ${sound} volume=${volume} theme=${theme} -> ${file}`);
        const audio = new Audio(`/sounds/${file}`);
        audio.volume = Math.min(1, Math.max(0, volume));
        audio.play().catch((err) => {
            console.warn('No se pudo reproducir el sonido:', err);
        });
    };
}
