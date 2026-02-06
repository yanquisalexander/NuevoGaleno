// Node Configuration Component
// UI for managing multi-node architecture settings

import { useState, useEffect } from 'react';
import { useNode } from '../contexts/NodeContext';
import { Button } from '../components/ui/button';
import type { WindowId } from '../types/window-manager';
import { useWindowManager } from '../contexts/WindowManagerContext';
import { Server, Globe, Laptop, X, Save, RefreshCw } from 'lucide-react';

export function NodeConfigApp({ windowId }: { windowId: WindowId }) {
  const { nodeConfig, updateNodeConfig, activeContext, startApiServer, stopApiServer, isApiServerRunning } = useNode();
  const { closeWindow } = useWindowManager();
  
  const [localConfig, setLocalConfig] = useState(nodeConfig);
  const [serverRunning, setServerRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalConfig(nodeConfig);
    checkServerStatus();
  }, [nodeConfig]);

  const checkServerStatus = async () => {
    const running = await isApiServerRunning();
    setServerRunning(running);
  };

  const handleSave = async () => {
    if (!localConfig) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      await updateNodeConfig(localConfig);
      
      // If switching to host mode, start server
      if (localConfig.mode === 'host' && localConfig.host_config) {
        await startApiServer(localConfig.host_config);
      }
      
      // If switching away from host mode, stop server
      if (localConfig.mode !== 'host' && serverRunning) {
        await stopApiServer();
      }
      
      await checkServerStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleServer = async () => {
    try {
      if (serverRunning) {
        await stopApiServer();
      } else if (localConfig?.host_config) {
        await startApiServer(localConfig.host_config);
      }
      await checkServerStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleModeChange = (mode: 'standalone' | 'host' | 'client') => {
    if (!localConfig) return;
    
    setLocalConfig({
      ...localConfig,
      mode,
      host_config: mode === 'host' ? (localConfig.host_config || {
        api_port: 3000,
        api_token: '',
        enable_cors: true,
      }) : undefined,
      client_config: mode === 'client' ? (localConfig.client_config || {
        remote_url: '',
        auth_token: '',
      }) : undefined,
    });
  };

  if (!localConfig) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#202020] text-white">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Cargando configuración...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto bg-[#202020] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1c1c1c] border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center border border-white/5">
            <Server className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Configuración Multi-Nodo</h1>
            <p className="text-sm text-white/60">
              Modo actual: <span className="text-blue-400 font-medium">{activeContext?.mode || 'local'}</span>
            </p>
          </div>
        </div>
        <button
          onClick={() => closeWindow(windowId)}
          className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 max-w-3xl">
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        {/* Node Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">Nombre del Nodo</label>
          <input
            type="text"
            value={localConfig.node_name}
            onChange={(e) => setLocalConfig({ ...localConfig, node_name: e.target.value })}
            className="w-full px-4 py-2 bg-[#2d2d2d] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50"
            placeholder="Nombre identificativo del nodo"
          />
        </div>

        {/* Mode Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-white/80">Modo de Operación</label>
          <div className="grid grid-cols-3 gap-3">
            {/* Standalone Mode */}
            <button
              onClick={() => handleModeChange('standalone')}
              className={`p-4 rounded-lg border transition-all ${
                localConfig.mode === 'standalone'
                  ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                  : 'bg-[#2d2d2d] border-white/10 text-white/60 hover:border-white/20'
              }`}
            >
              <Laptop className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Standalone</div>
              <div className="text-xs mt-1 opacity-60">Local únicamente</div>
            </button>

            {/* Host Mode */}
            <button
              onClick={() => handleModeChange('host')}
              className={`p-4 rounded-lg border transition-all ${
                localConfig.mode === 'host'
                  ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                  : 'bg-[#2d2d2d] border-white/10 text-white/60 hover:border-white/20'
              }`}
            >
              <Server className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Host</div>
              <div className="text-xs mt-1 opacity-60">Servidor API</div>
            </button>

            {/* Client Mode */}
            <button
              onClick={() => handleModeChange('client')}
              className={`p-4 rounded-lg border transition-all ${
                localConfig.mode === 'client'
                  ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                  : 'bg-[#2d2d2d] border-white/10 text-white/60 hover:border-white/20'
              }`}
            >
              <Globe className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Client</div>
              <div className="text-xs mt-1 opacity-60">Remoto</div>
            </button>
          </div>
        </div>

        {/* Host Configuration */}
        {localConfig.mode === 'host' && localConfig.host_config && (
          <div className="space-y-4 p-4 rounded-lg bg-[#2d2d2d] border border-white/10">
            <h3 className="text-sm font-medium text-white/80">Configuración de Host</h3>
            
            <div className="space-y-2">
              <label className="text-sm text-white/60">Puerto API</label>
              <input
                type="number"
                value={localConfig.host_config.api_port}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  host_config: { ...localConfig.host_config!, api_port: parseInt(e.target.value) || 3000 }
                })}
                className="w-full px-4 py-2 bg-[#1c1c1c] border border-white/10 rounded-lg text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/60">Token de Autenticación</label>
              <input
                type="password"
                value={localConfig.host_config.api_token}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  host_config: { ...localConfig.host_config!, api_token: e.target.value }
                })}
                className="w-full px-4 py-2 bg-[#1c1c1c] border border-white/10 rounded-lg text-white"
                placeholder="Token seguro para autenticación"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enable-cors"
                checked={localConfig.host_config.enable_cors}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  host_config: { ...localConfig.host_config!, enable_cors: e.target.checked }
                })}
                className="w-4 h-4"
              />
              <label htmlFor="enable-cors" className="text-sm text-white/60">Habilitar CORS</label>
            </div>

            {serverRunning && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm">Servidor API activo en puerto {localConfig.host_config.api_port}</span>
              </div>
            )}

            <Button
              onClick={handleToggleServer}
              variant="outline"
              className="w-full"
            >
              {serverRunning ? 'Detener Servidor' : 'Iniciar Servidor'}
            </Button>
          </div>
        )}

        {/* Client Configuration */}
        {localConfig.mode === 'client' && localConfig.client_config && (
          <div className="space-y-4 p-4 rounded-lg bg-[#2d2d2d] border border-white/10">
            <h3 className="text-sm font-medium text-white/80">Configuración de Cliente</h3>
            
            <div className="space-y-2">
              <label className="text-sm text-white/60">URL del Host Remoto</label>
              <input
                type="text"
                value={localConfig.client_config.remote_url}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  client_config: { ...localConfig.client_config!, remote_url: e.target.value }
                })}
                className="w-full px-4 py-2 bg-[#1c1c1c] border border-white/10 rounded-lg text-white"
                placeholder="http://192.168.1.100:3000"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/60">Token de Autenticación</label>
              <input
                type="password"
                value={localConfig.client_config.auth_token}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  client_config: { ...localConfig.client_config!, auth_token: e.target.value }
                })}
                className="w-full px-4 py-2 bg-[#1c1c1c] border border-white/10 rounded-lg text-white"
                placeholder="Token del host remoto"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-[#0067c0] hover:bg-[#0078d4] text-white"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Configuración
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
