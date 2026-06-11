import express from 'express';
import { Config } from './utils/config.ts';

Config.load();   //loading configuration at startup

const config = Config.getConfig();

const app = express();
const PORT = config.lbPORT;

app.get('/', (_req, res) => {
  res.send('Load Balancer v1.0');
});

app.listen(PORT, () => {
  console.log(`load balancer running on port ${config.lbPORT} using ${config.lbAlgo} algorithm`);
});