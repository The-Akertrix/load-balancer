import { BackendServerDetails } from "../backend-server-details.ts";
import { ILbAlgorithm } from "./lb-algo.interface.ts";

export class FallbackAlgo implements ILbAlgorithm {
    private servers: BackendServerDetails[];

    constructor(servers: BackendServerDetails[]) {
        this.servers = servers;
    }

    public nextServer(): BackendServerDetails {
        if (this.servers.length === 0) {
            throw new Error("No backend servers available in pool.");
        }
        // Fallback strategy: return the first server
        return this.servers[0];
    }
}