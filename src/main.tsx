import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import { ConfigProvider } from "./contexts/ConfigContext";
import { ShellProvider } from "./contexts/ShellContext";
import { SessionProvider } from "./contexts/SessionContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { WindowManagerProvider } from "./contexts/WindowManagerContext";
import { MenuBarProvider } from "./contexts/MenuBarContext";
import { NodeProvider } from "./contexts/NodeContext";
import { NotificationCenter } from "./components/NotificationCenter";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initErrorLogging } from "./utils/errorLogging";

// Inicializar el sistema de logging antes de renderizar
initErrorLogging().then(() => {
  console.info('NuevoGaleno - Application starting');

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <ErrorBoundary>
      <div className="ng-layout-base h-dvh w-full overflow-hidden bg-[#1c1c1c]">
        <ConfigProvider>
          <NodeProvider>
            <ShellProvider>
              <SessionProvider>
                <NotificationProvider>
                  <MenuBarProvider>
                    <WindowManagerProvider>
                      <App />
                      <NotificationCenter />
                    </WindowManagerProvider>
                  </MenuBarProvider>
                </NotificationProvider>
              </SessionProvider>
            </ShellProvider>
          </NodeProvider>
        </ConfigProvider>
      </div>
    </ErrorBoundary>
  );
}).catch((error) => {
  console.error('Failed to initialize error logging:', error);

  // Renderizar de todas formas aunque falle el logging
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <ErrorBoundary>
      <div className="ng-layout-base h-dvh w-full overflow-hidden bg-[#1c1c1c]">
        <ConfigProvider>
          <NodeProvider>
            <ShellProvider>
              <SessionProvider>
                <NotificationProvider>
                  <MenuBarProvider>
                    <WindowManagerProvider>
                      <App />
                      <NotificationCenter />
                    </WindowManagerProvider>
                  </MenuBarProvider>
                </NotificationProvider>
              </SessionProvider>
            </ShellProvider>
          </NodeProvider>
        </ConfigProvider>
      </div>
    </ErrorBoundary>
  );
});
