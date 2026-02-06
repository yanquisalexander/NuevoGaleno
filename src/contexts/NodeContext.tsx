// Node Context - Manages multi-node architecture state
// Determines if the UI communicates with local backend (invoke) or remote backend (HTTP)

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

export type NodeMode = 'standalone' | 'host' | 'client';

export interface HostConfig {
  api_port: number;
  api_token: string;
  enable_cors: boolean;
}

export interface ClientConfig {
  remote_url: string;
  auth_token: string;
}

export interface NodeConfig {
  mode: NodeMode;
  node_name: string;
  host_config?: HostConfig;
  client_config?: ClientConfig;
}

export interface ActiveContext {
  mode: 'local' | 'remote';
  apiBaseUrl?: string;
  authToken?: string;
  nodeName: string;
}

interface NodeContextType {
  nodeConfig: NodeConfig | null;
  activeContext: ActiveContext | null;
  isLoading: boolean;
  error: string | null;
  updateNodeConfig: (config: NodeConfig) => Promise<void>;
  refreshConfig: () => Promise<void>;
  startApiServer: (config: HostConfig) => Promise<void>;
  stopApiServer: () => Promise<void>;
  isApiServerRunning: () => Promise<boolean>;
}

const NodeContext = createContext<NodeContextType | undefined>(undefined);

export const useNode = () => {
  const context = useContext(NodeContext);
  if (!context) {
    throw new Error('useNode must be used within NodeProvider');
  }
  return context;
};

interface NodeProviderProps {
  children: ReactNode;
}

export const NodeProvider: React.FC<NodeProviderProps> = ({ children }) => {
  const [nodeConfig, setNodeConfig] = useState<NodeConfig | null>(null);
  const [activeContext, setActiveContext] = useState<ActiveContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshConfig = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const config = await invoke<NodeConfig>('get_node_config');
      setNodeConfig(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // Set default standalone config on error
      setNodeConfig({
        mode: 'standalone',
        node_name: 'NuevoGaleno',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load node configuration on mount
  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  // Update active context when node config changes
  useEffect(() => {
    if (!nodeConfig) return;

    const context: ActiveContext = {
      mode: nodeConfig.mode === 'client' ? 'remote' : 'local',
      nodeName: nodeConfig.node_name,
    };

    if (nodeConfig.mode === 'client' && nodeConfig.client_config) {
      context.apiBaseUrl = nodeConfig.client_config.remote_url;
      context.authToken = nodeConfig.client_config.auth_token;
    }

    setActiveContext(context);
  }, [nodeConfig]);

  const updateNodeConfig = async (config: NodeConfig) => {
    try {
      await invoke('set_node_config', { config });
      setNodeConfig(config);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const startApiServer = async (config: HostConfig) => {
    try {
      await invoke('start_api_server', { config });
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const stopApiServer = async () => {
    try {
      await invoke('stop_api_server');
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const isApiServerRunning = async (): Promise<boolean> => {
    try {
      return await invoke<boolean>('is_api_server_running');
    } catch (err) {
      console.error('Error checking API server status:', err);
      return false;
    }
  };

  return (
    <NodeContext.Provider
      value={{
        nodeConfig,
        activeContext,
        isLoading,
        error,
        updateNodeConfig,
        refreshConfig,
        startApiServer,
        stopApiServer,
        isApiServerRunning,
      }}
    >
      {children}
    </NodeContext.Provider>
  );
};
