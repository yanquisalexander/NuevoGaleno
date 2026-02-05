import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from '@/hooks/useSession';
import { useShell } from '@/contexts/ShellContext';
import { useMenuBar } from '@/contexts/MenuBarContext';
import { Wifi, Volume2, Search, Apple, ChevronDown } from 'lucide-react';
import type { MenuBarMenu } from '@/types/menubar';
import { MenuBarClock } from './MenuBarClock';

export function MenuBar() {
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const { currentUser } = useSession();
    const { togglePowerMenu, toggleSearch, toggleNotifications } = useShell();
    const { currentMenuBar } = useMenuBar();

    const handleMenuClick = (menuId: string) => {
        setOpenMenuId(openMenuId === menuId ? null : menuId);
    };

    const handleItemClick = (action?: () => void) => {
        if (action) {
            action();
        }
        setOpenMenuId(null);
    };

    const renderMenu = (menu: MenuBarMenu) => {
        const isOpen = openMenuId === menu.id;

        return (
            <div key={menu.id} className="relative h-full">
                <button
                    onClick={() => handleMenuClick(menu.id)}
                    className={`hover:bg-white/10 px-2 h-full transition-colors hidden sm:flex items-center gap-1 ${isOpen ? 'bg-white/10' : ''
                        }`}
                >
                    {menu.label}
                </button>

                <AnimatePresence>
                    {isOpen && menu.items.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.1 }}
                            className="absolute top-full left-0 mt-0.5 bg-[#2d2d2d] border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[200px] backdrop-blur-xl"
                            onMouseLeave={() => setOpenMenuId(null)}
                        >
                            {menu.items.map((item, index) => {
                                if (item.type === 'separator') {
                                    return (
                                        <div
                                            key={`${item.id}-${index}`}
                                            className="h-px bg-white/10 my-1"
                                        />
                                    );
                                }

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleItemClick(item.action)}
                                        disabled={item.disabled}
                                        className={`w-full px-3 py-1.5 text-left hover:bg-white/10 transition-colors flex items-center justify-between text-[12px] ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                    >
                                        <span>{item.label}</span>
                                        {item.shortcut && (
                                            <span className="text-white/50 text-[11px] ml-4">
                                                {item.shortcut}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
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
                <div className="flex items-center gap-0 h-full">
                    <span className="font-bold px-2">{currentMenuBar?.appName || 'GalenoOS'}</span>
                    {currentMenuBar?.menus.map((menu) => renderMenu(menu))}
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
                <MenuBarClock onClick={() => toggleNotifications()} />
                {currentUser && (
                    <div className="ml-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] ring-1 ring-white/20">
                        {currentUser.name.charAt(0)}
                    </div>
                )}
            </div>
        </div>
    );
}
