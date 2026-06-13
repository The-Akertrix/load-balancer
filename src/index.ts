import express from 'express';
import { Config } from './utils/config.ts';
import { BackendServerDetails } from './backend-server-details.ts';   

Config.load();   //loading configuration at startup
const config = Config.getConfig();

const backendServers = config.be_servers.map(
  (server) => new BackendServerDetails(server.domain, server.weight)
);

const app = express();
const PORT = config.lbPORT;

app.get('/', (_req, res) => {
  res.send('Load Balancer v1.0');
});

app.listen(PORT, () => {
  console.log(`load balancer running on port ${config.lbPORT} using ${config.lbAlgo} algorithm`);

  console.log(`initialized backend servers : ${backendServers.length}`);
});