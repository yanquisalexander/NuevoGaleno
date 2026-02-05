import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LicenseManagementPanel } from '@/components/LicenseManagementPanel';
import { UserManagementPanel } from '@/components/UserManagementPanel';
import { Shield, Settings, Users, CreditCard, Bell, Database, AlertTriangle, ExternalLink } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { cn } from '@/lib/utils';

/**
 * MiGaleno App - Fluent Design auténtico Windows 10/11
 */
export function MiGalenoApp() {
    const { currentUser } = useSession();

    if (!currentUser || currentUser.role !== 'admin') {
        return <AccessDeniedScreen />;
    }

    return (
        <div className="relative w-full h-full bg-[#202020] text-[#e4e4e4] selection:bg-[#0078d4]/30 select-none antialiased">

            {/* Acrylic Background - Efecto característico de Windows */}
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#1a1a1a_0%,#202020_50%,#252525_100%)] pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' /%3E%3C/svg%3E")' }} />

            <div className="relative flex flex-col h-full">

                {/* Main Layout */}
                <main className="flex flex-1 h-full">
                    <Tabs defaultValue="license" className="flex w-full flex-col md:flex-row items-start">

                        {/* Navigation Pane - Estilo NavigationView de WinUI */}
                        <aside className="w-full md:w-80 flex-none border-r border-white/[0.08] bg-[#1f1f1f]/40 backdrop-blur-xl h-full">
                            <div className="p-3 overflow-y-auto h-full">
                                <TabsList className="flex flex-col h-auto w-full bg-transparent p-0 space-y-1">

                                    {/* Main Section */}
                                    <div className="px-3 py-2 mb-1">
                                        <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Principal</span>
                                    </div>
                                    <FluentTabTrigger value="license" icon={Shield} label="Licenciamiento" />
                                    <FluentTabTrigger value="users" icon={Users} label="Usuarios del Sistema" />

                                    {/* Settings Section */}
                                    <div className="px-3 py-2 mb-1 mt-5">
                                        <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Configuración</span>
                                    </div>
                                    <FluentTabTrigger value="billing" icon={CreditCard} label="Suscripción y Pagos" />
                                    <FluentTabTrigger value="notifications" icon={Bell} label="Notificaciones" />
                                    <FluentTabTrigger value="database" icon={Database} label="Base de Datos" />
                                    <FluentTabTrigger value="settings" icon={Settings} label="Preferencias" />
                                </TabsList>
                            </div>
                        </aside>

                        {/* Content Area */}
                        <div className="flex-1 w-full p-8 lg:p-12 overflow-y-auto h-full">
                            <div className="max-w-5xl animate-in fade-in slide-in-from-bottom-2 duration-300">

                                <TabsContent value="license" className="m-0 focus-visible:outline-none">
                                    <div className="mb-6">
                                        <h1 className="text-[28px] font-semibold text-white/95 tracking-tight mb-1.5">Licenciamiento</h1>
                                        <p className="text-[13px] text-white/50">Gestiona las claves de producto y la validez de los servicios activos.</p>
                                    </div>
                                    <LicenseManagementPanel />
                                </TabsContent>

                                <TabsContent value="users" className="m-0 focus-visible:outline-none">
                                    <div className="mb-6">
                                        <h1 className="text-[28px] font-semibold text-white/95 tracking-tight mb-1.5">Usuarios</h1>
                                        <p className="text-[13px] text-white/50">Administra los usuarios y permisos del sistema.</p>
                                    </div>
                                    <UserManagementPanel />
                                </TabsContent>

                                <TabsContent value="billing" className="m-0 focus-visible:outline-none">
                                    <div className="mb-6">
                                        <h1 className="text-[28px] font-semibold text-white/95 tracking-tight mb-1.5">Suscripción y Pagos</h1>
                                        <p className="text-[13px] text-white/50">Consulta tu plan actual y métodos de pago.</p>
                                    </div>
                                    <PlaceholderCard title="Información de Facturación" icon={CreditCard} />
                                </TabsContent>

                                <TabsContent value="notifications" className="m-0 focus-visible:outline-none">
                                    <div className="mb-6">
                                        <h1 className="text-[28px] font-semibold text-white/95 tracking-tight mb-1.5">Notificaciones</h1>
                                        <p className="text-[13px] text-white/50">Configura las alertas y notificaciones del sistema.</p>
                                    </div>
                                    <PlaceholderCard title="Centro de Notificaciones" icon={Bell} />
                                </TabsContent>

                                <TabsContent value="database" className="m-0 focus-visible:outline-none">
                                    <div className="mb-6">
                                        <h1 className="text-[28px] font-semibold text-white/95 tracking-tight mb-1.5">Base de Datos</h1>
                                        <p className="text-[13px] text-white/50">Gestiona las copias de seguridad y mantenimiento de datos.</p>
                                    </div>
                                    <PlaceholderCard title="Administración de Base de Datos" icon={Database} />
                                </TabsContent>

                                <TabsContent value="settings" className="m-0 focus-visible:outline-none">
                                    <div className="mb-6">
                                        <h1 className="text-[28px] font-semibold text-white/95 tracking-tight mb-1.5">Preferencias</h1>
                                        <p className="text-[13px] text-white/50">Personaliza la experiencia y el comportamiento de la aplicación.</p>
                                    </div>
                                    <PlaceholderCard title="Configuración General" icon={Settings} />
                                </TabsContent>

                            </div>
                        </div>
                    </Tabs>
                </main>
            </div>
        </div>
    );
}

// --- Componentes Fluent Design ---

function FluentTabTrigger({ value, icon: Icon, label }: { value: string, icon: any, label: string }) {
    return (
        <TabsTrigger
            value={value}
            className={cn(
                "group relative flex w-full items-center gap-3 px-3 py-2 text-[13px] font-normal rounded-[4px] transition-all duration-100",
                "text-white/70 hover:bg-white/[0.06] hover:text-white/90",
                "data-[state=active]:bg-white/[0.09] data-[state=active]:text-white",
                "active:bg-white/[0.04] active:scale-[0.98]",
                // Indicador lateral característico de Windows
                "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-4 before:bg-[#0067c0] before:rounded-full before:opacity-0 before:transition-opacity before:duration-100",
                "data-[state=active]:before:opacity-100",
                "justify-start"
            )}
        >
            <Icon className="h-4 w-4 text-white/60 group-data-[state=active]:text-[#0067c0] transition-colors" strokeWidth={2} />
            <span className="flex-1 text-left">{label}</span>
        </TabsTrigger>
    );
}

function PlaceholderCard({ title, icon: Icon }: { title: string, icon: any }) {
    return (
        <div className="rounded-lg border border-white/[0.08] bg-[#2b2b2b]/40 backdrop-blur-sm p-12 shadow-sm">
            <div className="flex flex-col items-center text-center space-y-5">
                <div className="h-16 w-16 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                    <Icon className="h-7 w-7 text-white/30" strokeWidth={1.5} />
                </div>
                <div className="space-y-1.5">
                    <h3 className="text-base font-semibold text-white/85">{title}</h3>
                    <p className="text-[13px] text-white/45 leading-relaxed max-w-md">
                        Este módulo se encuentra en desarrollo
                    </p>
                </div>
                <button className="mt-2 px-5 py-2 text-[13px] font-normal bg-white/[0.06] hover:bg-white/[0.09] border border-white/[0.08] rounded-[4px] transition-all flex items-center gap-2 text-white/70 hover:text-white/90 active:scale-[0.97]">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver documentación
                </button>
            </div>
        </div>
    );
}

function AccessDeniedScreen() {
    return (
        <div className="w-full h-full flex items-center justify-center bg-[#202020] p-6">
            <div className="w-full max-w-md rounded-lg border border-white/[0.12] bg-[#2b2b2b]/80 backdrop-blur-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
                <div className="p-10 text-center space-y-6">
                    <div className="mx-auto w-16 h-16 rounded-full bg-[#c42b1c]/10 border border-[#c42b1c]/20 flex items-center justify-center">
                        <AlertTriangle className="h-7 w-7 text-[#ff4444]" strokeWidth={2} />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-xl font-semibold text-white/95">Acceso denegado</h2>
                        <p className="text-[13px] text-white/55 leading-relaxed max-w-xs mx-auto">
                            No tienes los privilegios necesarios para acceder al panel de administración de licencias.
                        </p>
                    </div>
                    <button className="w-full py-2.5 rounded-[4px] bg-[#0067c0] hover:bg-[#005a9e] text-white text-[13px] font-medium active:scale-[0.98] transition-all shadow-sm">
                        Cerrar aplicación
                    </button>
                </div>
            </div>
        </div>
    );
}