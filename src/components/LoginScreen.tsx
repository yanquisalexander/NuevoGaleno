import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSession } from '@/hooks/useSession';
import { useNode } from '@/contexts/NodeContext';
import { useGalenoClient } from '@/hooks/useGalenoClient';
import { useNodeDiscovery } from '@/hooks/useNodeDiscovery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
    Eye24Regular as Eye,
    EyeOff24Regular as EyeOff,
    Wifi124Regular as Wifi,
    Battery124Regular as Battery,
    ChevronLeft24Regular as ChevronLeft,
    Search24Regular as Search,
    ArrowRight24Regular as ArrowRight,
    Globe24Regular as Globe,
    Laptop24Regular as Laptop,
    ArrowSync24Regular as RefreshCw
} from '@fluentui/react-icons';
import { Person24Regular as User } from '@fluentui/react-icons';

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
        <div className="flex items-center gap-3 text-white/90 drop-shadow-sm">
            <span className="text-[13px] font-medium tabular-nums tracking-tight">
                {date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <span className="text-[13px] font-medium tabular-nums tracking-tight">
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
        </div>
    );
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
    const { login, loginWithPin } = useSession();
    const { setTemporaryRemoteConnection, activeContext } = useNode();
    const { discoveredNodes, isDiscovering, startDiscovery, stopDiscovery } = useNodeDiscovery();
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
                    'from-blue-400 to-indigo-500',
                    'from-emerald-400 to-teal-500',
                    'from-purple-400 to-pink-500',
                    'from-amber-400 to-orange-500'
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
                className: 'bg-[#1e1e1e]/90 backdrop-blur-2xl text-white border-white/10 rounded-xl'
            });
            setPassword('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 overflow-hidden font-sans bg-black text-slate-200 selection:bg-blue-500/40">

            {/* Wallpaper con efecto de profundidad */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out scale-100"
                style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1620121692029-d088224ddc74?q=80&w=2064')`,
                    filter: viewState !== 'selection' ? 'blur(40px) brightness(0.7)' : 'blur(0px) brightness(0.9)'
                }}
            />

            {/* Menu Bar macOS */}
            <div className="relative z-50 flex items-center justify-between px-5 h-8 backdrop-blur-md bg-black/10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 group cursor-default">
                        <span className="text-[13px] font-bold text-white/90">Nuevo Galeno</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Wifi fontSize={14} className="text-white/80" />
                    <Battery fontSize={16} className="text-white/80" />
                    <Clock />
                </div>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center h-[calc(100vh-32px)]">

                {viewState === 'selection' && (
                    <div className="animate-in fade-in zoom-in-95 duration-700 flex flex-col items-center">
                        <h1 className="text-6xl font-semibold text-white mb-20 tracking-tight drop-shadow-2xl">
                            Bienvenido
                        </h1>

                        <div className="flex flex-wrap justify-center gap-10 max-w-6xl px-10">
                            {users.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => handleSelectUser(user)}
                                    className="group relative flex flex-col items-center w-32 transition-all duration-300"
                                >
                                    <div className={`w-28 h-28 rounded-[2.5rem] mb-4 relative flex items-center justify-center text-4xl font-medium 
                                        bg-gradient-to-br ${user.avatarGradient} 
                                        shadow-[0_20px_40px_rgba(0,0,0,0.3)]
                                        group-hover:scale-105 group-hover:-translate-y-1 transition-all duration-500 ring-4 ring-transparent group-hover:ring-white/20`}
                                    >
                                        <span className="text-white drop-shadow-md">{user.name.charAt(0)}</span>
                                    </div>
                                    <span className="text-[15px] font-semibold text-white drop-shadow-lg">
                                        {user.name}
                                    </span>
                                </button>
                            ))}

                            <div className="flex gap-8">
                                <button
                                    onClick={() => { setUsername(''); setViewState('password'); }}
                                    className="group flex flex-col items-center"
                                >
                                    <div className="w-28 h-28 rounded-[2.5rem] mb-4 border-2 border-white/10 bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-500">
                                        <Laptop fontSize={40} />
                                    </div>
                                    <span className="text-[13px] text-white/60 font-medium">Local</span>
                                </button>

                                <button
                                    onClick={() => { setViewState('remote-config'); }}
                                    className="group flex flex-col items-center"
                                >
                                    <div className="w-28 h-28 rounded-[2.5rem] mb-4 border-2 border-white/10 bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-blue-500/10 group-hover:border-blue-500/30 group-hover:text-blue-400 transition-all duration-500">
                                        <Globe fontSize={40} />
                                    </div>
                                    <span className="text-[13px] text-white/60 font-medium">Remoto</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {(viewState === 'remote-config' || viewState === 'password') && (
                    <div className="animate-in slide-in-from-bottom-4 fade-in duration-500 flex flex-col items-center w-full max-w-[400px] px-6">
                        <div className="w-full max-h-[85vh] overflow-y-auto custom-scrollbar p-8 rounded-[48px] bg-[#1e1e1e]/60 backdrop-blur-[50px] border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.5)] flex flex-col items-center">

                            {/* Avatar/Icon Section */}
                            <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center text-4xl font-light mb-6 shadow-2xl border border-white/10 ${viewState === 'password' && selectedUser ? `bg-gradient-to-br ${selectedUser.avatarGradient}` : 'bg-white/5'}`}>
                                {viewState === 'remote-config' ? <Globe fontSize={40} className="text-blue-400" /> : (selectedUser ? selectedUser.name.charAt(0) : <User fontSize={40} className="text-white/20" />)}
                            </div>

                            <h2 className="text-2xl font-semibold text-white mb-1">
                                {viewState === 'remote-config' ? 'Servidor' : (selectedUser ? selectedUser.name : 'Ingresar')}
                            </h2>
                            <p className="text-white/40 text-[13px] mb-8 font-medium">
                                {viewState === 'remote-config' ? 'Configuración de red' : `@${username || 'usuario'}`}
                            </p>

                            {viewState === 'remote-config' ? (
                                <div className="w-full space-y-6">
                                    {/* Discovery Section */}
                                    <div className="w-full bg-white/5 rounded-3xl p-4 border border-white/5">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[12px] font-bold text-white/40 uppercase tracking-widest px-1">Red Local</span>
                                            <div className="flex gap-1">
                                                {!isDiscovering ? (
                                                    <Button onClick={startDiscovery} size="sm" className="h-7 bg-blue-500 hover:bg-blue-400 text-[11px] rounded-full px-3">Buscar</Button>
                                                ) : (
                                                    <Button onClick={stopDiscovery} size="sm" variant="ghost" className="h-7 text-red-400 text-[11px] hover:bg-red-500/10 rounded-full px-3">Parar</Button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                            {discoveredNodes.map((node) => (
                                                <button key={node.service_name} type="button" onClick={() => setRemoteUrl(`http://${node.hostname}:${node.port}`)}
                                                    className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all text-left group">
                                                    <div className="overflow-hidden">
                                                        <p className="text-sm font-medium text-white truncate">{node.node_name}</p>
                                                        <p className="text-[11px] text-white/30 truncate">{node.hostname}:{node.port}</p>
                                                    </div>
                                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                                </button>
                                            ))}
                                            {!isDiscovering && discoveredNodes.length === 0 && (
                                                <p className="text-[11px] text-white/20 text-center py-2 italic">No se encontraron servidores</p>
                                            )}
                                        </div>
                                    </div>

                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        setTestingConnection(true);
                                        try {
                                            const result = await invoke<any>('test_remote_connection', { remoteUrl, authToken: remoteToken });
                                            setTemporaryRemoteConnection(remoteUrl, remoteToken, result.service || 'Remoto');
                                            setViewState('password');
                                        } catch (err: any) {
                                            toast.error('Error de conexión');
                                        } finally { setTestingConnection(false); }
                                    }} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest ml-4">Dirección URL</label>
                                            <Input value={remoteUrl} onChange={(e) => setRemoteUrl(e.target.value)} placeholder="http://192.168..."
                                                className="h-12 bg-black/20 border-white/10 focus:border-blue-500/50 rounded-2xl px-5 text-white placeholder:text-white/10" />
                                        </div>
                                        <div className="space-y-1.5 relative">
                                            <label className="text-[11px] font-bold text-white/30 uppercase tracking-widest ml-4">Token de Acceso</label>
                                            <Input type={showPassword ? "text" : "password"} value={remoteToken} onChange={(e) => setRemoteToken(e.target.value)} placeholder="••••••••"
                                                className="h-12 bg-black/20 border-white/10 focus:border-blue-500/50 rounded-2xl px-5 text-white" />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 bottom-3 text-white/20 hover:text-white/50">
                                                {showPassword ? <EyeOff fontSize={16} /> : <Eye fontSize={16} />}
                                            </button>
                                        </div>
                                        <Button type="submit" disabled={testingConnection || !remoteUrl} className="w-full h-12 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl font-semibold transition-all">
                                            {testingConnection ? <RefreshCw fontSize={18} className="animate-spin" /> : 'Conectar'}
                                        </Button>
                                    </form>
                                </div>
                            ) : (
                                <form onSubmit={handleLogin} className="w-full space-y-4">
                                    <div className="relative group">
                                        <Input id="password-input" type={isPinMode ? "password" : (showPassword ? "text" : "password")} value={password}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (isPinMode) setPassword(val.replace(/\D/g, '').slice(0, 6));
                                                else setPassword(val);
                                            }}
                                            placeholder={isPinMode ? "PIN de 6 dígitos" : "Contraseña"}
                                            className="h-12 bg-white/5 border-white/10 focus:bg-white/10 focus:border-blue-500/50 rounded-2xl text-center text-white placeholder:text-white/20 transition-all text-lg tracking-[0.3em]"
                                        />
                                        {!isPinMode && (
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                                                {showPassword ? <EyeOff fontSize={18} /> : <Eye fontSize={18} />}
                                            </button>
                                        )}
                                    </div>
                                    <Button type="submit" disabled={loading || !password} className="w-full h-12 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl shadow-lg active:scale-[0.98] transition-all font-bold">
                                        {loading ? <RefreshCw fontSize={20} className="animate-spin" /> : <ArrowRight fontSize={22} />}
                                    </Button>

                                    <div className="flex flex-col gap-3 pt-4 items-center">
                                        {selectedUser?.pin && activeContext?.mode !== 'remote' && (
                                            <button type="button" onClick={() => { setIsPinMode(!isPinMode); setPassword(''); }} className="text-[11px] text-white/30 hover:text-blue-400 uppercase tracking-widest font-bold transition-colors">
                                                {isPinMode ? 'Usar contraseña' : 'Usar PIN'}
                                            </button>
                                        )}
                                    </div>
                                </form>
                            )}

                            <button type="button" onClick={handleBackToSelection} className="mt-6 flex items-center gap-2 text-[11px] font-bold text-white/20 hover:text-white/50 transition-colors uppercase tracking-[0.2em]">
                                <ChevronLeft fontSize={14} /> Volver
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}} />
        </div>
    );
}