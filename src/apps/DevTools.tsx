import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bug } from 'lucide-react';

export function DevToolsApp() {
    const [triggerError, setTriggerError] = useState(false);

    useEffect(() => {
        // Test Error Boundary after 5 seconds
        const timer = setTimeout(() => {
            setTriggerError(true);
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const handleManualTest = () => {
        setTriggerError(true);
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
        </div>
    );
}