import { BackendServerDetails } from "../backend-server-details.ts";
import { ILbAlgorithm } from "./lb-algo.interface.ts";

export class WeightedRoundRobin implements ILbAlgorithm {
    private healthyServers: BackendServerDetails[];    
    private currentIndex: number;
    private currentWeight: number;
    private maxWeight: number;
    private gcdWeight: number;

    constructor(healthyServers: BackendServerDetails[]) {
        this.healthyServers = healthyServers;
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


    private updatePoolMetrics(): void {
        if (this.healthyServers.length === 0) return;

        this.maxWeight = Math.max(...this.healthyServers.map((s) => s.serverWeight));
        
        let currentGcd = this.healthyServers[0].serverWeight;
        for (let i = 1; i < this.healthyServers.length; i++) {
            currentGcd = this.getGcd(currentGcd, this.healthyServers[i].serverWeight);
        }
        this.gcdWeight = currentGcd;
    }


    public nextServer(): BackendServerDetails {
        // Critical: Handle an empty healthy pool explicitly
        if (this.healthyServers.length === 0) {
            throw new Error("No healthy servers available");
        }

        this.updatePoolMetrics();

        while (true) {
            this.currentIndex = (this.currentIndex + 1) % this.healthyServers.length;

            if (this.currentIndex === 0) {
                this.currentWeight = this.currentWeight - this.gcdWeight;
                if (this.currentWeight <= 0) {
                    this.currentWeight = this.maxWeight;
                    if (this.currentWeight === 0) {
                        return this.healthyServers[0];
                    }
                }
            }

            const server = this.healthyServers[this.currentIndex];
            if (server.serverWeight >= this.currentWeight) {
                return server;
            }
        }
    }
}