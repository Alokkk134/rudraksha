require('dotenv').config();

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');

const { site, products: baseProducts } = require('./src/config');
const store = require('./src/store');
const { appLinks, qrSvg, qrPng } = require('./src/upi');
const { renderPage } = require('./src/render');

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
// Every Vercel instance must sign cookies with the same key, so fall back to one derived from the password.
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('rn-session:' + ADMIN_PASSWORD).digest('hex');

if (!ADMIN_PASSWORD || ADMIN_PASSWORD === 'change-this-to-a-long-password') {
  console.warn('[admin] Set ADMIN_PASSWORD in .env — the admin page is locked until you do.');
}

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Content-Security-Policy':
      "default-src 'self'; img-src 'self' data:; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  });
  next();
});

// ---------- helpers ----------

// Products with the stock count set from the admin page (falls back to config.js).
async function getProducts() {
  const overrides = await store.getStockOverrides(baseProducts.map((p) => p.slug));
  return baseProducts.map((p, i) => (overrides[i] == null ? p : { ...p, stock: overrides[i] }));
}
const productBySlug = async (slug) => (await getProducts()).find((p) => p.slug === slug) || null;
const available = async (p) => Math.max(0, p.stock - (await store.heldQty(p.slug)));

// Express 4 doesn't catch errors from async handlers on its own.
const h = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const hits = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  if (hits.size > 5000) hits.clear();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}

const STATES = require('./src/states');

function clean(v, max) {
  return typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

function validateOrder(body) {
  const errors = {};
  const name = clean(body.name, 80);
  const phone = clean(body.phone, 20).replace(/[\s-]/g, '').replace(/^(\+?91|0)(?=\d{10}$)/, '');
  const email = clean(body.email, 120).toLowerCase();
  const a = body.address || {};
  const address = {
    line1: clean(a.line1, 150),
    line2: clean(a.line2, 150),
    city: clean(a.city, 60),
    state: clean(a.state, 60),
    pincode: clean(a.pincode, 6),
  };

  if (name.length < 2) errors.name = 'Please enter your full name.';
  if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = 'Enter a 10-digit Indian mobile number.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Enter a valid email address.';
  if (address.line1.length < 5) errors.line1 = 'Enter your house number and street.';
  if (address.city.length < 2) errors.city = 'Enter your city or town.';
  if (!STATES.includes(address.state)) errors.state = 'Choose your state.';
  if (!/^[1-9]\d{5}$/.test(address.pincode)) errors.pincode = 'Enter a 6-digit PIN code.';

  return { errors, data: { name, phone, email, address } };
}

function publicOrder(o) {
  return {
    id: o.id,
    status: o.status,
    productSlug: o.productSlug,
    productName: o.productName,
    qty: o.qty,
    unitPrice: o.unitPrice,
    subtotal: o.subtotal,
    shipping: o.shipping,
    total: o.total,
    name: o.name,
    phone: o.phone,
    email: o.email,
    address: o.address,
    utr: o.utr || null,
    courier: o.courier || null,
    tracking: o.tracking || null,
    createdAt: o.createdAt,
    expiresAt: o.expiresAt,
    history: o.history,
    upi: { id: site.upiId, links: appLinks(o) },
    serverNow: Date.now(),
  };
}

async function orderFromRequest(req, res) {
  const o = await store.get(req.params.id);
  const t = String(req.query.t || '');
  if (!o || t.length !== o.token.length || !crypto.timingSafeEqual(Buffer.from(t), Buffer.from(o.token))) {
    res.status(404).json({ error: 'Order not found.' });
    return null;
  }
  return o;
}

// ---------- pages ----------

app.get('/', h(async (req, res) => {
  const products = await getProducts();
  const lefts = await Promise.all(products.map(available));
  res.send(renderPage('index.html', { products, lefts }));
}));
app.get('/checkout/:slug', h(async (req, res) => {
  const p = await productBySlug(req.params.slug);
  if (!p) return res.redirect('/');
  res.send(renderPage('checkout.html', { product: p, available: await available(p) }));
}));
app.get('/pay/:id', (req, res) => res.send(renderPage('pay.html')));
app.get('/order/:id', (req, res) => res.send(renderPage('order.html')));
app.get('/track', (req, res) => res.send(renderPage('track.html')));
// The admin page lives at an unlisted path. Its script is served from here
// (not /public) so nothing in the public files points to it.
const ADMIN_PATH = '/kingalok';
const ADMIN_SCRIPT = fs.readFileSync(path.join(__dirname, 'src', 'admin-client.js'), 'utf8');
app.get(ADMIN_PATH, (req, res) => {
  res.set('X-Robots-Tag', 'noindex, nofollow').send(renderPage('admin.html'));
});
app.get(ADMIN_PATH + '/app.js', (req, res) => res.type('application/javascript').set('Cache-Control', 'no-cache').send(ADMIN_SCRIPT));

app.use(express.static(path.join(__dirname, 'public'), { index: false, maxAge: '1h' }));

// ---------- public API ----------

app.get('/api/products', h(async (req, res) => {
  const products = await getProducts();
  const lefts = await Promise.all(products.map(available));
  res.json(products.map((p, i) => ({ slug: p.slug, name: p.name, price: p.price, available: lefts[i] })));
}));

app.post('/api/orders', h(async (req, res) => {
  if (rateLimit('order:' + req.ip, 8, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many orders from your connection. Please try again later.' });
  }
  const p = await productBySlug(req.body.slug);
  if (!p) return res.status(400).json({ error: 'Unknown product.' });

  const { errors, data } = validateOrder(req.body);
  const qty = Number.parseInt(req.body.qty, 10);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });
  if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: 'Choose a quantity.' });

  const result = await store.withLock('stock:' + p.slug, async () => {
    // A buyer who goes back and orders again shouldn't hold two reservations.
    for (const o of await store.all()) {
      if (o.productSlug === p.slug && o.phone === data.phone && o.status === 'awaiting_payment') {
        await store.update(o.id, { status: 'replaced' });
      }
    }

    const left = await available(p);
    if (qty > left) return { left };

    const subtotal = p.price * qty;
    return { order: await store.create({
    productSlug: p.slug,
    productName: p.name,
    qty,
    unitPrice: p.price,
    subtotal,
    shipping: site.shippingFee,
    total: subtotal + site.shippingFee,
    ...data,
    expiresAt: Date.now() + site.reservationMinutes * 60 * 1000,
    }) };
  });

  if (!result.order) {
    const left = result.left;
    return res.status(409).json({
      error: left === 0 ? 'Sorry, this bead was just reserved by another buyer.' : `Only ${left} left. Please lower the quantity.`,
      available: left,
    });
  }
  res.status(201).json({ id: result.order.id, token: result.order.token });
}));

// Buyers look up their order by order ID + the mobile number they used.
app.post('/api/track', h(async (req, res) => {
  if (rateLimit('track:' + req.ip, 15, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many attempts. Please wait 15 minutes.' });
  }
  const id = String(req.body.id || '').trim().toUpperCase().replace(/^(RN)?-?/, 'RN-');
  const phone = String(req.body.phone || '').replace(/[\s-]/g, '').replace(/^(\+?91|0)(?=\d{10}$)/, '');
  const o = await store.get(id);
  if (!o || o.phone !== phone || o.status === 'replaced') {
    return res.status(404).json({ error: 'No order found with that order number and mobile number.' });
  }
  res.json({ id: o.id, token: o.token });
}));

app.get('/api/orders/:id', h(async (req, res) => {
  const o = await orderFromRequest(req, res);
  if (o) res.json(publicOrder(o));
}));

app.get('/api/orders/:id/qr.svg', h(async (req, res) => {
  const o = await orderFromRequest(req, res);
  if (!o) return;
  res.type('image/svg+xml').set('Cache-Control', 'private, max-age=600').send(await qrSvg(o));
}));

app.get('/api/orders/:id/qr.png', h(async (req, res) => {
  const o = await orderFromRequest(req, res);
  if (!o) return;
  res
    .type('image/png')
    .set('Content-Disposition', `attachment; filename="pay-${o.id}.png"`)
    .send(await qrPng(o));
}));

app.post('/api/orders/:id/utr', h(async (req, res) => {
  const o = await orderFromRequest(req, res);
  if (!o) return;
  if (rateLimit('utr:' + o.id, 10, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many attempts. Please contact us.' });
  }
  if (!['awaiting_payment', 'expired'].includes(o.status)) {
    return res.status(409).json({ error: 'This order is no longer waiting for payment.' });
  }
  const utr = String(req.body.utr || '').replace(/\s/g, '');
  if (!/^\d{12}$/.test(utr)) {
    return res.status(400).json({ error: 'The UTR / UPI reference number is 12 digits. Check your UPI app’s payment details.' });
  }
  const other = await store.findByUtr(utr);
  if (other && other.id !== o.id) {
    return res.status(409).json({ error: 'This UTR is already used for another order. Please check the number.' });
  }

  // If the reservation lapsed, the bead may have gone to someone else meanwhile.
  const p = await productBySlug(o.productSlug);
  const stockConflict = o.status === 'expired' && (await available(p)) < o.qty;

  const updated = await store.update(o.id, { status: 'verifying', utr, utrAt: Date.now(), stockConflict });
  res.json(publicOrder(updated));
}));

// ---------- admin ----------

const COOKIE = 'rn_admin';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
}

function isAdmin(req) {
  const raw = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(COOKIE + '='));
  if (!raw) return false;
  const [exp, sig] = decodeURIComponent(raw.slice(COOKIE.length + 1)).split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = sign('admin:' + exp);
  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

function requireAdmin(req, res, next) {
  if (isAdmin(req)) return next();
  res.status(401).json({ error: 'Please log in.' });
}

app.post('/api/kingalok/login', (req, res) => {
  if (rateLimit('login:' + req.ip, 10, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many attempts. Wait 15 minutes.' });
  }
  const pw = String(req.body.password || '');
  const ok =
    ADMIN_PASSWORD &&
    ADMIN_PASSWORD !== 'change-this-to-a-long-password' &&
    pw.length === ADMIN_PASSWORD.length &&
    crypto.timingSafeEqual(Buffer.from(pw), Buffer.from(ADMIN_PASSWORD));
  if (!ok) return res.status(401).json({ error: 'Wrong password.' });

  const exp = String(Date.now() + SESSION_MS);
  const secure = req.secure ? '; Secure' : '';
  res.set(
    'Set-Cookie',
    `${COOKIE}=${encodeURIComponent(exp + '.' + sign('admin:' + exp))}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}${secure}`
  );
  res.json({ ok: true });
});

app.post('/api/kingalok/logout', (req, res) => {
  res.set('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
  res.json({ ok: true });
});

app.get('/api/kingalok/orders', requireAdmin, h(async (req, res) => {
  const orders = await store.all();
  const products = await getProducts();
  const lefts = await Promise.all(products.map(available));
  res.json({
    orders: orders.filter((o) => o.status !== 'replaced'),
    stock: products.map((p, i) => ({ slug: p.slug, name: p.name, stock: p.stock, available: lefts[i] })),
    states: STATES,
    upiId: site.upiId,
  });
}));

app.post('/api/kingalok/stock', requireAdmin, h(async (req, res) => {
  const p = await productBySlug(req.body.slug);
  if (!p) return res.status(400).json({ error: 'Unknown product.' });
  const stock = Number(req.body.stock);
  if (!Number.isInteger(stock) || stock < 0 || stock > 999) {
    return res.status(400).json({ error: 'Stock must be a whole number from 0 to 999.' });
  }
  // Can't go below what's already sold or reserved.
  const result = await store.withLock('stock:' + p.slug, async () => {
    const held = await store.heldQty(p.slug);
    if (stock < held) return { held };
    await store.setStock(p.slug, stock);
    return { ok: true };
  });
  if (!result.ok) {
    return res.status(409).json({ error: `${result.held} are already sold or reserved, so stock can't be lower than ${result.held}. Cancel or delete those orders first.` });
  }
  res.json({ slug: p.slug, stock });
}));

const TRANSITIONS = {
  confirm: { from: ['verifying', 'awaiting_payment', 'expired'], to: 'paid' },
  ship: { from: ['paid'], to: 'shipped' },
  deliver: { from: ['shipped'], to: 'delivered' },
  cancel: { from: ['awaiting_payment', 'verifying', 'paid', 'expired'], to: 'cancelled' },
};

app.post('/api/kingalok/orders/:id', requireAdmin, h(async (req, res) => {
  const o = await store.get(req.params.id);
  if (!o) return res.status(404).json({ error: 'Order not found.' });

  if (req.body.action === 'delete') {
    await store.remove(o.id);
    return res.json({ deleted: o.id });
  }

  if (req.body.action === 'edit') {
    const { errors, data } = validateOrder(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: Object.values(errors)[0], fields: errors });
    const updated = await store.update(o.id, {
      ...data,
      courier: clean(req.body.courier, 60) || null,
      tracking: clean(req.body.tracking, 60) || null,
    });
    return res.json({ order: updated });
  }

  const t = TRANSITIONS[req.body.action];
  if (!t) return res.status(400).json({ error: 'Unknown action.' });
  if (!t.from.includes(o.status)) return res.status(409).json({ error: `Can't ${req.body.action} an order that is ${o.status}.` });

  const changes = { status: t.to };
  if (req.body.action === 'ship') {
    changes.courier = clean(req.body.courier, 60);
    changes.tracking = clean(req.body.tracking, 60);
  }
  if (req.body.action === 'cancel') changes.cancelReason = clean(req.body.reason, 200);
  if (req.body.action === 'confirm') changes.stockConflict = false;

  const updated = await store.update(o.id, changes, req.body.action === 'cancel' ? changes.cancelReason : undefined);
  res.json({ order: updated });
}));

app.use((req, res) => res.status(404).send(renderPage('404.html')));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (err.status === 503) return res.status(503).json({ error: err.message });
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

// Vercel imports the app; on your own computer it listens on a port.
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Store running at http://localhost:${PORT} (orders stored in ${store.kind})`));
}

module.exports = app;
