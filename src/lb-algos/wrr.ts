import { BackendServerDetails } from "../backend-server-details.ts";
import { ILbAlgorithm } from "./lb-algo.interface.ts";
import { BEServerHealth } from "../utils/enums.ts";

export class WeightedRoundRobin implements ILbAlgorithm {
    private servers: BackendServerDetails[];
    private currentIndex: number;
    private currentWeight: number;
    private maxWeight: number;
    private gcdWeight: number;

    constructor(servers: BackendServerDetails[]) {
        this.servers = servers;
        this.currentIndex = -1;
        this.currentWeight = 0;
        this.maxWeight = 0;
        this.gcdWeight = 1;
    }


    private getGcd(a: number, b: number): number {
        while (b !== 0) {
            const temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }


    private updatePoolMetrics(pool: BackendServerDetails[]): void {
        if (pool.length === 0) return;

        this.maxWeight = Math.max(...pool.map((s) => s.serverWeight));
        
        let currentGcd = pool[0].serverWeight;
        for (let i = 1; i < pool.length; i++) {
            currentGcd = this.getGcd(currentGcd, pool[i].serverWeight);
        }
        this.gcdWeight = currentGcd;
    }


    public nextServer(): BackendServerDetails {
        if (this.servers.length === 0) {
            throw new Error("No backend servers are available in the pool.");
        }

        let targetPool = this.servers.filter(
            (server) => server.getStatus() === BEServerHealth.HEALTHY
        );

        if (targetPool.length === 0) {
            targetPool = this.servers;
        }

        this.updatePoolMetrics(targetPool);

        while (true) {
            this.currentIndex = (this.currentIndex + 1) % targetPool.length;

            if (this.currentIndex === 0) {
                this.currentWeight = this.currentWeight - this.gcdWeight;
                if (this.currentWeight <= 0) {
                    this.currentWeight = this.maxWeight;
                    if (this.currentWeight === 0) {
                        return targetPool[0];
                    }
                }
            }

            const server = targetPool[this.currentIndex];
            if (server.serverWeight >= this.currentWeight) {
                return server;
            }
        }
    }
}