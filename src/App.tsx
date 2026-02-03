import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSession } from './hooks/useSession';
import { SessionProvider } from './contexts/SessionContext';
import CommandPalette from "./components/CommandPalette";
import { WindowManagerProvider, useWindowManager } from "./contexts/WindowManagerContext";
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { NotificationCenter } from './components/NotificationCenter';
import { Desktop } from "./components/kiosk/Desktop";
import { Taskbar } from "./components/kiosk/Taskbar";
import { WindowContainer } from "./components/kiosk/WindowContainer";
import { SplashScreen } from "./components/SplashScreen";
import { LoginScreen } from "./components/LoginScreen";
import { LockScreen } from "./components/LockScreen";
import FirstRunWizard from "./components/FirstRunWizard";
import { APP_DEFINITIONS } from "./apps";
import { motion, AnimatePresence } from "motion/react"; // Importación actualizada
import { reminderService, formatAppointmentNotification } from './services/appointmentReminders';

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
}

function KioskContent() {
  const [openCommandPalette, setOpenCommandPalette] = useState(false);
  const [currentStep, setCurrentStep] = useState<'splash' | 'setup' | 'login' | 'desktop'>('splash');
  const [isInitialLock, setIsInitialLock] = useState(false);
  const { currentUser, isLocked, unlock, isLoading: sessionLoading } = useSession();
  const { registerApp, openWindow } = useWindowManager();
  const { addNotification } = useNotifications();

  // Registro de apps
  useEffect(() => {
    APP_DEFINITIONS.forEach(app => registerApp(app));
  }, [registerApp]);

  // Refs para evitar dependencias que causen reinicios del servicio
  const addNotificationRef = useRef(addNotification);
  const openWindowRef = useRef(openWindow);

  useEffect(() => {
    addNotificationRef.current = addNotification;
    openWindowRef.current = openWindow;
  }, [addNotification, openWindow]);

  // Inicializar servicio de recordatorios global (solo una vez cuando el usuario inicia sesión)
  useEffect(() => {
    if (currentStep !== 'desktop' || !currentUser) {
      reminderService.stop();
      return;
    }

    const handleReminder = (notification: any) => {
      const { title, message } = formatAppointmentNotification(notification.appointment);

      const notificationId = addNotificationRef.current({
        type: 'info',
        title,
        message,
        icon: '📅',
        priority: 'high',
        duration: 0,
        actions: [
          {
            label: 'Ver Cita',
            onClick: () => {
              openWindowRef.current('appointments', {
                appointmentId: notification.appointment.id,
                action: 'view'
              });
            },
          },
          {
            label: 'Cerrar',
            onClick: () => { },
          },
        ],
      });

      reminderService.markReminderSent(notification.reminder.id!, notificationId);
    };

    reminderService.start(handleReminder);

    return () => {
      reminderService.stop();
    };
  }, [currentStep, currentUser]);

  // Lógica de verificación de usuarios
  const checkSystemState = async () => {
    try {
      const users: User[] = await invoke('list_users');
      if (users.length === 0) {
        setCurrentStep('setup');
      } else {
        // Si hay usuarios en el sistema, mostrar lockscreen primero (estilo Windows 10/11)
        setIsInitialLock(true);
        setCurrentStep('login');
      }
    } catch (error) {
      setCurrentStep('setup');
    }
  };

  // Sincronizar estado cuando la sesión termine de cargar
  useEffect(() => {
    if (!sessionLoading && currentStep === 'login' && currentUser) {
      setCurrentStep('desktop');
    }
  }, [sessionLoading, currentUser, currentStep]);

  // Si el usuario cierra sesión (currentUser es null), volver a login sin lockscreen
  useEffect(() => {
    if (!sessionLoading && !currentUser && currentStep === 'desktop') {
      setCurrentStep('login');
      setIsInitialLock(false); // NO mostrar lockscreen al cerrar sesión
    }
  }, [currentUser, currentStep, sessionLoading]);

  const handleLogin = (_user: User) => {
    // La sesión ya se estableció en LoginScreen via sessionLogin
    setCurrentStep('desktop');
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {/* 1. SPLASH SCREEN */}
        {currentStep === 'splash' && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100]"
          >
            <SplashScreen onComplete={checkSystemState} />
          </motion.div>
        )}

        {/* 2. SETUP WIZARD */}
        {currentStep === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#000000]"
          >
            <FirstRunWizard onFinish={() => setCurrentStep('login')} />
          </motion.div>
        )}

        {/* 3. LOGIN SCREEN */}
        {currentStep === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, filter: "blur(20px)", scale: 1.1 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40"
          >
            <LoginScreen onLogin={handleLogin} />
          </motion.div>
        )}

        {/* 4. DESKTOP / MAIN APP */}
        {currentStep === 'desktop' && (
          <motion.div
            key="desktop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="relative h-full w-full"
          >
            <CommandPalette open={openCommandPalette} onOpenChange={setOpenCommandPalette} />
            <Desktop />
            <WindowContainer />
            <Taskbar />
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOCK SCREEN (renderizado fuera de AnimatePresence para que aparezca sobre el desktop o login) */}
      <AnimatePresence>
        {(isLocked || isInitialLock) && (currentStep === 'desktop' || currentStep === 'login') && (
          <motion.div
            key="lockscreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150]"
          >
            <LockScreen
              user={currentUser || undefined}
              onUnlock={async (password, isPin) => {
                if (currentUser) {
                  await unlock(password, isPin);
                }
                setIsInitialLock(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function App() {
  return (
    <div className="ng-layout-base h-dvh w-full overflow-hidden bg-[#1c1c1c]">
      <SessionProvider>
        <NotificationProvider>
          <WindowManagerProvider>
            <KioskContent />
            <NotificationCenter />
          </WindowManagerProvider>
        </NotificationProvider>
      </SessionProvider>
    </div>
  );
}

export default App;