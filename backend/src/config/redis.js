import Redis from 'ioredis';

let redis = null;

function createRedis() {
  if (!process.env.REDIS_URL) return null;

  try {
    const client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });

    client.on('error', () => {}); 

    return client;
  } catch {
    return null;
  }
}

redis = createRedis();

export default redis;