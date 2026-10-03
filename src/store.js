// Tiny JSON-file order store. Fine for a shop with a handful of items;
// all writes are synchronous so two requests can never interleave.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const FILE = path.join(DATA_DIR, 'orders.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

let orders = [];
if (fs.existsSync(FILE)) {
  orders = JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function persist() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(orders, null, 2));
  fs.renameSync(tmp, FILE);
}

// No 0/O/1/I so buyers can read the ID over the phone.
const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newId() {
  let id;
  do {
    const bytes = crypto.randomBytes(6);
    id = 'RN-' + Array.from(bytes, (b) => ID_CHARS[b % ID_CHARS.length]).join('');
  } while (orders.some((o) => o.id === id));
  return id;
}

// Statuses that keep a bead out of stock.
const HOLDING = new Set(['awaiting_payment', 'verifying', 'paid', 'shipped', 'delivered']);

function isHolding(order, now = Date.now()) {
  if (!HOLDING.has(order.status)) return false;
  if (order.status === 'awaiting_payment' && order.expiresAt < now) return false;
  return true;
}

function heldQty(slug, exceptId) {
  return orders
    .filter((o) => o.id !== exceptId && o.productSlug === slug && isHolding(o))
    .reduce((sum, o) => sum + o.qty, 0);
}

function create(data) {
  const now = Date.now();
  const order = {
    id: newId(),
    token: crypto.randomBytes(16).toString('hex'),
    status: 'awaiting_payment',
    createdAt: now,
    updatedAt: now,
    history: [{ status: 'awaiting_payment', at: now }],
    ...data,
  };
  orders.push(order);
  persist();
  return order;
}

function get(id) {
  return orders.find((o) => o.id === id) || null;
}

function update(id, changes, note) {
  const order = get(id);
  if (!order) return null;
  const now = Date.now();
  if (changes.status && changes.status !== order.status) {
    order.history.push({ status: changes.status, at: now, ...(note ? { note } : {}) });
  }
  Object.assign(order, changes, { updatedAt: now });
  persist();
  return order;
}

function all() {
  return [...orders].sort((a, b) => b.createdAt - a.createdAt);
}

function findByUtr(utr) {
  return orders.find((o) => o.utr === utr) || null;
}

// Mark reservations that ran out without payment as expired.
// Returns the orders that were expired for logging.
function expireStale() {
  const now = Date.now();
  const expired = [];
  for (const o of orders) {
    if (o.status === 'awaiting_payment' && o.expiresAt < now) {
      o.status = 'expired';
      o.updatedAt = now;
      o.history.push({ status: 'expired', at: now });
      expired.push(o);
    }
  }
  if (expired.length) persist();
  return expired;
}

module.exports = { create, get, update, all, findByUtr, heldQty, expireStale };
