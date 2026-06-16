import { BackendServerDetails } from "../backend-server-details.ts";
import { ILbAlgorithm } from "./lb-algo.interface.ts";
import { BEServerHealth } from "../utils/enums.ts";

export class RoundRobin implements ILbAlgorithm {
    private servers: BackendServerDetails[];
    private currentIndex: number;

    constructor(servers: BackendServerDetails[]) {
        this.servers = servers;
        this.currentIndex = 0;
    }

    public nextServer(): BackendServerDetails {
        if (this.servers.length === 0) {
            throw new Error("No backend servers are available in the pool.");
        }

        // Filter out healthy nodes dynamically
        let targetPool = this.servers.filter(
            (server) => server.getStatus() === BEServerHealth.HEALTHY
        );

        if (targetPool.length === 0) {
            targetPool = this.servers;
        }

        const targetServer = targetPool[this.currentIndex % targetPool.length];

        this.currentIndex = (this.currentIndex + 1) % targetPool.length;

        return targetServer;
    }
}