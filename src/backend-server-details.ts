import { BEServerHealth } from "./utils/enums.ts";

export interface IBackendServerDetails {
    url : string;
    serverWeight : number;
    
    getStatus() : BEServerHealth;
    setStatus(status : BEServerHealth) : void;

    //Metrics 
    incrementRequestsServed() : void;
    resetMetrics() : void;
}


export class BackendServerDetails implements IBackendServerDetails {
    public url : string;
    public serverWeight: number;
    public requestsServedCount = 0;
    private status : BEServerHealth = BEServerHealth.UNHEALTHY;

    constructor(
        url : string,
        serverWeight : number
    ) {
        this.url = url;
        this.serverWeight = serverWeight;
    };


    getStatus(): BEServerHealth {
        return this.status;
    }

    setStatus(status: BEServerHealth): void {
        this.status = status;
    }


    incrementRequestsServed(): void {
        this.requestsServedCount += 1;
    }

    resetMetrics(): void {
        this.requestsServedCount = 0;
    }
}