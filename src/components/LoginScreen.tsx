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
    ArrowRight24Regular as ArrowRight,
    Globe24Regular as Globe,
    Laptop24Regular as Laptop,
    ArrowSync24Regular as RefreshCw,
    PersonAdd24Regular as UserAdd,
    Desktop24Regular as Desktop,
    LockClosed24Regular as Lock
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

// Componente de reloj estilo Barra de Menú macOS / Windows 11 Taskbar
const Clock = () => {
    const [date, setDate] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setDate(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-end leading-tight text-white/90 drop-shadow-sm select-none">
            <span className="text-[12px] font-medium tracking-wide">
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[10px] font-medium opacity-70">
                {date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
        </div>
    );
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
    const { login, loginWithPin } = useSession();
    const { setTemporaryRemoteConnection, activeContext } = useNode();
    const { discoveredNodes, isDiscovering, startDiscovery, stopDiscovery } = useNodeDiscovery();
    const client = useGalenoClient();
    const { lockScreen } = useSession();

    // Estados
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<UserData[]>([]);
    const [isPinMode, setIsPinMode] = useState(false);

    // ViewState: 'selection' (grid) | 'login' (form) | 'remote-config' (ip setup)
    const [viewState, setViewState] = useState<'selection' | 'login' | 'remote-config'>('selection');
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

    // Remote logic
    const [remoteUrl, setRemoteUrl] = useState('');
    const [remoteToken, setRemoteToken] = useState('');
    const [testingConnection, setTestingConnection] = useState(false);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                // Simulación de carga (reemplazar con invoke real si falla en dev)
                const userList: UserData[] = await invoke('list_users').catch(() => []);
                const gradients = [
                    'from-blue-500 to-cyan-400',
                    'from-violet-500 to-fuchsia-400',
                    'from-emerald-400 to-teal-500',
                    'from-orange-400 to-amber-300',
                    'from-rose-500 to-pink-400'
                ];

                const enhancedUsers = userList
                    .filter(u => u.active)
                    .map((u, i) => ({ ...u, avatarGradient: gradients[i % gradients.length] }));

                setUsers(enhancedUsers);
                // Si solo hay un usuario, pre-seleccionar (opcional, comentado para ver la UI)
                // if (enhancedUsers.length === 1) handleSelectUser(enhancedUsers[0]);
            } catch (error) {
                console.error('Error cargando usuarios:', error);
            }
        };
        loadUsers();
    }, []);

    // Seleccionar usuario local de la lista
    const handleSelectUser = (user: UserData) => {
        setSelectedUser(user);
        setUsername(user.username);
        // Lógica de PIN
        if (user.pin) {
            const savedMode = localStorage.getItem('lastLoginMode');
            setIsPinMode(savedMode === 'pin' || savedMode === null);
        } else {
            setIsPinMode(false);
        }
        setViewState('login');
        setTimeout(() => document.getElementById('password-input')?.focus(), 150);
    };

    // Manejar "Otro Usuario" o Login después de conectar remoto
    const handleGenericLogin = () => {
        setSelectedUser(null); // Importante: Null indica que no es un usuario pre-cargado
        setUsername('');
        setPassword('');
        setIsPinMode(false); // Login genérico siempre usa contraseña
        setViewState('login');
        setTimeout(() => document.getElementById('username-input')?.focus(), 150);
    }

    const handleBackToSelection = () => {
        setViewState('selection');
        setPassword('');
        // No limpiamos remoteUrl por si quiere reintentar rápido
        setShowPassword(false);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;
        if (!selectedUser && !username) return; // Si es genérico, necesitamos usuario

        setLoading(true);
        try {
            let user: UserData;

            // Si hay usuario seleccionado Y estamos en modo PIN Y no es remoto
            if (selectedUser && isPinMode && activeContext?.mode !== 'remote') {
                user = await loginWithPin(username, password) as UserData;
                localStorage.setItem('lastLoginMode', 'pin');
            } else {
                // Login estándar (usuario local o remoto)
                user = await login(username, password, client) as UserData;
                localStorage.setItem('lastLoginMode', 'password');
            }
            onLogin(user);
        } catch (err: any) {
            toast.error('Acceso denegado', {
                description: 'Las credenciales no coinciden.',
                className: 'bg-white/10 backdrop-blur-md border-white/20 text-white'
            });
            setPassword('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 overflow-hidden font-sans bg-[#0f0f0f] text-slate-200 selection:bg-blue-500/30">

            {/* Background Abstracto / Fluid */}
            <div className="absolute inset-0 z-0">
                <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-out scale-[1.02]"
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1620121692029-d088224ddc74?q=80&w=2064')`, // Abstract Fluid
                        filter: viewState !== 'selection' ? 'blur(20px) brightness(0.6) saturate(1.2)' : 'blur(0px) brightness(0.85) saturate(1.1)'
                    }}
                />
                <div className="absolute inset-0 bg-black/20" /> {/* Overlay para contraste */}
            </div>

            {/* Top Bar (Glass) */}
            <div className="absolute top-0 w-full z-50 flex items-center justify-between px-6 h-10 bg-gradient-to-b from-black/40 to-transparent">
                <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity cursor-default">
                    <span className="text-[13px] font-semibold tracking-wide text-white drop-shadow-md">Nuevo Galeno</span>
                </div>
                <div className="flex items-center gap-5">
                    <Wifi fontSize={16} className="text-white/90 drop-shadow-sm" />
                    <Battery fontSize={18} className="text-white/90 drop-shadow-sm" />
                    <button
                        onClick={lockScreen}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        title="Bloquear pantalla"
                    >
                        <Lock fontSize={16} className="text-white/90 drop-shadow-sm" />
                    </button>
                    <Clock />
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full pt-6">

                {/* View: User Selection (Grid) */}
                {viewState === 'selection' && (
                    <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center w-full">

                        {/* Redujimos el mb-16 a mb-6 para compensar el padding que le daremos a la grilla */}
                        <div className="mb-6 text-center space-y-2">
                            <h1 className="text-5xl md:text-6xl font-semibold text-white tracking-tight drop-shadow-2xl">
                                ¿Quién eres?
                            </h1>
                        </div>

                        {/* Cambiamos px-10 pb-10 por p-10 (que incluye pt-10). Esto le da espacio interno al scroll para la animación */}
                        <div className="flex flex-wrap justify-center gap-x-12 gap-y-10 max-w-5xl p-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {/* Local Users */}
                            {users.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => handleSelectUser(user)}
                                    className="group relative flex flex-col items-center w-36 outline-none"
                                >
                                    <div className={`
                                        w-28 h-28 rounded-[2rem] mb-5 relative flex items-center justify-center text-4xl font-medium text-white
                                        bg-gradient-to-br ${user.avatarGradient}
                                        shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]
                                        ring-4 ring-white/10 group-hover:ring-white/30 group-focus:ring-blue-400/50
                                        transform transition-all duration-300 ease-out
                                        group-hover:scale-110 group-hover:-translate-y-2 group-active:scale-95
                                    `}>
                                        <span className="drop-shadow-lg">{user.name.charAt(0)}</span>

                                    </div>
                                    <span className="text-[15px] font-medium text-white/90 group-hover:text-white transition-colors drop-shadow-md">
                                        {user.name.split(' ')[0]}
                                    </span>
                                </button>
                            ))}

                            {/* Divider Vertical si hay usuarios */}
                            {users.length > 0 && <div className="w-[1px] bg-white/10 rounded-full mx-2 hidden md:block" />}

                            {/* Manual / Other User Button */}
                            <button
                                onClick={handleGenericLogin}
                                className="group flex flex-col items-center w-36 outline-none"
                            >
                                <div className="w-28 h-28 rounded-[2rem] mb-5 bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/60 group-hover:bg-white/20 group-hover:text-white group-hover:border-white/40 shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-2">
                                    <UserAdd fontSize={36} />
                                </div>
                                <span className="text-[13px] font-medium text-white/60 group-hover:text-white transition-colors">Otro Usuario</span>
                            </button>
                        </div>

                        {/* Bottom Actions */}
                        <div className="absolute bottom-12 flex gap-6">
                            <button
                                onClick={() => setViewState('remote-config')}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-xl border border-white/5 hover:border-white/20 transition-all text-sm font-medium text-white/70 hover:text-white"
                            >
                                <Globe fontSize={16} />
                                Conectar a Servidor
                            </button>
                        </div>
                    </div>
                )}

                {/* View: Login Form or Remote Config */}
                {(viewState === 'login' || viewState === 'remote-config') && (
                    <div className="animate-in slide-in-from-bottom-8 fade-in duration-500 w-full max-w-[380px] px-4">

                        {/* Glass Card */}
                        <div className="w-full p-8 rounded-[3rem] bg-[#1a1a1a]/40 backdrop-blur-[60px] border border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)]">

                            <div className="flex flex-col items-center">
                                {/* Avatar */}
                                <div className={`
                                    w-20 h-20 rounded-[1.8rem] flex items-center justify-center text-3xl font-light mb-5 shadow-xl border border-white/10
                                    ${viewState === 'remote-config' ? 'bg-blue-500/20 text-blue-400' :
                                        (selectedUser ? `bg-gradient-to-br ${selectedUser.avatarGradient} text-white` : 'bg-white/10 text-white/50')}
                                `}>
                                    {viewState === 'remote-config' ? <Desktop fontSize={32} /> :
                                        (selectedUser ? selectedUser.name.charAt(0) : <User fontSize={32} />)}
                                </div>

                                <h2 className="text-xl font-semibold text-white mb-1">
                                    {viewState === 'remote-config' ? 'Conexión Remota' : (selectedUser ? selectedUser.name : 'Iniciar Sesión')}
                                </h2>
                                <p className="text-white/40 text-[13px] mb-8 font-medium">
                                    {viewState === 'remote-config' ? 'Configura el punto de acceso' :
                                        (selectedUser ? `@${selectedUser.username}` : 'Introduce tus credenciales')}
                                </p>

                                {/* FORM: Remote Config */}
                                {viewState === 'remote-config' ? (
                                    <div className="w-full space-y-5">
                                        {/* Discovery List */}
                                        <div className="w-full bg-black/20 rounded-2xl p-3 border border-white/5">
                                            <div className="flex items-center justify-between mb-3 px-1">
                                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Disponibles</span>
                                                <button onClick={isDiscovering ? stopDiscovery : startDiscovery}
                                                    className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${isDiscovering ? 'text-red-400 bg-red-500/10' : 'text-blue-400 bg-blue-500/10'}`}>
                                                    {isDiscovering ? 'DETENER' : 'ESCANEAR'}
                                                </button>
                                            </div>
                                            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                                                {discoveredNodes.map((node) => (
                                                    <button key={node.service_name}
                                                        onClick={() => setRemoteUrl(`http://${node.hostname}:${node.port}`)}
                                                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/10 transition-colors text-left group">
                                                        <div className="truncate pr-2">
                                                            <div className="text-[13px] text-white font-medium">{node.node_name}</div>
                                                            <div className="text-[11px] text-white/40">{node.hostname}</div>
                                                        </div>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                                    </button>
                                                ))}
                                                {!isDiscovering && discoveredNodes.length === 0 && (
                                                    <div className="py-4 text-center text-[11px] text-white/20 italic">No se detectaron servidores</div>
                                                )}
                                            </div>
                                        </div>

                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            setTestingConnection(true);
                                            try {
                                                const result = await invoke<any>('test_remote_connection', { remoteUrl, authToken: remoteToken });
                                                setTemporaryRemoteConnection(remoteUrl, remoteToken, result.service || 'Remoto');
                                                // BUG FIX: Vamos al login genérico (sin usuario pre-seleccionado)
                                                handleGenericLogin();
                                                toast.success(`Conectado a ${result.service}`);
                                            } catch (err: any) {
                                                toast.error('No se pudo conectar');
                                            } finally { setTestingConnection(false); }
                                        }} className="space-y-4">
                                            <div className="space-y-3">
                                                <Input value={remoteUrl} onChange={(e) => setRemoteUrl(e.target.value)} placeholder="http://192.168.1.X:8080"
                                                    className="h-11 bg-black/20 border-white/5 focus:border-blue-500/50 focus:bg-black/40 rounded-xl px-4 text-[13px] text-white placeholder:text-white/20 transition-all" />
                                                <Input type="password" value={remoteToken} onChange={(e) => setRemoteToken(e.target.value)} placeholder="Token de seguridad"
                                                    className="h-11 bg-black/20 border-white/5 focus:border-blue-500/50 focus:bg-black/40 rounded-xl px-4 text-[13px] text-white placeholder:text-white/20 transition-all" />
                                            </div>
                                            <Button type="submit" disabled={testingConnection || !remoteUrl}
                                                className="w-full h-11 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all border border-white/5">
                                                {testingConnection ? <RefreshCw className="animate-spin" /> : 'Establecer Conexión'}
                                            </Button>
                                        </form>
                                    </div>
                                ) : (
                                    /* FORM: Login (Unified for Local & Remote) */
                                    <form onSubmit={handleLogin} className="w-full space-y-4">

                                        {/* BUG FIX: Si no hay usuario seleccionado (Remote/Generic), mostrar campo Username */}
                                        {!selectedUser && (
                                            <div className="relative group animate-in slide-in-from-top-2 fade-in duration-300">
                                                <Input
                                                    id="username-input"
                                                    type="text"
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    placeholder="Nombre de usuario"
                                                    className="h-12 bg-white/5 border-transparent focus:bg-white/10 focus:border-white/10 rounded-2xl px-4 text-white placeholder:text-white/20 transition-all text-base text-center"
                                                />
                                            </div>
                                        )}

                                        <div className="relative group">
                                            <Input
                                                id="password-input"
                                                type={isPinMode ? "password" : (showPassword ? "text" : "password")}
                                                value={password}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (isPinMode) setPassword(val.replace(/\D/g, '').slice(0, 6));
                                                    else setPassword(val);
                                                }}
                                                placeholder={isPinMode ? "PIN" : "Contraseña"}
                                                className={`h-12 bg-white/5 border-transparent focus:bg-white/10 focus:border-white/10 rounded-2xl px-4 text-white placeholder:text-white/20 transition-all text-center ${isPinMode ? 'tracking-[0.5em] text-xl font-bold' : 'text-base tracking-normal'}`}
                                            />
                                            {!isPinMode && (
                                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                                                    {showPassword ? <EyeOff fontSize={16} /> : <Eye fontSize={16} />}
                                                </button>
                                            )}
                                        </div>

                                        <Button type="submit" disabled={loading || !password}
                                            className="w-full h-12 mt-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_4px_25px_rgba(59,130,246,0.5)] active:scale-[0.98] transition-all font-semibold text-[15px]">
                                            {loading ? <RefreshCw fontSize={18} className="animate-spin" /> : <ArrowRight fontSize={20} />}
                                        </Button>

                                        {/* Toggle PIN/Pass - Solo si el usuario tiene PIN y no es remoto */}
                                        {selectedUser?.pin && activeContext?.mode !== 'remote' && (
                                            <div className="flex justify-center mt-2">
                                                <button type="button" onClick={() => { setIsPinMode(!isPinMode); setPassword(''); }}
                                                    className="text-[10px] text-white/30 hover:text-white/60 uppercase tracking-widest font-bold transition-colors">
                                                    {isPinMode ? 'Usar contraseña' : 'Usar PIN'}
                                                </button>
                                            </div>
                                        )}
                                    </form>
                                )}

                                <button type="button" onClick={handleBackToSelection}
                                    className="mt-8 flex items-center gap-1.5 text-[11px] font-bold text-white/30 hover:text-white transition-colors uppercase tracking-widest">
                                    <ChevronLeft fontSize={12} /> Volver
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Global Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}} />
        </div>
    );
}