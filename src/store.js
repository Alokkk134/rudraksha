// Order storage. Uses Upstash Redis when its env vars are present (Vercel),
// otherwise a local JSON file (your own computer).

const crypto = require('crypto');

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const backend = redisUrl && redisToken ? require('./store-redis')(redisUrl, redisToken) : require('./store-file')();

// No 0/O/1/I so buyers can read the ID over the phone.
const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
async function newId() {
  for (;;) {
    const bytes = crypto.randomBytes(6);
    const id = 'RN-' + Array.from(bytes, (b) => ID_CHARS[b % ID_CHARS.length]).join('');
    if (!(await backend.load(id))) return id;
  }
}

// Statuses that keep a bead out of stock.
const HOLDING = new Set(['awaiting_payment', 'verifying', 'paid', 'shipped', 'delivered']);

function isHolding(order, now = Date.now()) {
  if (!HOLDING.has(order.status)) return false;
  if (order.status === 'awaiting_payment' && order.expiresAt < now) return false;
  return true;
}

// There is no background timer on Vercel, so lapsed reservations are
// marked expired whenever they are read.
async function refresh(order) {
  if (order && order.status === 'awaiting_payment' && order.expiresAt < Date.now()) {
    order.status = 'expired';
    order.updatedAt = Date.now();
    order.history.push({ status: 'expired', at: order.expiresAt });
    await backend.save(order);
  }
  return order;
}

async function create(data) {
  const now = Date.now();
  const order = {
    id: await newId(),
    token: crypto.randomBytes(16).toString('hex'),
    status: 'awaiting_payment',
    createdAt: now,
    updatedAt: now,
    history: [{ status: 'awaiting_payment', at: now }],
    ...data,
  };
  await backend.save(order);
  return order;
}

async function get(id) {
  return refresh(await backend.load(id));
}

async function update(id, changes, note) {
  const order = await backend.load(id);
  if (!order) return null;
  const now = Date.now();
  if (changes.status && changes.status !== order.status) {
    order.history.push({ status: changes.status, at: now, ...(note ? { note } : {}) });
  }
  Object.assign(order, changes, { updatedAt: now });
  await backend.save(order);
  return order;
}

async function all() {
  const list = await backend.list();
  await Promise.all(list.map(refresh));
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

async function findByUtr(utr) {
  return (await backend.list()).find((o) => o.utr === utr) || null;
}

async function heldQty(slug) {
  return (await backend.list()).filter((o) => o.productSlug === slug && isHolding(o)).reduce((sum, o) => sum + o.qty, 0);
}

// Runs fn while holding a named lock, so two buyers can't reserve the same bead at once.
function withLock(name, fn) {
  return backend.lock(name, fn);
}

module.exports = { create, get, update, all, findByUtr, heldQty, withLock, kind: backend.kind };
