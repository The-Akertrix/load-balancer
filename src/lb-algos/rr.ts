import { BackendServerDetails } from "../backend-server-details.ts";
import { ILbAlgorithm } from "./lb-algo.interface.ts";
 
export class RoundRobin implements ILbAlgorithm {
    private healthyServers: BackendServerDetails[];
    private currentIndex: number;

constructor(healthyServers: BackendServerDetails[]) {
        this.healthyServers = healthyServers;
        this.currentIndex = 0;
    }

    public nextServer(): BackendServerDetails {
        if (this.healthyServers.length === 0) {
            throw new Error("No backend servers are available in the pool.");
        }

        const targetServer = this.healthyServers[this.currentIndex % this.healthyServers.length];
        
        this.currentIndex = (this.currentIndex + 1) % this.healthyServers.length;

        return targetServer;
    }
}