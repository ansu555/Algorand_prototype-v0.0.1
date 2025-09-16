/* Quick smoke test for production server */
const http = require('http');

function request(method, path, body) {
  const base = process.env.BASE_URL || 'http://localhost:3010';
  const url = new URL(path, base);
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(url, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(data ? { 'content-length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (buf += chunk));
      res.on('end', () => {
        try {
          const json = buf ? JSON.parse(buf) : null;
          resolve({ status: res.statusCode, json });
        } catch (e) {
          resolve({ status: res.statusCode, text: buf });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const results = {};
    results.trigger = await request('POST', '/api/agent/trigger', {
      simulate: true,
      ownerAddress: '0x0000000000000000000000000000000000000000',
      details: { test: true }
    });

    results.logs = await request('GET', '/api/logs');
    results.price = await request('GET', '/api/price?coin=razxDUgYGNAdQ'); // ETH

    console.log('SMOKE TEST RESULTS');
    console.log(JSON.stringify(results, null, 2));

    const ok =
      (results.trigger.status === 200) &&
      (results.logs.status === 200) &&
      (results.price.status === 200);

    if (!ok) {
      console.error('One or more endpoints returned non-200 status');
      process.exit(1);
    }
    process.exit(0);
  } catch (e) {
    console.error('Smoke test failed:', e?.message || e);
    process.exit(1);
  }
})();
