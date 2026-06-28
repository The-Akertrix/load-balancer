import http from 'http';
import { LBServer } from '../src/load-balancer.ts';
import { Config } from '../src/utils/config.ts';

function createMockServer(port: number): Promise<{ server: http.Server; count: () => number }> {
    return new Promise((resolve) => {
        let requestCount = 0;
        const server = http.createServer((req, res) => {
            if (req.url === '/ping') {
                res.writeHead(200);
                res.end('ok');
                return;
            }
            requestCount++;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ port, count: requestCount }));
        });
        server.listen(port, () => resolve({ server, count: () => requestCount }));
    });
}

function sendRequest(port: number, path = '/'): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
        const req = http.request({ hostname: 'localhost', port, path, method: 'GET' }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function sendBatch(count: number, lbPort: number): Promise<{ ok: number; fail: number }> {
    let ok = 0, fail = 0;
    const requests = Array.from({ length: count }, () =>
        sendRequest(lbPort)
            .then(r => r.status < 500 ? ok++ : fail++)
            .catch(() => fail++)
    );
    await Promise.all(requests);
    return { ok, fail };
}

function assert(condition: boolean, message: string): void {
    if (!condition) {
        console.error(`FAIL: ${message}`);
        process.exit(1);
    }
    console.log(`PASS: ${message}`);
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    console.log('\n=== E2E Test Starting ===\n');

    // 1. Start 3 mock backend servers
    const mock1 = await createMockServer(7001);
    const mock2 = await createMockServer(7002);
    const mock3 = await createMockServer(7003);
    console.log('✓ Mock servers started on ports 7001, 7002, 7003');

    // 2. Boot LB pointing at those 3 servers
    // Override config singleton for test
    (Config as any).config = {
        lbPORT: 7010,
        lbAlgo: 'rr',
        health_check_interval: 1,
        be_servers: [
            { domain: 'http://localhost:7001', weight: 1 },
            { domain: 'http://localhost:7002', weight: 1 },
            { domain: 'http://localhost:7003', weight: 1 },
        ]
    };

    const lb = new LBServer();
    await lb.init();
    console.log('✓ Load balancer started on port 7010');

    // Wait for first health check cycle to mark servers healthy
    await sleep(500);

    // 3. Send 100 requests
    console.log('\n--- Batch 1: 100 requests across 3 servers ---');
    const batch1 = await sendBatch(100, 7010);
    console.log(`Responses — OK: ${batch1.ok}, Fail: ${batch1.fail}`);
    console.log(`Server counts — 7001: ${mock1.count()}, 7002: ${mock2.count()}, 7003: ${mock3.count()}`);

    assert(batch1.fail === 0, 'All 100 requests succeeded');
    assert(mock1.count() > 20, 'Server 7001 got reasonable share (>20)');
    assert(mock2.count() > 20, 'Server 7002 got reasonable share (>20)');
    assert(mock3.count() > 20, 'Server 7003 got reasonable share (>20)');

    // 4. Kill one mock server
    console.log('\n--- Killing server 7001 ---');
    await new Promise<void>((resolve) => mock1.server.close(() => resolve()));
    console.log('✓ Server 7001 stopped');

    // Wait for passive/active health checks to detect failure
    await sleep(500);

    // 5. Send 50 more requests — should succeed via retry/failover
    console.log('\n--- Batch 2: 50 requests with one server down ---');
    const batch2 = await sendBatch(50, 7010);
    console.log(`Responses — OK: ${batch2.ok}, Fail: ${batch2.fail}`);

    assert(batch2.ok === 50, 'All 50 requests succeeded despite one server being down');

    // 6. Cleanup
    lb.healthChecker.stop();
    lb.server?.close();
    mock2.server.close();
    mock3.server.close();

    console.log('\n=== All tests passed! ===\n');
    process.exit(0);
}

run().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});