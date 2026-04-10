import client from 'prom-client';

client.collectDefaultMetrics();

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

export const activeSubscriptions = new client.Gauge({
  name: 'active_subscriptions_total',
  help: 'Total number of confirmed subscriptions',
});

export const scannerRuns = new client.Counter({
  name: 'scanner_runs_total',
  help: 'Total number of scanner executions',
  labelNames: ['status'],
});

export const registry = client.register;