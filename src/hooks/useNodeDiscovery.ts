// Node Discovery Hook
// Provides automatic discovery of Galeno nodes on the local network

import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect, useCallback } from 'react';

export interface DiscoveredNode {
    service_name: string;
    node_name: string;
    hostname: string;
    port: number;
    version: string;
    last_seen: string; // ISO date string
}

export interface UseNodeDiscoveryReturn {
    discoveredNodes: DiscoveredNode[];
    isDiscovering: boolean;
    startDiscovery: () => Promise<void>;
    stopDiscovery: () => Promise<void>;
    refreshNodes: () => Promise<void>;
}

/**
 * Hook for discovering Galeno nodes on the local network
 */
export function useNodeDiscovery(): UseNodeDiscoveryReturn {
    const [discoveredNodes, setDiscoveredNodes] = useState<DiscoveredNode[]>([]);
    const [isDiscovering, setIsDiscovering] = useState(false);

    const refreshNodes = useCallback(async () => {
        try {
            const nodes = await invoke<DiscoveredNode[]>('get_discovered_nodes');
            setDiscoveredNodes(nodes);
        } catch (error) {
            console.error('Error getting discovered nodes:', error);
        }
    }, []);

    const startDiscovery = useCallback(async () => {
        if (isDiscovering) return;

        try {
            setIsDiscovering(true);
            await invoke('start_node_discovery');

            // Refresh nodes immediately and then periodically
            await refreshNodes();
            const interval = setInterval(refreshNodes, 5000); // Refresh every 5 seconds

            // Store interval for cleanup (this is a simple approach)
            (window as any).__discoveryInterval = interval;
        } catch (error) {
            console.error('Error starting node discovery:', error);
            setIsDiscovering(false);
        }
    }, [isDiscovering, refreshNodes]);

    const stopDiscovery = useCallback(async () => {
        try {
            // Clear refresh interval
            if ((window as any).__discoveryInterval) {
                clearInterval((window as any).__discoveryInterval);
                delete (window as any).__discoveryInterval;
            }

            await invoke('stop_node_discovery');
            setIsDiscovering(false);
        } catch (error) {
            console.error('Error stopping node discovery:', error);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if ((window as any).__discoveryInterval) {
                clearInterval((window as any).__discoveryInterval);
            }
        };
    }, []);

    return {
        discoveredNodes,
        isDiscovering,
        startDiscovery,
        stopDiscovery,
        refreshNodes,
    };
}

/**
 * Hook for broadcasting this node as a host
 */
export function useNodeBroadcast(nodeName: string, port: number) {
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const startBroadcast = useCallback(async () => {
        if (isBroadcasting) return;

        try {
            setIsBroadcasting(true);
            await invoke('start_node_broadcast', { nodeName, port });
        } catch (error) {
            console.error('Error starting node broadcast:', error);
            setIsBroadcasting(false);
        }
    }, [isBroadcasting, nodeName, port]);

    const stopBroadcast = useCallback(async () => {
        // Note: Currently no explicit stop command, broadcast stops when app closes
        setIsBroadcasting(false);
    }, []);

    return {
        isBroadcasting,
        startBroadcast,
        stopBroadcast,
    };
}