// Logical metrics using Performance API

export const measureExecutionTime = (fn: () => void): number => {
    const start = performance.now();
    fn();
    return performance.now() - start;
};

export const measureAsyncExecutionTime = async (fn: () => Promise<void>): Promise<number> => {
    const start = performance.now();
    await fn();
    return performance.now() - start;
};

export const getMemoryUsage = (): number => {
    // usedJSHeapSize in bytes
    return (performance as any).memory?.usedJSHeapSize || 0;
};

export const getLogicalCPUUsage = (duration: number, totalTime: number = 1000): number => {
    // Normalize duration to % over totalTime (e.g., 1 second)
    return Math.min((duration / totalTime) * 100, 100);
};

export const markPerformance = (name: string) => {
    performance.mark(name);
};

export const measurePerformance = (name: string, startMark: string, endMark: string): number => {
    performance.mark(endMark);
    performance.measure(name, startMark, endMark);
    const measure = performance.getEntriesByName(name)[0];
    return measure.duration;
};