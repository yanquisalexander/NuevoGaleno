import { useWindowManager } from '../../contexts/WindowManagerContext';
import { useConfig } from '../../hooks/useConfig';
import { Window } from './Window';
import { useSession } from '@/hooks/useSession';

export function WindowContainer() {
    const { windows, apps } = useWindowManager();
    const { values } = useConfig();
    const { getUserPreferences } = useSession();

    const userPrefs = getUserPreferences();
    const layoutStyle = (userPrefs.layout_style as string) || (values.layoutStyle as string) || 'windows';
    const isMac = layoutStyle === 'macos';

    return (
        <div className={`fixed inset-0 ${isMac ? 'top-7 bottom-20' : 'top-0 bottom-12'} pointer-events-none`}>
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
