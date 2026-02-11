export interface RuntimeApp {
    id: string;
    name: string;
    status: "active" | "idle" | "frozen" | "killed";
    cpu: number;
    ram: number;
    startTime: number;
}

export class AppRuntimeManager {
    private apps: Map<string, RuntimeApp> = new Map();

    register(appId: string, name: string): void {
        if (this.apps.has(appId)) {
            throw new Error(`App ${appId} already registered`);
        }
        const app: RuntimeApp = {
            id: appId,
            name,
            status: "idle",
            cpu: 0,
            ram: 0,
            startTime: Date.now(),
        };
        this.apps.set(appId, app);
    }

    markActive(appId: string): void {
        const app = this.apps.get(appId);
        if (app && app.status !== "killed") {
            app.status = "active";
        }
    }

    markIdle(appId: string): void {
        const app = this.apps.get(appId);
        if (app && app.status !== "killed") {
            app.status = "idle";
        }
    }

    updateMetrics(appId: string, cpu: number, ram: number): void {
        const app = this.apps.get(appId);
        if (app) {
            app.cpu = cpu;
            app.ram = ram;
        }
    }

    freeze(appId: string): void {
        const app = this.apps.get(appId);
        if (app && app.status !== "killed") {
            app.status = "frozen";
            // TODO: Implement actual freeze logic (pause timers, etc.)
        }
    }

    resume(appId: string): void {
        const app = this.apps.get(appId);
        if (app && app.status === "frozen") {
            app.status = "active";
            // TODO: Implement resume logic
        }
    }

    kill(appId: string): void {
        const app = this.apps.get(appId);
        if (app) {
            app.status = "killed";
            // TODO: Implement kill logic (unmount, clean state)
        }
    }

    getAll(): RuntimeApp[] {
        return Array.from(this.apps.values());
    }

    getApp(appId: string): RuntimeApp | undefined {
        return this.apps.get(appId);
    }
}