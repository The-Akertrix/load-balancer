import { BackendServerDetails } from "../backend-server-details.ts";
import { ILbAlgorithm } from "./lb-algo.interface.ts";

export class FallbackAlgo implements ILbAlgorithm {
    private healthyServers: BackendServerDetails[];

    constructor(healthyServers: BackendServerDetails[]) {
        this.healthyServers = healthyServers;
    }

    public nextServer(): BackendServerDetails {
        if (this.healthyServers.length === 0) {
            throw new Error("No backend servers available in pool.");
        }
        // Fallback strategy: return the first server
        return this.healthyServers[0];
    }
}