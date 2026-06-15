import express, { Express } from 'express';
import { Server } from 'http';
import { Config } from './utils/config.ts';
import { BackendServerDetails  } from './backend-server-details.ts';


export class LBServer {
    public app: Express;
    public server: Server | undefined;
    public backendServers: BackendServerDetails[];

    constructor() {
        // 1. Core Config initialization
        Config.load();
        const config = Config.getConfig();

        // 2. Initialize the Express app
        this.app = express();

        // 3. Map configured JSON servers into stateful BackendServerDetails instances
        this.backendServers = config.be_servers.map(
            (server) => new BackendServerDetails(server.domain, server.weight)
        );

        // Define a simple base route for verification
        this.app.get('/', (_req, res) => {
            res.send('Load Balancer v1.0');
        });
    }

    /**
     * Binds the application to the configured port and boots the HTTP server listener.
     */
    public init(): void {
        const config = Config.getConfig();
        const PORT = config.lbPORT;

        this.server = this.app.listen(PORT, () => {
            console.log(`load balancer running on port ${PORT} using ${config.lbAlgo} algorithm`);
            console.log(`initialised backend serverrs : ${this.backendServers.length}`);
        });
    }
}