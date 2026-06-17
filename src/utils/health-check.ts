import { BackendServerDetails } from "../backend-server-details.ts"

export class HealthCheck {
    public allServers : BackendServerDetails[];
    public healthyServers : BackendServerDetails[];

    constructor(allServers : BackendServerDetails[], healthyServers: BackendServerDetails[]){
        this.allServers = allServers;
        this.healthyServers = healthyServers;
    }

    public start() : void {

    }

    public stop(): void {

    }
}