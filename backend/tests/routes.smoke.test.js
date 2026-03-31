const assert = require('node:assert/strict');
const { after, before, describe, test } = require('node:test');
const http = require('node:http');
const { createApp } = require('../server');

const SAMPLE_ID = '507f1f77bcf86cd799439011';
const SAMPLE_CERTIFICATE_ID = 'CERT-123';
const ACCESS_TYPES = ['institution-admins', 'university-admins', 'company-admins', 'verifiers'];

const PUBLIC_ROUTE_CHECKS = [
  { method: 'POST', path: '/api/auth/register', body: {}, expectedStatus: 400, expectedMessage: 'Validation failed' },
  { method: 'POST', path: '/api/auth/login', body: {}, expectedStatus: 400, expectedMessage: 'Validation failed' },
];

const PRIVATE_ROUTE_CHECKS = [
  { method: 'GET', path: '/api/auth/me' },
  { method: 'GET', path: '/api/users' },
  { method: 'POST', path: '/api/users', body: {} },
  { method: 'GET', path: `/api/users/${SAMPLE_ID}` },
  { method: 'PUT', path: `/api/users/${SAMPLE_ID}`, body: {} },
  { method: 'DELETE', path: `/api/users/${SAMPLE_ID}` },
  { method: 'POST', path: '/api/certificates/verify' },
  { method: 'POST', path: '/api/certificates/bulk' },
  { method: 'GET', path: '/api/certificates' },
  { method: 'GET', path: `/api/certificates/${SAMPLE_CERTIFICATE_ID}` },
  { method: 'PUT', path: `/api/certificates/${SAMPLE_CERTIFICATE_ID}/verify`, body: {} },
  { method: 'GET', path: '/api/institutions' },
  { method: 'POST', path: '/api/institutions', body: {} },
  { method: 'GET', path: `/api/institutions/${SAMPLE_ID}` },
  { method: 'PUT', path: `/api/institutions/${SAMPLE_ID}`, body: {} },
  { method: 'DELETE', path: `/api/institutions/${SAMPLE_ID}` },
  { method: 'PUT', path: `/api/institutions/${SAMPLE_ID}/verify`, body: {} },
  { method: 'GET', path: '/api/dashboard/stats' },
  { method: 'GET', path: '/api/dashboard/trends' },
  { method: 'GET', path: '/api/dashboard/alerts' },
  { method: 'GET', path: '/api/verification-logs' },
  { method: 'GET', path: `/api/verification-logs/${SAMPLE_ID}` },
];

ACCESS_TYPES.forEach((type) => {
  PRIVATE_ROUTE_CHECKS.push(
    { method: 'GET', path: `/api/access/${type}/me` },
    { method: 'GET', path: `/api/access/${type}` },
    { method: 'POST', path: `/api/access/${type}`, body: {} },
    { method: 'GET', path: `/api/access/${type}/${SAMPLE_ID}` },
    { method: 'PUT', path: `/api/access/${type}/${SAMPLE_ID}`, body: {} },
    { method: 'DELETE', path: `/api/access/${type}/${SAMPLE_ID}` },
  );
});

const parseJsonSafely = (body) => {
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body);
  } catch (_error) {
    return body;
  }
};

const makeRequest = (port, route) => new Promise((resolve, reject) => {
  const payload = route.body !== undefined ? JSON.stringify(route.body) : null;
  const request = http.request(
    {
      hostname: '127.0.0.1',
      port,
      path: route.path,
      method: route.method,
      headers: {
        Accept: 'application/json',
        ...(payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            }
          : {}),
      },
    },
    (response) => {
      let rawBody = '';

      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        rawBody += chunk;
      });
      response.on('end', () => {
        resolve({
          status: response.statusCode,
          body: parseJsonSafely(rawBody),
        });
      });
    }
  );

  request.on('error', reject);

  if (payload) {
    request.write(payload);
  }

  request.end();
});

describe('Backend Route Smoke Checks', () => {
  let server;
  let port;

  before(async () => {
    const app = createApp();

    server = await new Promise((resolve) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });

    port = server.address().port;
  });

  after(async () => {
    if (!server) {
      return;
    }

    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  test('GET /api/health returns application health', async () => {
    const response = await makeRequest(port, { method: 'GET', path: '/api/health' });

    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'OK');
    assert.equal(typeof response.body.timestamp, 'string');
    assert.equal(typeof response.body.uptime, 'number');
  });

  test('Public auth routes reject invalid payloads with validation errors', async (t) => {
    for (const route of PUBLIC_ROUTE_CHECKS) {
      await t.test(`${route.method} ${route.path}`, async () => {
        const response = await makeRequest(port, route);

        assert.equal(response.status, route.expectedStatus);
        assert.equal(response.body.message, route.expectedMessage);
      });
    }
  });

  test('Private routes reject unauthenticated requests instead of failing route resolution', async (t) => {
    for (const route of PRIVATE_ROUTE_CHECKS) {
      await t.test(`${route.method} ${route.path}`, async () => {
        const response = await makeRequest(port, route);

        assert.equal(response.status, 401);
        assert.equal(response.body.message, 'No token, authorization denied');
      });
    }
  });

  test('Unknown routes still return 404 JSON', async () => {
    const response = await makeRequest(port, { method: 'GET', path: '/api/does-not-exist' });

    assert.equal(response.status, 404);
    assert.equal(response.body.message, 'Route not found');
  });
});
