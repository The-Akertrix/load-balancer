import express, { Express } from 'express';
import { Server } from 'http';
import { Config } from './utils/config.ts';
import { BackendServerDetails } from './backend-server-details.ts';
import { HttpClient } from './utils/http-client.ts';


export class LBServer {
    public app: Express;
    public server: Server | undefined;
    public backendServers: BackendServerDetails[];

    constructor() {
        Config.load();
        const config = Config.getConfig();

        this.app = express();

        this.app.use(express.json());
        this.app.use(express.text());
        this.app.use(express.raw({ type: '*/*' }));

        this.backendServers = config.be_servers.map(
            (server) => new BackendServerDetails(server.domain, server.weight)
        );

        this.app.get('/', (_req, res, next) => {
            if (_req.path === '/') {
                return res.send('Load Balancer v1.0');
            }
            next();
        });

        this.app.use(async (req, res) => {
            if (this.backendServers.length === 0) {
                return res.status(500).send('No backend servers configured.');
            }

            const targetServer = this.backendServers[0];

            targetServer.incrementRequestsServed();

            const targetUrl = `${targetServer.url}${req.url}`;

            const forwardedHeaders = { ...req.headers };
            delete forwardedHeaders.host; 

            try {
                const response = await HttpClient.request({
                    method: req.method,
                    url: targetUrl,
                    headers: forwardedHeaders,
                    data: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
                    // Avoid axios throwing on non-2xx statuses so we can pipe the downstream status cleanly
                    validateStatus: () => true, 
                });

                res.status(response.status);
                
                // Set downstream headers safely
                Object.entries(response.headers).forEach(([key, value]) => {
                    if (value !== undefined) {
                        res.setHeader(key, String(value));
                    }
                });

                return res.send(response.data);

            } catch (error) {
                // Graceful Error Handling for dropped connection blocks or 500 errors
                console.error(`Proxy forwarding failed to ${targetUrl}:`, (error as Error).message);
                return res.status(500).send('Internal Server Error (Proxy Failure)');
            }
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