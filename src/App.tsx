import { useState, useEffect } from "react";
import { Toaster } from 'sonner';
import FirstRunWizard from "./components/FirstRunWizard";
import { AppTitleBar } from "./components/AppTitleBar";
import CommandPalette from "./components/CommandPalette";

function App() {
  const [openCommandPalette, setOpenCommandPalette] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setOpenCommandPalette(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="ng-layout-base h-dvh w-full">
      <div className="ng-appbar">
        <AppTitleBar />
      </div>

      <main className="ng-layout-content p-4 overflow-auto">
        <Toaster position="top-right" />

        <FirstRunWizard onFinish={() => { }} />

        <CommandPalette open={openCommandPalette} onOpenChange={setOpenCommandPalette} />

      </main>
    </div>
  );
}

export default App;