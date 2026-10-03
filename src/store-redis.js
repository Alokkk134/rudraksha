// Upstash Redis backend, used on Vercel where the disk is not kept between requests.

const crypto = require('crypto');
const { Redis } = require('@upstash/redis');

const P = 'rn:';

module.exports = function redisBackend(url, token) {
  const redis = new Redis({ url, token });

  return {
    kind: 'redis',
    async load(id) {
      return (await redis.get(P + 'order:' + id)) || null;
    },
    async save(order) {
      await redis.set(P + 'order:' + order.id, order);
      await redis.zadd(P + 'orders', { score: order.createdAt, member: order.id });
    },
    async list() {
      const ids = await redis.zrange(P + 'orders', 0, -1);
      if (!ids.length) return [];
      return (await redis.mget(...ids.map((id) => P + 'order:' + id))).filter(Boolean);
    },
    // Lock shared by all Vercel instances. Expires on its own after 10s in case a request dies.
    async lock(name, fn) {
      const key = P + 'lock:' + name;
      // Prefix keeps the value a string; an all-digit hex would come back from Upstash as a number.
      const me = 'L' + crypto.randomBytes(8).toString('hex');
      const deadline = Date.now() + 8000;
      while (!(await redis.set(key, me, { nx: true, px: 10000 }))) {
        if (Date.now() > deadline) throw new Error('Store is busy. Please try again.');
        await new Promise((r) => setTimeout(r, 120));
      }
      try {
        return await fn();
      } finally {
        if ((await redis.get(key)) === me) await redis.del(key);
      }
    },
  };
};
