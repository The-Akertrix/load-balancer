import { server } from "typescript";
import { BackendServerDetails } from "../backend-server-details.ts"

export class HealthCheck {
    public allServers : BackendServerDetails[];
    public healthyServers : BackendServerDetails[];
    private intervalId : ReturnType<typeof setInterval> | undefinded;
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

    public start(): void {
        const runChecks = () => {
            this.allServers.forEach((server) => server.ping());
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