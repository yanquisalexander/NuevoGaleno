import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSession } from './hooks/useSession';
import CommandPalette from "./components/CommandPalette";
import { WindowManagerProvider, useWindowManager } from "./contexts/WindowManagerContext";
import { NotificationProvider } from './contexts/NotificationContext';
import { NotificationCenter } from './components/NotificationCenter';
import { Desktop } from "./components/kiosk/Desktop";
import { Taskbar } from "./components/kiosk/Taskbar";
import { WindowContainer } from "./components/kiosk/WindowContainer";
import { SplashScreen } from "./components/SplashScreen";
import { LoginScreen } from "./components/LoginScreen";
import FirstRunWizard from "./components/FirstRunWizard";
import { TilingShortcutsHelp } from "./components/TilingShortcutsHelp";
import { APP_DEFINITIONS } from "./apps";
import { motion, AnimatePresence } from "motion/react"; // Importación actualizada

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
}

function KioskContent() {
  const [openCommandPalette, setOpenCommandPalette] = useState(false);
  const [currentStep, setCurrentStep] = useState<'splash' | 'setup' | 'login' | 'desktop'>('splash');
  const { currentUser, login: sessionLogin } = useSession();
  const { registerApp, openWindow } = useWindowManager();

  // Registro de apps
  useEffect(() => {
    APP_DEFINITIONS.forEach(app => registerApp(app));
  }, [registerApp]);

  // Lógica de verificación de usuarios (simplificada para el ejemplo)
  const checkSystemState = async () => {
    try {
      const users: User[] = await invoke('list_users');
      if (users.length === 0) {
        setCurrentStep('setup');
      } else {
        setCurrentStep('login');
      }
    } catch (error) {
      setCurrentStep('setup');
    }
  };

  const handleLogin = (user: User) => {
    // La sesión ya se estableció en LoginScreen via sessionLogin
    setCurrentStep('desktop');
  };

  return (
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
  );
}

function App() {
  return (
    <div className="ng-layout-base h-dvh w-full overflow-hidden bg-[#1c1c1c]">
      <NotificationProvider>
        <WindowManagerProvider>
          <KioskContent />
          <NotificationCenter />
        </WindowManagerProvider>
      </NotificationProvider>
    </div>
  );
}

export default App;