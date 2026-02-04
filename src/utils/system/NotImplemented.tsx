import { useCallback } from "react";
import { UI_SOUNDS } from "@/consts/Sounds";
import { useNotifications } from "@/contexts/NotificationContext";

export function useNotImplemented() {
    const { addNotification } = useNotifications();

    return useCallback(() => {
        addNotification({
            type: "error",
            title: "🚧 Funcionalidad no implementada",
            message: "Esta funcionalidad aún no ha sido implementada.",
            duration: 5000,
            sound: true,
            soundFile: UI_SOUNDS.SYSTEM_WARN
        });
    }, [addNotification]);
}