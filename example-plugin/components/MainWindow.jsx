import React, { useState, useEffect } from 'react';

export default function MainWindow({ data }) {
  const [patientCount, setPatientCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Access plugin context if provided
      if (data && data.context) {
        const patients = await data.context.api.patients.getAll(100);
        setPatientCount(patients.length);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = () => {
    if (data && data.context) {
      data.context.api.ui.showNotification(
        '¡Hola desde el plugin!',
        'success'
      );
    }
  };

  return (
    <div className="p-6 h-full bg-gradient-to-br from-purple-900/20 to-blue-900/20">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👋</div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Hello World Plugin
          </h1>
          <p className="text-white/70">
            Un ejemplo de plugin para Nuevo Galeno
          </p>
        </div>

        {/* Content */}
        <div className="bg-white/5 rounded-lg p-6 backdrop-blur-sm border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">
            Información del Sistema
          </h2>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/70">Estado del Plugin:</span>
              <span className="text-green-400 font-medium">✓ Activo</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/70">Versión:</span>
              <span className="text-white">1.0.0</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/70">Pacientes en el sistema:</span>
              <span className="text-white">
                {loading ? 'Cargando...' : patientCount}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            <button
              onClick={showNotification}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors"
            >
              Mostrar Notificación
            </button>
            
            <button
              onClick={() => window.open('https://github.com', '_blank')}
              className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg transition-colors"
            >
              Abrir Documentación
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-600/10 border border-blue-600/20 rounded-lg p-4">
          <p className="text-blue-400 text-sm">
            💡 Este es un plugin de ejemplo. Puedes modificar este código para crear
            tu propio plugin personalizado para Nuevo Galeno.
          </p>
        </div>
      </div>
    </div>
  );
}
