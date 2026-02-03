import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
    User,
    ArrowRight,
    Eye,
    EyeOff,
    Wifi,
    Battery,
    ChevronLeft,
    Command,
    UserCircle
} from 'lucide-react';

// --- Interfaces ---
interface UserData {
    id: number;
    username: string;
    name: string;
    role: string;
    pin?: string;
    active?: boolean;
    // Usaremos gradientes oscuros para los avatares
    avatarGradient?: string;
}

interface LoginScreenProps {
    onLogin: (user: UserData) => void;
}

// --- Componente de Reloj para la Barra de Estado (Versión Dark) ---
const Clock = () => {
    const [date, setDate] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setDate(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-end text-slate-200">
            <span className="text-sm font-semibold tabular-nums">
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-xs font-medium text-slate-400">
                {date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
        </div>
    );
};

// --- Pantalla Principal ---
export function LoginScreen({ onLogin }: LoginScreenProps) {
    // Estados
    const { login, loginWithPin } = useSession();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<UserData[]>([]);
    const [isPinMode, setIsPinMode] = useState(false);

    // Estado visual: 'selection' (elegir usuario) | 'password' (ingresar clave)
    const [viewState, setViewState] = useState<'selection' | 'password'>('selection');
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

    // Cargar preferencia de modo de login del localStorage
    useEffect(() => {
        const savedMode = localStorage.getItem('lastLoginMode');
        if (savedMode === 'pin') {
            setIsPinMode(true);
        }
    }, []);

    // Carga de usuarios
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const userList: UserData[] = await invoke('list_users');
                // Gradientes oscuros para los avatares
                const gradients = [
                    'from-blue-900 to-slate-900 text-blue-300',
                    'from-teal-900 to-slate-900 text-teal-300',
                    'from-indigo-900 to-slate-900 text-indigo-300',
                    'from-violet-900 to-slate-900 text-violet-300'
                ];

                const enhancedUsers = userList
                    .filter(u => u.active)
                    .map((u, i) => ({ ...u, avatarGradient: gradients[i % gradients.length] }));

                setUsers(enhancedUsers);

                // Si solo hay un usuario, ir directo al login
                if (enhancedUsers.length === 1) {
                    handleSelectUser(enhancedUsers[0]);
                }
            } catch (error) {
                console.error('Error cargando usuarios:', error);
            }
        };
        loadUsers();
    }, []);

    const handleSelectUser = (user: UserData) => {
        setSelectedUser(user);
        setUsername(user.username);

        // Si el usuario tiene PIN, priorizar modo PIN
        if (user.pin) {
            const savedMode = localStorage.getItem('lastLoginMode');
            setIsPinMode(savedMode === 'pin' || savedMode === null);
        } else {
            setIsPinMode(false);
        }

        setViewState('password');
        // Pequeño delay para enfocar el input visualmente
        setTimeout(() => document.getElementById('password-input')?.focus(), 100);
    };

    const handleBackToSelection = () => {
        setViewState('selection');
        setPassword('');
        setSelectedUser(null);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;
        setLoading(true);

        try {
            let user: UserData;

            if (isPinMode) {
                // Login con PIN
                user = await loginWithPin(username, password) as UserData;
                // Guardar preferencia de modo
                localStorage.setItem('lastLoginMode', 'pin');
            } else {
                // Login con contraseña
                user = await login(username, password) as UserData;
                // Guardar preferencia de modo
                localStorage.setItem('lastLoginMode', 'password');
            }

            onLogin(user);
        } catch (err: any) {
            toast.error('Credenciales incorrectas', {
                description: isPinMode
                    ? 'Por favor verifique su PIN e intente nuevamente.'
                    : 'Por favor verifique su contraseña e intente nuevamente.',
                className: 'bg-slate-900 text-white border-slate-800'
            });
            setPassword('');
        } finally {
            setLoading(false);
        }
    };

    return (
        // Fondo general oscuro
        <div className="fixed inset-0 overflow-hidden font-sans bg-slate-950 selection:bg-blue-500/30 selection:text-blue-200">

            {/* --- Background Layer Dark Mode --- */}
            {/* Usamos el wallpaper de Windows 11 oscuro original o un degradado oscuro */}
            <div
                className="absolute inset-0 bg-cover bg-center opacity-30 scale-105 transition-all duration-700"
                style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1620121692029-d088224ddc74?q=80&w=2064')`, // Wallpaper original dark
                    filter: viewState === 'password' ? 'blur(8px) brightness(0.7)' : 'blur(0px) brightness(1)'
                }}
            />
            {/* Overlay oscuro para asegurar legibilidad */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-950/50" />

            {/* --- Status Bar (Kiosk OS Dark Feel) --- */}
            <div className="relative z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-black/20 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg shadow-blue-900/30">
                        <Command size={18} />
                    </div>
                    <span className="font-bold text-slate-200 tracking-tight">Nuevo Galeno <span className="text-blue-400 font-light">OS</span></span>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 text-slate-400">
                        <Wifi size={18} />
                        <Battery size={18} className="rotate-90" />
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <Clock />
                </div>
            </div>

            {/* --- Main Content Area --- */}
            <div className="relative z-10 flex flex-col items-center justify-center h-[calc(100vh-80px)] w-full p-4">

                <div className="w-full max-w-4xl transition-all duration-500 ease-out">

                    {/* --- VISTA 1: Selector de Usuarios (Grid Dark) --- */}
                    {viewState === 'selection' && (
                        <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="mb-12 text-center space-y-2">
                                <h1 className="text-4xl font-thin text-white tracking-tight">Bienvenido</h1>
                                <p className="text-slate-400 text-lg font-light">¿Quién está iniciando sesión?</p>
                            </div>

                            <div className="flex flex-wrap justify-center gap-6 w-full max-w-3xl">
                                {users.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleSelectUser(user)}
                                        className="group relative flex flex-col items-center w-44 p-5 rounded-2xl bg-white/5 border border-white/10 shadow-2xl shadow-black/20 hover:bg-white/10 hover:border-blue-500/50 hover:-translate-y-1 transition-all duration-300"
                                    >
                                        {/* Avatar con gradiente oscuro */}
                                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-5 text-2xl font-bold bg-gradient-to-br shadow-inner border border-white/5 transition-transform group-hover:scale-105 ${user.avatarGradient || 'from-slate-800 to-black text-slate-300'}`}>
                                            {user.name.charAt(0)}
                                        </div>
                                        <span className="font-medium text-slate-100 text-lg truncate w-full text-center group-hover:text-blue-300 transition-colors">
                                            {user.name}
                                        </span>
                                        <span className="text-sm text-slate-400 font-medium bg-black/30 px-3 py-1 rounded-full mt-3 border border-white/5">
                                            {user.role}
                                        </span>
                                    </button>
                                ))}

                                {/* Botón "Manual" Dark */}
                                <button
                                    onClick={() => {
                                        setUsername('');
                                        setViewState('password');
                                        setTimeout(() => document.getElementById('username-input')?.focus(), 100);
                                    }}
                                    className="group flex flex-col items-center justify-center w-44 p-5 rounded-2xl border-2 border-dashed border-white/20 hover:border-blue-400/50 hover:bg-blue-900/10 transition-all text-slate-400 hover:text-blue-300"
                                >
                                    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors">
                                        <UserCircle size={32} className="opacity-80" />
                                    </div>
                                    <span className="text-sm font-medium">Otro usuario</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- VISTA 2: Formulario de Contraseña (Dark Glass) --- */}
                    {viewState === 'password' && (
                        <div className="flex flex-col items-center animate-in slide-in-from-right-8 duration-300">
                            {/* Contenedor estilo cristal oscuro */}
                            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] w-full max-w-md relative">

                                {/* Botón Volver Dark */}
                                {users.length > 0 && (
                                    <button
                                        onClick={handleBackToSelection}
                                        className="absolute top-6 left-6 text-slate-500 hover:text-slate-200 transition-colors flex items-center gap-1 text-sm font-medium"
                                    >
                                        <ChevronLeft size={16} /> Volver
                                    </button>
                                )}

                                <div className="flex flex-col items-center mb-10 mt-4">
                                    <div className={`w-28 h-28 rounded-full flex items-center justify-center mb-5 text-4xl font-bold shadow-lg border-2 border-white/5 ${selectedUser?.avatarGradient || 'bg-slate-800 text-slate-400'}`}>
                                        {selectedUser ? selectedUser.name.charAt(0) : <User />}
                                    </div>
                                    <h2 className="text-3xl font-light text-white tracking-tight">
                                        {selectedUser ? selectedUser.name : 'Ingreso Manual'}
                                    </h2>
                                    {selectedUser && (
                                        <p className="text-blue-300/80 text-sm mt-1 font-mono">
                                            @{selectedUser.username}
                                        </p>
                                    )}
                                </div>

                                <form onSubmit={handleLogin} className="space-y-6">
                                    {!selectedUser && (
                                        <div className="relative group">
                                            <Input
                                                id="username-input"
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                placeholder="Nombre de usuario"
                                                // Estilos dark para input
                                                className="h-14 px-5 bg-white/5 border-white/10 focus-visible:ring-blue-500/50 focus-visible:border-blue-500 rounded-xl text-white placeholder:text-slate-500 text-lg transition-all"
                                                autoFocus
                                            />
                                        </div>
                                    )}

                                    <div className="relative group">
                                        <Input
                                            id="password-input"
                                            type={isPinMode ? "password" : (showPassword ? "text" : "password")}
                                            value={password}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (isPinMode) {
                                                    // Solo permitir dígitos en modo PIN y máximo 6
                                                    const digitsOnly = value.replace(/\D/g, '');
                                                    if (digitsOnly.length <= 6) {
                                                        setPassword(digitsOnly);
                                                    }
                                                } else {
                                                    setPassword(value);
                                                }
                                            }}
                                            placeholder={isPinMode ? "PIN" : "Contraseña"}
                                            className="h-14 px-5 pr-14 bg-white/5 border-white/10 focus-visible:ring-blue-500/50 focus-visible:border-blue-500 rounded-xl text-white placeholder:text-slate-500 text-lg transition-all"
                                            disabled={loading}
                                            maxLength={isPinMode ? 6 : undefined}
                                        />
                                        {!isPinMode && (
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-0 top-0 h-full px-4 text-slate-500 hover:text-slate-200 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                                            </button>
                                        )}
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={loading || !password}
                                        className="w-full h-14 text-lg font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-900/30 transition-all active:scale-[0.98] border border-blue-400/20"
                                    >
                                        {loading ? (
                                            <div className="flex items-center gap-3">
                                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Iniciando...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 justify-center">
                                                <span>Entrar</span>
                                                <ArrowRight size={20} />
                                            </div>
                                        )}
                                    </Button>

                                    {/* Toggle PIN/Contraseña - Solo mostrar si el usuario tiene PIN */}
                                    {selectedUser?.pin && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsPinMode(!isPinMode);
                                                setPassword('');
                                            }}
                                            className="w-full text-white/70 hover:text-white text-sm py-2 transition-colors"
                                        >
                                            {isPinMode ? 'Usar contraseña' : 'Usar PIN'}
                                        </button>
                                    )}
                                </form>
                            </div>
                            {/* Eliminados los textos de cifrado/versión de aquí abajo */}
                        </div>
                    )}

                </div>
            </div>
            {/* Eliminado el footer con la versión */}
        </div>
    );
}