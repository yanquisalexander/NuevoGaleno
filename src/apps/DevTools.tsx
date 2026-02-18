import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bug, Shield, ShieldAlert } from 'lucide-react';
import { SystemPasswordDialog } from '@/components/SystemPasswordDialog';
import { toast } from 'sonner';

export function DevToolsApp() {
    const [triggerError, setTriggerError] = useState(false);
    const [passwordDialog, setPasswordDialog] = useState<{
        open: boolean;
        title: string;
        description: string;
        dangerous: boolean;
        actionType: 'admin' | 'dangerous' | 'install' | 'delete' | 'system';
        appId?: string;
        moduleName?: string;
    }>({
        open: false,
        title: '',
        description: '',
        dangerous: false,
        actionType: 'admin',
    });

    useEffect(() => {


    }, []);

    const handleManualTest = () => {
        setTriggerError(true);
    };

    const openPasswordDialog = (dangerous: boolean = false, actionType: 'admin' | 'dangerous' | 'install' | 'delete' | 'system' = 'admin') => {
        setPasswordDialog({
            open: true,
            title: dangerous ? 'Eliminar datos del sistema' : 'Acceder a configuración avanzada',
            description: dangerous ? 'Esta acción eliminará datos críticos' : 'Configurar parámetros del sistema',
            dangerous,
            actionType,
            appId: 'dev-tools',
            moduleName: 'Herramientas de Desarrollo',
        });
    };

    const handlePasswordConfirm = async (passwordHash: string) => {
        // Simular una acción administrativa
        console.log('Password confirmed with hash:', passwordHash);
        toast.success('Acción administrativa completada exitosamente');
    };

    // Trigger error during render if flag is set
    if (triggerError) {
        throw new Error('Test Error Boundary - This is a simulated error for testing purposes');
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <Bug className="w-8 h-8 text-orange-500" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">DEV Tools</h1>
                    <p className="text-gray-600">Herramientas de desarrollo y testing</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Test Error Boundary
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-700">
                        Esta herramienta lanza un error automáticamente después de 5 segundos para probar el Error Boundary.
                        También puedes probar manualmente haciendo click en el botón.
                    </p>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-yellow-800">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="font-medium">Advertencia</span>
                        </div>
                        <p className="text-yellow-700 text-sm mt-1">
                            Esta acción causará un error intencional para probar el manejo de errores.
                        </p>
                    </div>

                    <Button
                        onClick={handleManualTest}
                        variant="destructive"
                        className="w-full"
                    >
                        Probar Error Boundary Manualmente
                    </Button>

                    <div className="text-center text-gray-500 text-sm">
                        Error automático en 5 segundos...
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-500" />
                        Test System Password Dialog
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-700">
                        Prueba el diálogo de contraseña del sistema en diferentes modos.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-blue-500" />
                                Modo Administrativo
                            </h4>
                            <p className="text-sm text-gray-600">
                                Acceso a configuración del sistema.
                            </p>
                            <Button
                                onClick={() => openPasswordDialog(false, 'admin')}
                                variant="outline"
                                className="w-full"
                            >
                                Probar Admin
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-red-500" />
                                Modo Crítico
                            </h4>
                            <p className="text-sm text-gray-600">
                                Eliminación de datos importantes.
                            </p>
                            <Button
                                onClick={() => openPasswordDialog(true, 'delete')}
                                variant="outline"
                                className="w-full border-red-200 hover:border-red-300"
                            >
                                Probar Crítico
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-amber-500" />
                                Modo Instalación
                            </h4>
                            <p className="text-sm text-gray-600">
                                Instalar nuevos módulos.
                            </p>
                            <Button
                                onClick={() => openPasswordDialog(false, 'install')}
                                variant="outline"
                                className="w-full border-amber-200 hover:border-amber-300"
                            >
                                Probar Instalación
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-purple-500" />
                                Modo Sistema
                            </h4>
                            <p className="text-sm text-gray-600">
                                Cambios en configuración del sistema.
                            </p>
                            <Button
                                onClick={() => openPasswordDialog(false, 'system')}
                                variant="outline"
                                className="w-full border-purple-200 hover:border-purple-300"
                            >
                                Probar Sistema
                            </Button>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-blue-800">
                            <Shield className="w-4 h-4" />
                            <span className="font-medium">Nota</span>
                        </div>
                        <p className="text-blue-700 text-sm mt-1">
                            Prueba diferentes tipos de acciones administrativas. Cada modo tiene colores y textos específicos para Nuevo Galeno.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <SystemPasswordDialog
                open={passwordDialog.open}
                onOpenChange={(open) => setPasswordDialog(prev => ({ ...prev, open }))}
                title={passwordDialog.title}
                description={passwordDialog.description}
                dangerous={passwordDialog.dangerous}
                actionType={passwordDialog.actionType}
                appId={passwordDialog.appId}
                moduleName={passwordDialog.moduleName}
                onConfirm={handlePasswordConfirm}
            />
        </div>
    );
}