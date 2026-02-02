import { useWindowManager } from '../../contexts/WindowManagerContext';
import { Window } from './Window';

export function WindowContainer() {
    const { windows, apps } = useWindowManager();

    return (
        <div className="fixed inset-0 top-0 bottom-14 pointer-events-none">
            {windows.map(window => {
                const app = apps.get(window.appId);
                if (!app) return null;

                const AppComponent = app.component;

                return (
                    <div key={window.id} className="pointer-events-auto">
                        <Window
                            windowId={window.id}
                            title={window.title || app.name}
                            icon={<span className="text-lg">{app.icon}</span>}
                        >
                            <AppComponent windowId={window.id} data={window.data} />
                        </Window>
                    </div>
                );
            })}
        </div>
    );
}
