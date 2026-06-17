import { BEServerHealth } from "./utils/enums.ts";
import { HttpClient } from "./utils/http-client.ts";

export interface IBackendServerDetails {
    url : string;
    serverWeight : number;
    
    getStatus() : BEServerHealth;
    setStatus(status : BEServerHealth) : void;

    //Metrics 
    incrementRequestsServed() : void;
    resetMetrics() : void;

    ping() : Promise<boolean>;
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

    async ping() : Promise<boolean> {
        try{
            const response = await axios.get(`${this.url}/ping`, { timeout: 50 });
            //treat only 200 as helath
            if(response.status >= 200 && response.status < 300) {
                this.setStatus(BEServerHealth.HEALTHY);
                return true;
            }

            //non 2xx means unhealthy
            this.setStatus(BEServerHealth.UNHEALTHY);
            return false;
        } 
        catch{
            this.setStatus(BEServerHealth.UNHEALTHY);
            return false;
        }
    }
}