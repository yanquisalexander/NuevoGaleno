// Node Configuration Component
// UI for managing multi-node architecture settings refined for Windows 11 Fluent Dark

import { useState, useEffect } from 'react';
import { useNode } from '../contexts/NodeContext';
import { Button } from '../components/ui/button';
import type { WindowId } from '../types/window-manager';
import { useWindowManager } from '../contexts/WindowManagerContext';
import { Server, Globe, Laptop, X, Save, RefreshCw, ChevronRight, ShieldCheck } from 'lucide-react';

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
      if (localConfig.mode === 'host' && localConfig.host_config) {
        await startApiServer(localConfig.host_config);
      }
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
      <div className="h-full w-full flex items-center justify-center bg-[#1c1c1c] text-white font-['Segoe_UI']">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-[#60cdff] animate-spin" />
          <span className="text-sm font-light opacity-80">Sincronizando con el sistema...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto bg-[#1c1c1c] text-white font-['Segoe_UI'] selection:bg-[#0078d4]/30">
      {/* Header Estilo Windows 11 */}
      <div className="sticky top-0 z-10 bg-[#1c1c1c]/80 backdrop-blur-2xl border-b border-white/[0.05] px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#ffffff08] flex items-center justify-center border border-white/[0.1] shadow-xl">
            <Server className="w-6 h-6 text-[#60cdff]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Nodo del Sistema</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${serverRunning ? 'bg-[#60cdff]' : 'bg-white/20'}`} />
              <p className="text-[12px] text-white/50 uppercase tracking-wider font-bold">
                Módulo: <span className="text-white/80">{activeContext?.mode || 'local'}</span>
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Content */}
      <div className="p-8 space-y-8 max-w-4xl mx-auto">
        {error && (
          <div className="p-4 rounded-[4px] bg-[#442726] border-l-4 border-l-[#ff99a4] text-[#ff99a4] text-sm flex items-center gap-3">
            <div className="bg-[#ff99a4] rounded-full p-0.5"><X className="w-3 h-3 text-[#442726]" /></div>
            {error}
          </div>
        )}

        {/* Section: General Info */}
        <section className="space-y-4">
          <h2 className="text-[14px] font-semibold text-white/90">Identidad del Dispositivo</h2>
          <div className="relative group">
            <input
              type="text"
              value={localConfig.node_name}
              onChange={(e) => setLocalConfig({ ...localConfig, node_name: e.target.value })}
              className="w-full px-4 py-2.5 bg-[#ffffff06] border border-white/10 border-b-white/40 rounded-[4px] text-sm text-white focus:bg-[#00000040] focus:border-b-[#60cdff] focus:outline-none transition-all"
              placeholder="Nombre del nodo local"
            />
          </div>
        </section>

        {/* Mode Selection Estilo "Settings Cards" */}
        <section className="space-y-4">
          <h2 className="text-[14px] font-semibold text-white/90">Arquitectura de Red</h2>
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'standalone', icon: Laptop, title: 'Modo Autónomo', desc: 'Base de datos local aislada', color: 'text-gray-400' },
              { id: 'host', icon: Server, title: 'Modo Servidor (Host)', desc: 'Habilita acceso remoto a otros nodos', color: 'text-[#60cdff]' },
              { id: 'client', icon: Globe, title: 'Modo Cliente', desc: 'Conectar a un servidor Galeno central', color: 'text-[#4ec9b0]' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => handleModeChange(m.id as any)}
                className={`flex items-center gap-4 p-4 rounded-[6px] border text-left transition-all ${localConfig.mode === m.id
                  ? 'bg-[#ffffff0a] border-white/20 shadow-inner'
                  : 'bg-[#ffffff04] border-transparent hover:bg-[#ffffff08] hover:border-white/10'
                  }`}
              >
                <div className={`p-3 rounded-md bg-[#00000020] ${localConfig.mode === m.id ? 'ring-1 ring-white/10' : ''}`}>
                  <m.icon className={`w-5 h-5 ${localConfig.mode === m.id ? m.color : 'text-white/40'}`} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{m.title}</div>
                  <div className="text-[12px] text-white/40">{m.desc}</div>
                </div>
                {localConfig.mode === m.id && <div className="w-1.5 h-4 bg-[#60cdff] rounded-full" />}
              </button>
            ))}
          </div>
        </section>

        {/* Dynamic Panels */}
        <div className="grid grid-cols-1 gap-6">
          {localConfig.mode === 'host' && localConfig.host_config && (
            <div className="space-y-5 p-6 rounded-[8px] bg-[#ffffff05] border border-white/10 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-[#60cdff]">
                <ShieldCheck className="w-4 h-4" />
                <h3 className="text-sm font-semibold uppercase tracking-widest">Ajustes de Servidor</h3>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[12px] text-white/60 ml-1">Puerto de Escucha</label>
                  <input
                    type="number"
                    value={localConfig.host_config.api_port}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      host_config: { ...localConfig.host_config!, api_port: parseInt(e.target.value) || 3000 }
                    })}
                    className="w-full px-4 py-2 bg-[#00000040] border border-white/10 rounded-[4px] text-sm focus:border-[#60cdff] outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] text-white/60 ml-1">Token API (Security)</label>
                  <input
                    type="password"
                    value={localConfig.host_config.api_token}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      host_config: { ...localConfig.host_config!, api_token: e.target.value }
                    })}
                    className="w-full px-4 py-2 bg-[#00000040] border border-white/10 rounded-[4px] text-sm focus:border-[#60cdff] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#ffffff04] rounded-md border border-white/5">
                <div className="relative flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="enable-cors"
                    checked={localConfig.host_config.enable_cors}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      host_config: { ...localConfig.host_config!, enable_cors: e.target.checked }
                    })}
                    className="w-10 h-5 appearance-none bg-white/10 checked:bg-[#60cdff] rounded-full transition-all cursor-pointer border border-white/20"
                  />
                  <div className={`absolute left-1 w-3 h-3 bg-white rounded-full transition-transform ${localConfig.host_config.enable_cors ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <label htmlFor="enable-cors" className="text-sm text-white/80">Permitir peticiones externas (CORS)</label>
              </div>

              <Button
                onClick={handleToggleServer}
                variant="outline"
                className={`w-full py-6 border-white/10 font-normal ${serverRunning ? 'hover:bg-red-500/10 hover:text-red-400' : 'hover:bg-[#60cdff]/10 hover:text-[#60cdff]'}`}
              >
                {serverRunning ? 'Detener Servicio Activo' : 'Iniciar Servicio de Red'}
              </Button>
            </div>
          )}

          {localConfig.mode === 'client' && localConfig.client_config && (
            <div className="space-y-5 p-6 rounded-[8px] bg-[#ffffff05] border border-white/10 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-[#4ec9b0]">
                <Globe className="w-4 h-4" />
                <h3 className="text-sm font-semibold uppercase tracking-widest">Enlace Remoto</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[12px] text-white/60 ml-1">URL del Servidor Galeno</label>
                  <input
                    type="text"
                    value={localConfig.client_config.remote_url}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      client_config: { ...localConfig.client_config!, remote_url: e.target.value }
                    })}
                    className="w-full px-4 py-2 bg-[#00000040] border border-white/10 rounded-[4px] text-sm placeholder:opacity-20"
                    placeholder="https://api.galeno-cloud.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] text-white/60 ml-1">Access Auth Token</label>
                  <input
                    type="password"
                    value={localConfig.client_config.auth_token}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      client_config: { ...localConfig.client_config!, auth_token: e.target.value }
                    })}
                    className="w-full px-4 py-2 bg-[#00000040] border border-white/10 rounded-[4px] text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions Estilo Fluent Primary */}
        <div className="flex items-center gap-4 pt-4 border-t border-white/5">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 h-11 bg-[#0067c0] hover:bg-[#0078d4] text-white rounded-[4px] border-t border-white/20 shadow-lg transition-all active:scale-[0.98]"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSaving ? "Aplicando cambios..." : "Guardar y Reiniciar Nodo"}
          </Button>
        </div>
      </div>
    </div>
  );
}