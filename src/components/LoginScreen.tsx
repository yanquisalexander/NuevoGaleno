import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { UserCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface User {
    id: number;
    username: string;
    name: string;
    role: string;
}

interface LoginScreenProps {
    onLogin: (user: User) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const pwBuffer = new TextEncoder().encode(password);
            const hashBuf = await crypto.subtle.digest('SHA-256', pwBuffer);
            const hashHex = Array.from(new Uint8Array(hashBuf))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');

            const user: User = await invoke('login_user', {
                username,
                passwordHash: hashHex,
            });

            onLogin(user);
        } catch (err: any) {
            toast.error(err.toString() || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center overflow-hidden font-sans">
            {/* Background Wallpaper - Estilo Windows 11 Bloom */}
            <div
                className="absolute inset-0 bg-cover bg-center scale-105"
                style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1620121692029-d088224ddc74?q=80&w=2064')`,
                    filter: loading ? 'blur(10px)' : 'none',
                    transition: 'filter 0.5s ease'
                }}
            />

            {/* Overlay sutil */}
            <div className="absolute inset-0 bg-black/20" />

            <div className={`relative z-10 w-full max-w-[320px] transition-all duration-500 ${loading ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>

                {/* User Avatar */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-48 h-48 rounded-full border-[3px] border-white/20 p-1 bg-white/10 backdrop-blur-sm mb-6 shadow-2xl">
                        <div className="w-full h-full rounded-full bg-gradient-to-b from-slate-400 to-slate-600 flex items-center justify-center overflow-hidden">
                            <UserCircle className="w-32 h-32 text-white/90 stroke-[1px]" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-light text-white tracking-tight drop-shadow-lg">
                        {username || 'Nuevo Galeno'}
                    </h1>
                </div>

                {/* Formulario Estilo Windows 11 */}
                <form onSubmit={handleLogin} className="space-y-3">
                    <div className="relative group">
                        <Input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Nombre de usuario"
                            className="h-9 bg-black/30 border-t-white/20 border-x-white/10 border-b-white/5 backdrop-blur-md text-white placeholder:text-white/60 rounded-md focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-0 border-none transition-all shadow-inner"
                            required
                        />
                    </div>

                    <div className="relative group flex items-center gap-1">
                        <div className="relative flex-1">
                            <Input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Contraseña"
                                className="h-9 bg-black/30 border-t-white/20 border-x-white/10 border-b-white/5 backdrop-blur-md text-white placeholder:text-white/60 rounded-md focus-visible:ring-2 focus-visible:ring-blue-400 pr-10 border-none shadow-inner"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading || !password}
                            className="h-9 w-9 p-0 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md rounded-md transition-all active:scale-90 shadow-lg"
                        >
                            <ArrowRight size={18} className="text-white" />
                        </Button>
                    </div>

                    <div className="flex flex-col items-center gap-4 pt-4">
                        <button type="button" className="text-blue-200/80 hover:text-white text-sm transition-colors drop-shadow-md">
                            Olvidé mi contraseña
                        </button>
                    </div>
                </form>
            </div>

            {/* Iconos de accesibilidad/energía típicos de la esquina inferior derecha */}
            <div className="absolute bottom-8 right-8 flex gap-6 text-white/90 drop-shadow-md">
                <div className="hover:bg-white/10 p-2 rounded transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" /></svg>
                </div>
                <div className="hover:bg-white/10 p-2 rounded transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2" /><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /></svg>
                </div>
            </div>
        </div>
    );
}