import { BEServerHealth } from "./enums.ts";
import { BackendServerDetails } from "../backend-server-details.ts"

export class HealthCheck {
    public allServers : BackendServerDetails[];
    public healthyServers : BackendServerDetails[];
    private intervalId : ReturnType<typeof setInterval> | undefined
    private checkInterval : number;

    constructor(
        allServers: BackendServerDetails[],
        healthyServers: BackendServerDetails[],
        checkInterval: number = 200
    ) {
        this.allServers = allServers;
        this.healthyServers = healthyServers;
        this.checkInterval = checkInterval;
    }

    public updateHealthyServers(): void {
        this.healthyServers.length = 0;

        this.allServers.forEach((server) => {
            if (server.getStatus() === BEServerHealth.HEALTHY) {
                this.healthyServers.push(server);
            }
        });
    }  

    public handleFailure(server: BackendServerDetails): void {
        server.setStatus(BEServerHealth.UNHEALTHY);
        const index = this.healthyServers.indexOf(server);
        if (index !== -1) {
            this.healthyServers.splice(index, 1);
        }
        process.stdout.write(`passive health check failed: ${server.url} marked UNHEALTHY\n`);
    }

    public start(): void {
        const runChecks = async () => {
            await Promise.all(this.allServers.map((server) => server.ping()));
            this.updateHealthyServers();
        };

        runChecks();
        this.intervalId = setInterval(runChecks, this.checkInterval);
    }

    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
    }
}