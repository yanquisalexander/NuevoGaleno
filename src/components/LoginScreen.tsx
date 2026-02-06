import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSession } from '@/hooks/useSession';
import { useNode } from '@/contexts/NodeContext';
import { useGalenoClient } from '@/hooks/useGalenoClient';
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
    Globe,
    Laptop
} from 'lucide-react';

interface UserData {
    id: number;
    username: string;
    name: string;
    role: string;
    pin?: string;
    active?: boolean;
    avatarGradient?: string;
}

interface LoginScreenProps {
    onLogin: (user: UserData) => void;
}

const Clock = () => {
    const [date, setDate] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setDate(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-end text-white/90 drop-shadow-sm">
            <span className="text-sm font-semibold tabular-nums tracking-tight">
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">
                {date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
        </div>
    );
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
    const { login, loginWithPin } = useSession();
    const { setTemporaryRemoteConnection, activeContext } = useNode();
    const client = useGalenoClient();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<UserData[]>([]);
    const [isPinMode, setIsPinMode] = useState(false);
    const [viewState, setViewState] = useState<'selection' | 'password' | 'remote-config'>('selection');
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [remoteUrl, setRemoteUrl] = useState('');
    const [remoteToken, setRemoteToken] = useState('');
    const [testingConnection, setTestingConnection] = useState(false);

    useEffect(() => {
        const savedMode = localStorage.getItem('lastLoginMode');
        if (savedMode === 'pin') setIsPinMode(true);
    }, []);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const userList: UserData[] = await invoke('list_users');
                const gradients = [
                    'from-blue-500/40 to-indigo-600/40',
                    'from-emerald-500/40 to-teal-600/40',
                    'from-purple-500/40 to-pink-600/40',
                    'from-amber-500/40 to-orange-600/40'
                ];
                const enhancedUsers = userList
                    .filter(u => u.active)
                    .map((u, i) => ({ ...u, avatarGradient: gradients[i % gradients.length] }));
                setUsers(enhancedUsers);
                if (enhancedUsers.length === 1) handleSelectUser(enhancedUsers[0]);
            } catch (error) {
                console.error('Error cargando usuarios:', error);
            }
        };
        loadUsers();
    }, []);

    const handleSelectUser = (user: UserData) => {
        setSelectedUser(user);
        setUsername(user.username);
        if (user.pin) {
            const savedMode = localStorage.getItem('lastLoginMode');
            setIsPinMode(savedMode === 'pin' || savedMode === null);
        } else {
            setIsPinMode(false);
        }
        setViewState('password');
        setTimeout(() => document.getElementById('password-input')?.focus(), 150);
    };

    const handleBackToSelection = () => {
        setViewState('selection');
        setPassword('');
        setSelectedUser(null);
        setRemoteUrl('');
        setRemoteToken('');
        setShowPassword(false);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;
        setLoading(true);
        try {
            let user: UserData;
            // PIN solo funciona en modo local
            if (isPinMode && activeContext?.mode !== 'remote') {
                user = await loginWithPin(username, password) as UserData;
                localStorage.setItem('lastLoginMode', 'pin');
            } else {
                user = await login(username, password, client) as UserData;
                localStorage.setItem('lastLoginMode', 'password');
            }
            onLogin(user);
        } catch (err: any) {
            toast.error('Acceso denegado', {
                description: 'Verifica tus credenciales.',
                className: 'bg-black/80 backdrop-blur-xl text-white border-white/10'
            });
            setPassword('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 overflow-hidden font-sans bg-[#020617] text-slate-200 selection:bg-blue-500/40">

            {/* Background Original - Restaurado */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out scale-105"
                style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1620121692029-d088224ddc74?q=80&w=2064')`,
                    filter: viewState === 'password' ? 'blur(25px) brightness(0.6)' : 'blur(0px) brightness(1)'
                }}
            />

            {/* Overlay de ruido Mica */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-slate-950/20 pointer-events-none" />

            {/* Menú Superior macOS Style */}
            <div className="relative z-50 flex items-center justify-between px-6 h-12 backdrop-blur-2xl bg-black/20 border-b border-white/[0.08]">
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2 group cursor-default">
                        <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center border border-white/10 group-hover:bg-blue-500/20 transition-colors">
                            <Command size={14} className="text-white/80" />
                        </div>
                        <span className="text-[13px] font-semibold tracking-wide text-white/90">Nuevo Galeno OS</span>
                    </div>
                </div>
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-4 text-white/70">
                        <Wifi size={15} />
                        <Battery size={15} className="opacity-80" />
                    </div>
                    <div className="h-4 w-[1px] bg-white/10" />
                    <Clock />
                </div>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center h-[calc(100vh-48px)]">

                {viewState === 'selection' && (
                    <div className="animate-in fade-in zoom-in-95 duration-700 flex flex-col items-center">
                        <h1 className="text-5xl font-extralight text-white mb-16 tracking-tight drop-shadow-2xl">
                            Bienvenido
                        </h1>

                        <div className="flex flex-wrap justify-center gap-8 max-w-5xl px-10">
                            {users.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => handleSelectUser(user)}
                                    className="group relative flex flex-col items-center w-40 transition-all duration-300"
                                >
                                    <div className={`w-32 h-32 rounded-3xl mb-4 relative flex items-center justify-center text-4xl font-light 
                                        bg-gradient-to-br ${user.avatarGradient} 
                                        backdrop-blur-md border border-white/20 shadow-2xl
                                        group-hover:scale-110 group-hover:-translate-y-2 group-hover:border-blue-400/50 group-active:scale-95 transition-all duration-500`}
                                    >
                                        <span className="text-white drop-shadow-md">{user.name.charAt(0)}</span>
                                    </div>
                                    <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                                        {user.name}
                                    </span>
                                    <span className="text-[10px] mt-1 px-2 py-0.5 rounded-full bg-black/20 text-white/40 border border-white/5 uppercase tracking-tighter">
                                        {user.role}
                                    </span>
                                </button>
                            ))}

                            <div className="flex flex-col gap-4 w-40">
                                <button
                                    onClick={() => { setUsername(''); setViewState('password'); }}
                                    className="group flex flex-col items-center"
                                >
                                    <div className="w-32 h-32 rounded-3xl mb-4 border-2 border-dashed border-white/10 flex items-center justify-center text-white/20 group-hover:border-white/40 group-hover:text-white/60 group-hover:bg-white/5 transition-all duration-500">
                                        <Laptop size={48} strokeWidth={1} />
                                    </div>
                                    <span className="text-sm text-white/40 font-medium group-hover:text-white/60 transition-colors">Usuario local</span>
                                </button>

                                <button
                                    onClick={() => { setViewState('remote-config'); }}
                                    className="group flex flex-col items-center"
                                >
                                    <div className="w-32 h-32 rounded-3xl mb-4 border-2 border-dashed border-white/10 flex items-center justify-center text-white/20 group-hover:border-blue-400/40 group-hover:text-blue-400/60 group-hover:bg-blue-500/5 transition-all duration-500">
                                        <Globe size={48} strokeWidth={1} />
                                    </div>
                                    <span className="text-sm text-white/40 font-medium group-hover:text-blue-400/60 transition-colors">Servidor remoto</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {viewState === 'remote-config' && (
                    <div className="animate-in slide-in-from-bottom-10 fade-in duration-500 flex flex-col items-center w-full max-w-md">
                        <div className="w-full p-8 rounded-[40px] bg-black/40 backdrop-blur-[60px] border border-white/[0.12] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] flex flex-col items-center">

                            <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-light mb-6 shadow-2xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
                                <Globe size={40} className="text-blue-400" />
                            </div>

                            <h2 className="text-2xl font-light text-white mb-1">
                                Conectar a Servidor
                            </h2>
                            <p className="text-white/40 text-xs mb-8 tracking-wider uppercase font-medium">
                                Ingresa los datos del servidor remoto
                            </p>

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (!remoteUrl || !remoteToken) return;

                                setTestingConnection(true);
                                try {
                                    const result = await invoke<any>('test_remote_connection', {
                                        remoteUrl,
                                        authToken: remoteToken
                                    });

                                    toast.success('Conexión exitosa', {
                                        description: `Conectado a: ${result.service || 'Nuevo Galeno'}`,
                                        className: 'bg-black/80 backdrop-blur-xl text-white border-white/10'
                                    });

                                    // Establecer conexión temporal
                                    setTemporaryRemoteConnection(remoteUrl, remoteToken, result.service || 'Servidor Remoto');

                                    // Ir a pantalla de password
                                    setUsername('');
                                    setSelectedUser(null);
                                    setViewState('password');

                                } catch (err: any) {
                                    toast.error('Error de conexión', {
                                        description: err || 'No se pudo conectar al servidor',
                                        className: 'bg-black/80 backdrop-blur-xl text-white border-white/10'
                                    });
                                } finally {
                                    setTestingConnection(false);
                                }
                            }} className="w-full space-y-4">

                                <div className="space-y-2">
                                    <label className="text-xs text-white/60 uppercase tracking-wider">URL del Servidor</label>
                                    <Input
                                        type="text"
                                        value={remoteUrl}
                                        onChange={(e) => setRemoteUrl(e.target.value)}
                                        placeholder="http://192.168.1.100:3000"
                                        className="h-12 bg-white/[0.06] border-white/[0.08] focus:bg-white/[0.1] focus:border-blue-500/50 rounded-2xl text-center text-white placeholder:text-white/20 transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-white/60 uppercase tracking-wider">Token de Autenticación</label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            value={remoteToken}
                                            onChange={(e) => setRemoteToken(e.target.value)}
                                            placeholder="Token del servidor"
                                            className="h-12 bg-white/[0.06] border-white/[0.08] focus:bg-white/[0.1] focus:border-blue-500/50 rounded-2xl text-center text-white placeholder:text-white/20 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={testingConnection || !remoteUrl || !remoteToken}
                                    className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all font-semibold mt-4"
                                >
                                    {testingConnection ? (
                                        <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <><Globe size={20} className="mr-2" /> Conectar</>
                                    )}
                                </Button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setViewState('selection');
                                        setRemoteUrl('');
                                        setRemoteToken('');
                                        setShowPassword(false);
                                    }}
                                    className="flex items-center justify-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors py-2 w-full"
                                >
                                    <ChevronLeft size={12} /> VOLVER
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {viewState === 'password' && (
                    <div className="animate-in slide-in-from-bottom-10 fade-in duration-500 flex flex-col items-center w-full max-w-sm">
                        <div className="w-full p-8 rounded-[40px] bg-black/40 backdrop-blur-[60px] border border-white/[0.12] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] flex flex-col items-center">

                            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-light mb-6 shadow-2xl border border-white/10 ${selectedUser?.avatarGradient || 'bg-white/5 text-white/20'}`}>
                                {selectedUser ? selectedUser.name.charAt(0) : <User size={40} />}
                            </div>

                            <h2 className="text-2xl font-light text-white mb-1">
                                {selectedUser ? selectedUser.name : 'Iniciar Sesión'}
                            </h2>
                            <p className="text-white/40 text-xs mb-8 tracking-wider uppercase font-medium">
                                {selectedUser ? `@${selectedUser.username}` : 'Ingresa tus datos'}
                            </p>

                            <form onSubmit={handleLogin} className="w-full space-y-4">
                                {!selectedUser && (
                                    <Input
                                        id="username-input"
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Usuario"
                                        className="h-12 bg-white/[0.06] border-white/[0.08] focus:bg-white/[0.1] focus:border-blue-500/50 rounded-2xl text-center text-white placeholder:text-white/20 transition-all"
                                    />
                                )}

                                <div className="relative">
                                    <Input
                                        id="password-input"
                                        type={isPinMode ? "password" : (showPassword ? "text" : "password")}
                                        value={password}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (isPinMode) {
                                                const d = val.replace(/\D/g, '').slice(0, 6);
                                                setPassword(d);
                                            } else setPassword(val);
                                        }}
                                        placeholder={isPinMode ? "PIN de 6 dígitos" : "Contraseña"}
                                        className="h-12 bg-white/[0.06] border-white/[0.08] focus:bg-white/[0.1] focus:border-blue-500/50 rounded-2xl text-center text-white placeholder:text-white/20 transition-all tracking-[0.2em]"
                                        disabled={loading}
                                    />
                                    {!isPinMode && (
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading || !password}
                                    className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all font-semibold mt-4"
                                >
                                    {loading ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <ArrowRight size={20} />}
                                </Button>

                                <div className="flex flex-col gap-2 pt-4">
                                    {selectedUser?.pin && activeContext?.mode !== 'remote' && (
                                        <button
                                            type="button"
                                            onClick={() => { setIsPinMode(!isPinMode); setPassword(''); }}
                                            className="text-[11px] text-white/40 hover:text-white/80 uppercase tracking-widest transition-colors font-bold"
                                        >
                                            {isPinMode ? 'Usar contraseña' : 'Usar PIN de acceso'}
                                        </button>
                                    )}
                                    {activeContext?.mode === 'remote' && selectedUser?.pin && (
                                        <div className="text-[10px] text-white/30 text-center py-1">
                                            PIN no disponible en modo remoto
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleBackToSelection}
                                        className="flex items-center justify-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors py-2"
                                    >
                                        <ChevronLeft size={12} /> CAMBIAR USUARIO
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}