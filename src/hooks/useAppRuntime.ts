import { useEffect, useRef } from 'react';
import { AppRuntimeManager } from '../lib/AppRuntimeManager';

const runtimeManager = new AppRuntimeManager();

export const useAppRuntime = (appId: string, name: string) => {
    const startTimeRef = useRef<number>(0);
    const renderCountRef = useRef<number>(0);
    const eventCountRef = useRef<number>(0);

    useEffect(() => {
        runtimeManager.register(appId, name);
        startTimeRef.current = performance.now();

        // Track renders (simplified)
        renderCountRef.current++;

        // Track events (simplified, could be enhanced)
        const handleEvent = () => {
            eventCountRef.current++;
        };
        window.addEventListener('click', handleEvent);

        // Update metrics periodically
        const metricsInterval = setInterval(() => {
            const ram = (performance as any).memory?.usedJSHeapSize || 0;
            const cpu = Math.random() * 10; // Simulated CPU usage
            runtimeManager.updateMetrics(appId, cpu, ram / 1024 / 1024);
        }, 1000);

        return () => {
            window.removeEventListener('click', handleEvent);
            clearInterval(metricsInterval);
        };
    }, [appId, name]);

    const start = () => {
        runtimeManager.markActive(appId);
    };

    const measure = async <T>(fn: () => Promise<T>): Promise<T> => {
        const start = performance.now();
        const result = await fn();
        const duration = performance.now() - start;

        // Update CPU (logical, as duration)
        const cpu = Math.min(duration / 100, 100); // Normalize to %
        const ram = (performance as any).memory?.usedJSHeapSize || 0;
        runtimeManager.updateMetrics(appId, cpu, ram / 1024 / 1024); // MB

        return result;
    };

    const end = () => {
        runtimeManager.markIdle(appId);
    };

    const freeze = () => {
        runtimeManager.freeze(appId);
    };

    const resume = () => {
        runtimeManager.resume(appId);
    };

    const kill = () => {
        runtimeManager.kill(appId);
    };

    return {
        start,
        measure,
        end,
        freeze,
        resume,
        kill,
        getMetrics: () => runtimeManager.getApp(appId),
    };
};

export { runtimeManager };