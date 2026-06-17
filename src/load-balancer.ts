import express, { Express } from 'express';
import { Server } from 'http';
import { Config } from './utils/config.ts';
import { BackendServerDetails } from './backend-server-details.ts';
import { HttpClient } from './utils/http-client.ts';
import { ILbAlgorithm } from './lb-algos/lb-algo.interface.ts';
import { FallbackAlgo } from './lb-algos/fallback-algo.ts';
import { RoundRobin } from './lb-algos/rr.ts';
import { WeightedRoundRobin } from './lb-algos/wrr.ts';
import { HealthCheck } from './utils/health-check.ts';

export class LBServer {
    public app: Express;
    public server: Server | undefined;
    public backendServers: BackendServerDetails[];
    private lbAlgoStrategy: ILbAlgorithm;
    private healthChecker: HealthCheck;
    private healthyServers : BackendServerDetails[];

    
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
        this.healthyServers = [];

        this.healthChecker = new HealthCheck(this.backendServers, this.healthyServers);
        
        //Strategy Pattern Assignment based on Config selection
        switch (config.lbAlgo) {
            case 'rr':
                this.lbAlgoStrategy = new RoundRobin(this.backendServers);
                break;
            case 'rand':
            case 'wrr':
                this.lbAlgoStrategy = new WeightedRoundRobin(this.backendServers);
                break;
            default:
                this.lbAlgoStrategy = new FallbackAlgo(this.backendServers);
        }

        this.app.get('/', (_req, res, next) => {
            if (_req.path === '/') {
                return res.send('Load Balancer v1.0');
            }
            next();
        });

        this.app.use(async (req, res) => {
            try {
                // Select the next server using the strategy pattern contract
                const targetServer = this.lbAlgoStrategy.nextServer();

                // Update stats immediately upon choosing the instance
                targetServer.incrementRequestsServed();

                // Construct full forwarding URL path
                const targetUrl = `${targetServer.url}${req.url}`;

                // Clean up headers to avoid Host mismatch or proxy loops
                const forwardedHeaders = { ...req.headers };
                delete forwardedHeaders.host; 

                // Forward the request using our manual, custom resilient HttpClient
                const response = await HttpClient.request({
                    method: req.method,
                    url: targetUrl,
                    headers: forwardedHeaders,
                    data: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
                    validateStatus: () => true, 
                });

                // Reply back to the original client
                res.status(response.status);
                
                Object.entries(response.headers).forEach(([key, value]) => {
                    if (value !== undefined) {
                        res.setHeader(key, String(value));
                    }
                });

                return res.send(response.data);

            } catch (error) {
                console.error(`Proxy forwarding failure:`, (error as Error).message);
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