import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useSession } from '@/hooks/useSession';
import { useShell } from '@/contexts/ShellContext';
import { Wifi, Volume2, Search, Apple } from 'lucide-react';

export function MenuBar() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const { currentUser } = useSession();
    const { togglePowerMenu, toggleSearch, toggleNotifications } = useShell();

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
    };

    return (
        <div className="fixed top-0 left-0 right-0 h-7 bg-black/20 backdrop-blur-md border-b border-white/5 z-50 flex items-center justify-between px-4 text-white text-[12px] font-medium select-none">
            <div className="flex items-center gap-4 h-full">
                <button
                    onClick={() => togglePowerMenu()}
                    className="flex items-center justify-center p-1 rounded hover:bg-white/10 transition-colors"
                >
                    <Apple className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-4 h-full">
                    <span className="font-bold px-2">GalenoOS</span>
                    <button className="hover:bg-white/10 px-2 h-full transition-colors hidden sm:block">Archivo</button>
                    <button className="hover:bg-white/10 px-2 h-full transition-colors hidden sm:block">Edición</button>
                    <button className="hover:bg-white/10 px-2 h-full transition-colors hidden sm:block">Ver</button>
                    <button className="hover:bg-white/10 px-2 h-full transition-colors hidden sm:block">Ayuda</button>
                </div>
            </div>

            <div className="flex items-center gap-3 h-full">
                <div className="flex items-center gap-3 mr-2">
                    <Wifi className="w-3.5 h-3.5" />
                    <Volume2 className="w-3.5 h-3.5" />
                    <button onClick={() => toggleSearch()} className="hover:bg-white/10 p-1 rounded transition-colors">
                        <Search className="w-3.5 h-3.5" />
                    </button>
                </div>
                <div
                    onClick={() => toggleNotifications()}
                    className="flex items-center gap-2 hover:bg-white/10 px-2 h-full cursor-pointer transition-colors"
                >
                    <span>{formatDate(currentTime)}</span>
                    <span>{formatTime(currentTime)}</span>
                </div>
                {currentUser && (
                    <div className="ml-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] ring-1 ring-white/20">
                        {currentUser.name.charAt(0)}
                    </div>
                )}
            </div>
        </div>
    );
}
