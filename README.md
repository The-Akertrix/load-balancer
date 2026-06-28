# TypeScript HTTP Load Balancer

A modular TypeScript load balancer built for fault tolerance and flexible routing. It supports multiple algorithms, backend health checks, SSL/TLS termination, and retry/backoff behavior.

## 🚀 Overview

This repository implements a production-style load balancer with:

- Strategy-driven routing: `rand`, `rr`, and `wrr`
- Centralized retry with exponential backoff
- Active health checks and failover handling
- RFC 7230-safe response header forwarding
- Optional SSL/TLS termination via configuration

## 📁 Architecture

The project is organized using object-oriented design and clear separation of concerns:

- `src/load-balancer.ts` — main proxy server, request forwarding, retry loop, and strategy selection
- `src/backend-server-details.ts` — backend server abstraction, health state, and ping implementation
- `src/utils/http-client.ts` — shared Axios client with retry/backoff interceptors
- `src/utils/health-check.ts` — periodic health checking and healthy pool maintenance
- `src/lb-algos/` — pluggable load balancing strategies
  - `fallback-algo.ts` — random server selection
  - `rr.ts` — round-robin distribution
  - `wrr.ts` — weighted round-robin distribution
- `src/utils/config.ts` — Joi-powered configuration validation and startup safety

## ⭐ Key Features

- `rand`, `rr`, and `wrr` algorithm support
- Reusable HTTP retry/backoff behavior for all backend calls
- Health-aware backend selection and failover recovery
- Strips hop-by-hop headers before proxying responses
- Configurable TLS termination

## 🛠 Tech Stack

- TypeScript
- Node.js (ES Modules)
- Express.js
- Axios
- Joi
- Bun (optional testing)

## ⚙️ Installation

```bash
cd /home/path
npm install
```

## 🔧 Configuration

Update `config.json` with your desired settings.

Required fields:

- `lbPORT` — load balancer port
- `lbAlgo` — `rand`, `rr`, or `wrr`
- `be_servers` — backend servers with `domain` and `weight`
- `health_check_interval` — active health probe interval in seconds

Optional TLS fields:

- `ssl.enabled`
- `ssl.key_path`
- `ssl.cert_path`

Example:

```json
{
  "lbPORT": 7010,
  "lbAlgo": "rr",
  "health_check_interval": 1,
  "ssl": {
    "enabled": false,
    "key_path": "./key.pem",
    "cert_path": "./cert.pem"
  },
  "be_servers": [
    { "domain": "http://localhost:8081", "weight": 1 },
    { "domain": "http://localhost:8082", "weight": 1 }
  ]
}
```

## ▶️ Run the Load Balancer

```bash
npm start
```

## 🧪 Testing

### Unit / regression tests

- Prefer Bun or Jest for fast TypeScript testing
- Coverage should include:
  - `HttpClient` retry/backoff behavior
  - `BackendServerDetails.ping()` health checks
  - `nextServer()` selection for load balancing strategies
  - random strategy distribution
  - hop-by-hop header filtering

### End-to-end validation

Use `test/e2e.ts` to verify real request flow:

- starts mock backend servers
- boots the load balancer
- sends request batches
- simulates backend failure
- ensures requests still succeed via failover

### Suggested observability metrics

- Requests per second (RPS)
- Latency percentiles (`p50`, `p95`, `p99`)
- Success / error rate
- Retry and failover count
- Number of healthy backends

## 🐞 Bug fixes and improvements

- Ensured backend health checks reuse the centralized `HttpClient` and retry/backoff logic
- Removed unused `axios-retry` dependency from `package.json`
- Prevented invalid response forwarding by filtering hop-by-hop headers
- Fixed strategy routing so the handler uses the configured `nextServer()` implementation
- Corrected `rand` strategy to choose a truly random backend instead of always returning the first server

## 💡 Notes

- `Config.load()` validates configuration with Joi and fails fast on invalid settings
- SSL/TLS termination is enabled through `config.json`
- The codebase is designed for extensibility with additional routing strategies and observability hooks

## 👍 Why this is repo-worthy

This project is a strong GitHub showcase because it demonstrates:

- modular TypeScript architecture
- real-world proxy and HTTP semantics handling
- retry/backoff resilience and health-aware routing
- clean bug fixes and regression-focused validation
