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

    public start(): void {
        const runChecks = () => {
            this.allServers.forEach((server) => server.ping());

            this.updateHealthyServers();
        };

        runChecks(); // immediate
        this.intervalId = setInterval(runChecks, this.checkInterval);
    }

    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
    }
}