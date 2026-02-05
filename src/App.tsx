import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSession } from '@/hooks/useSession';
import CommandPalette from "@/components/CommandPalette";
import { useWindowManager } from "@/contexts/WindowManagerContext";
import { useNotifications } from '@/contexts/NotificationContext';
import { Desktop } from "./components/kiosk/Desktop";
import { Taskbar } from "./components/kiosk/Taskbar";
import { Dock } from "./components/kiosk/Dock";
import { MenuBar } from "./components/kiosk/MenuBar";
import { WindowContainer } from "./components/kiosk/WindowContainer";
import { SplashScreen } from "./components/SplashScreen";
import { LoginScreen } from "./components/LoginScreen";
import { LockScreen } from "./components/LockScreen";
import FirstRunWizard from "./components/FirstRunWizard";
import { APP_DEFINITIONS } from "./apps";
import { motion, AnimatePresence } from "motion/react"; // Importación actualizada
import { reminderService, formatAppointmentNotification } from './services/appointmentReminders';
import { useConfig } from '@/hooks/useConfig';
import { useShell } from '@/contexts/ShellContext';
import { SearchOverlay } from "./components/kiosk/SearchOverlay";
import { NotificationCenterPanel } from "./components/NotificationCenterPanel";
import { CalendarWidget } from "./components/kiosk/CalendarWidget";
import { PowerMenu } from "./components/kiosk/PowerMenu";
import { useAutoUpdate } from '@/hooks/useAutoUpdate';
import { LicenseWatermark } from '@/components/LicenseWatermark';
import { useLicense } from '@/hooks/useLicense';

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
  const { currentUser, exitApp, isLocked, unlock, isLoading: sessionLoading } = useSession();
  const { registerApp, openWindow } = useWindowManager();
  const { addNotification } = useNotifications();
  const { values } = useConfig();
  const {
    showSearch, setShowSearch,
    showNotifications, setShowNotifications,
    showCalendar, setShowCalendar,
    showPowerMenu, setShowPowerMenu,
    setUpdateAvailable
  } = useShell();

  const layoutStyle = (values.layoutStyle as string) || 'windows';
  const isMac = layoutStyle === 'macos';

  // Auto-update hook - checks for updates and manages state
  const { updateAvailable } = useAutoUpdate(currentStep === 'desktop');

  // License hook - validate on app start
  const { getLicenseStatus } = useLicense();

  // Sync update state to ShellContext
  useEffect(() => {
    setUpdateAvailable(updateAvailable);
  }, [updateAvailable, setUpdateAvailable]);

  // Validar licencia al iniciar la app
  useEffect(() => {
    if (currentStep === 'desktop') {
      getLicenseStatus().catch(err => console.error('Error checking license:', err));
    }
  }, [currentStep, getLicenseStatus]);

  const handleShutdown = async () => {
    setShowPowerMenu(false);
    try {
      await exitApp();
    } catch (error) {
      console.error('Error saliendo:', error);
    }
  };

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
            className="fixed inset-0 z-50 bg-slate-950 overflow-hidden"
          >
            {/* Background Layer similar to LoginScreen */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 scale-105"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1620121692029-d088224ddc74?q=80&w=2064')`
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-950/50" />

            {/* El Wizard se montará encima con su propio backdrop blur */}
            <div className="relative z-10 w-full h-full">
              <FirstRunWizard onFinish={() => setCurrentStep('login')} />
            </div>
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
            {isMac && <MenuBar />}
            <Desktop layout={layoutStyle} />
            <WindowContainer />
            {isMac ? <Dock /> : <Taskbar />}

            {/* --- COMPONENTES GLOBALES DEL SHELL --- */}
            <SearchOverlay
              isOpen={showSearch}
              onClose={() => setShowSearch(false)}
            />
            <NotificationCenterPanel
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
            />
            <CalendarWidget
              isOpen={showCalendar}
              onClose={() => setShowCalendar(false)}
            />
            <PowerMenu
              isOpen={showPowerMenu}
              onClose={() => setShowPowerMenu(false)}
              onSuspend={() => { }}
              onShutdown={handleShutdown}
              onRestart={() => { }}
            />
            <LicenseWatermark />
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
    <KioskContent />
  );
}

export default App;