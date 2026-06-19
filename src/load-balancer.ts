import express, { Express } from 'express';
import axios from 'axios';
import { Server } from 'http';
import { Config } from './utils/config.ts';
import { BackendServerDetails } from './backend-server-details.ts';
import { HttpClient } from './utils/http-client.ts';
import { ILbAlgorithm } from './lb-algos/lb-algo.interface.ts';
import { FallbackAlgo } from './lb-algos/fallback-algo.ts';
import { RoundRobin } from './lb-algos/rr.ts';
import { WeightedRoundRobin } from './lb-algos/wrr.ts';
import { HealthCheck } from './utils/health-check.ts';

const ProxyClient = axios.create({ timeout: 5000 });
const MAX_RETRIES = 3;

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

        const intervalMs = (config.health_check_interval ?? 1) * 1000;
        this.healthChecker = new HealthCheck(
            this.backendServers,
            this.healthyServers,
            intervalMs
        );

        //Strategy Pattern Assignment based on Config selection
        switch (config.lbAlgo) {
            case 'rr':
                this.lbAlgoStrategy = new RoundRobin(this.healthyServers); // Pass healthy pool reference
                break;
            case 'wrr':
                this.lbAlgoStrategy = new WeightedRoundRobin(this.healthyServers); // Pass healthy pool reference
                break;
            case 'rand':
            default:
                this.lbAlgoStrategy = new FallbackAlgo(this.healthyServers); // Pass healthy pool reference
        }


        // ALL requests go through proxy — no special root route
        this.app.use(async (req, res) => {
            let lastError: any;

            for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
                let targetServer: BackendServerDetails | undefined;

                try {
                    // Pick from healthyServers if available, else fall back to full pool
                    const pool = this.healthyServers.length > 0
                        ? this.healthyServers
                        : this.backendServers;

                    if (pool.length === 0) {
                        return res.status(503).send('No servers available');
                    }

                    targetServer = pool[0];
                    targetServer.incrementRequestsServed();

                    const targetUrl = `${targetServer.url}${req.url}`;
                    const forwardedHeaders = { ...req.headers };
                    delete forwardedHeaders.host;

                    const response = await ProxyClient.request({
                        method: req.method,
                        url: targetUrl,
                        headers: forwardedHeaders,
                        data: ['POST', 'PUT', 'PATCH'].includes(req.method)
                            ? req.body
                            : undefined,
                        validateStatus: (status) => status < 500,
                    });

                    // Success — send response and stop retrying
                    res.status(response.status);
                    Object.entries(response.headers).forEach(([key, value]) => {
                        if (value !== undefined) {
                            res.setHeader(key, String(value));
                        }
                    });
                    return res.send(response.data);

                } catch (error: any) {
                    lastError = error;

                    if (targetServer) {
                        // Passive check — mark failed server unhealthy immediately
                        process.stdout.write(`passive health check failed: ${targetServer.url} marked UNHEALTHY\n`);
                        this.healthChecker.handleFailure(targetServer);
                    }

                    // Continue loop — next iteration picks a different server
                    // because failed server is now removed from healthyServers
                    console.log(`Retry attempt ${attempt + 1} failed, trying next server...`);
                }
            }

            // All retries exhausted
            console.log(`All ${MAX_RETRIES} retry attempts failed`);
            return res.status(500).send('Internal Server Error (All retries failed)');
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

        this.healthChecker.start();

        process.on('SIGTERM', () => {
            this.healthChecker.stop();
            this.server?.close();
        });

        process.on('SIGINT', () => {
            this.healthChecker.stop();
            this.server?.close();
        });
    }
}