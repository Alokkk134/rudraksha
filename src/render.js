// Minimal page renderer: reads views/*.html and fills {{value}} (escaped)
// and {{{block}}} (raw HTML) slots.

const fs = require('fs');
const path = require('path');
const { site } = require('./config');
const STATES = require('./states');

// Each view is listed with a literal path so Vercel's bundler includes the file.
const VIEW_FILES = {
  'index.html': path.join(__dirname, '..', 'views', 'index.html'),
  'checkout.html': path.join(__dirname, '..', 'views', 'checkout.html'),
  'pay.html': path.join(__dirname, '..', 'views', 'pay.html'),
  'order.html': path.join(__dirname, '..', 'views', 'order.html'),
  'track.html': path.join(__dirname, '..', 'views', 'track.html'),
  'admin.html': path.join(__dirname, '..', 'views', 'admin.html'),
  '404.html': path.join(__dirname, '..', 'views', '404.html'),
};
const cache = new Map();

// Changes whenever styles.css changes, so browsers fetch the new file instead of a cached one.
let cssVersion = '1';
try {
  const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'styles.css'));
  cssVersion = require('crypto').createHash('md5').update(css).digest('hex').slice(0, 8);
} catch {}
const isDev = !process.env.VERCEL && process.env.NODE_ENV !== 'production';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');

function readView(name) {
  if (!isDev && cache.has(name)) return cache.get(name);
  const html = fs.readFileSync(VIEW_FILES[name], 'utf8');
  cache.set(name, html);
  return html;
}

// ---------- bead illustration (shown until real photos are added) ----------

let svgId = 0;
function beadSvg(slug, label) {
  const id = 'b' + ++svgId;
  const ganesh = slug === 'gauri-shankar-ganesh';
  let seed = ganesh ? 7 : 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  function bead(cx, cy, rx, ry, rot) {
    const ridges = [-0.85, -0.55, -0.25, 0.08, 0.4, 0.72]
      .map((k) => {
        const x = cx + k * rx * 1.25;
        return `<path d="M${cx} ${cy - ry * 0.97} C${x} ${cy - ry * 0.55} ${x} ${cy + ry * 0.55} ${cx} ${cy + ry * 0.97}"/>`;
      })
      .join('');
    let dots = '';
    for (let i = 0; i < 70; i++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * 0.92;
      dots += `<circle cx="${(cx + Math.cos(a) * r * rx).toFixed(1)}" cy="${(cy + Math.sin(a) * r * ry).toFixed(1)}" r="${(1.2 + rnd() * 2.2).toFixed(1)}"/>`;
    }
    const clip = `${id}c${cx}`;
    return `<g transform="rotate(${rot} ${cx} ${cy})">
<clipPath id="${clip}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id}g)"/>
<g clip-path="url(#${clip})">
<g fill="#2a1207" opacity=".35">${dots}</g>
<g fill="none" stroke="#24100a" stroke-width="5" stroke-linecap="round" opacity=".75">${ridges}</g>
<g fill="none" stroke="#c98b5a" stroke-width="1.6" opacity=".35" transform="translate(4 -2)">${ridges}</g>
<ellipse cx="${cx - rx * 0.35}" cy="${cy - ry * 0.45}" rx="${rx * 0.28}" ry="${ry * 0.16}" fill="#fff" opacity=".13"/>
</g></g>`;
  }

  return `<svg class="bead-art" viewBox="0 0 400 400" role="img" aria-label="${esc(label)} (illustration — photo coming soon)">
<defs>
<radialGradient id="${id}g" cx="38%" cy="32%" r="75%">
<stop offset="0" stop-color="#a5603a"/><stop offset=".55" stop-color="#6b3219"/><stop offset="1" stop-color="#2e140a"/>
</radialGradient>
<radialGradient id="${id}s" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#2a160c" stop-opacity=".28"/><stop offset="1" stop-color="#2a160c" stop-opacity="0"/></radialGradient>
</defs>
<ellipse cx="200" cy="345" rx="150" ry="22" fill="url(#${id}s)"/>
${bead(250, 222, 82, 104, 8)}
${bead(150, 222, 82, 104, -8)}
${ganesh ? bead(205, 104, 30, 40, 18) : ''}
</svg>`;
}

function media(p, opts = {}) {
  if (p.images.length) {
    const src = p.images[0];
    return `<img src="${esc(src)}" alt="${esc(p.name)} — actual bead" ${opts.eager ? 'fetchpriority="high"' : 'loading="lazy"'}>`;
  }
  return beadSvg(p.slug, p.name);
}

function gallery(p) {
  const main = `<div class="gallery-main">${media(p)}</div>`;
  if (p.images.length < 2) return main + (p.images.length ? '' : '<p class="photo-note">Illustration. Real photographs of the bead coming soon.</p>');
  const thumbs = p.images
    .map(
      (src, i) =>
        `<button type="button" class="thumb${i === 0 ? ' is-active' : ''}" data-src="${esc(src)}" aria-label="Photo ${i + 1}"><img src="${esc(src)}" alt="" loading="lazy"></button>`
    )
    .join('');
  return main + `<div class="thumbs">${thumbs}</div>`;
}

// ---------- shared pieces ----------

const BEAD_MARK = `<svg class="mark" viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="15" cy="21" rx="9" ry="11"/><ellipse cx="25" cy="21" rx="9" ry="11"/><path d="M15 10.5c-3 6-3 15 0 21M25 10.5c3 6 3 15 0 21"/></svg>`;

function header({ minimal = false } = {}) {
  const nav = minimal
    ? `<span class="secure-note"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z"/></svg>Pay by UPI directly to the seller</span>`
    : `<nav class="nav" aria-label="Main">
  <a href="/#beads">The beads</a><a href="/#genuine">How to tell genuine</a><a href="/#buying">How buying works</a><a href="/#faq">FAQ</a><a href="/track">Track order</a>
</nav>
<a class="btn btn-small" href="/#beads">Shop</a>`;
  return `<header class="site-header${minimal ? ' is-minimal' : ''}"><div class="wrap header-inner">
<a class="brand" href="/">${BEAD_MARK}<span>${esc(site.brand)}<small lang="hi">${esc(site.brandHindi)}</small></span></a>
${nav}
</div></header>`;
}

function whatsappLink(text) {
  return site.whatsapp ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}` : '';
}

function footer() {
  const wa = whatsappLink('Namaste, I have a question about the rudraksha.');
  return `<footer class="site-footer"><div class="wrap footer-grid">
<div>
  <a class="brand brand-light" href="/">${BEAD_MARK}<span>${esc(site.brand)}<small lang="hi">${esc(site.brandHindi)}</small></span></a>
  <p class="muted">${esc(site.tagline)}</p>
</div>
<div>
  <h3>Help</h3>
  <p><a href="/track">Track your order</a></p>
  ${wa ? `<p><a href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp +${esc(site.whatsapp)}</a></p>` : ''}
</div>
<div>
  <h3>Payments</h3>
  <p>UPI only, paid directly to<br><code>${esc(site.upiId)}</code></p>
  <p class="muted small">We never ask for your card, PIN or OTP.</p>
</div>
</div>
<div class="wrap footer-base"><span>© ${new Date().getFullYear()} ${esc(site.brand)}</span><span>${esc(site.shippingNote)} · Dispatch in ${esc(site.dispatchDays)}</span></div>
</footer>
${wa ? `<a class="wa-float" href="${esc(wa)}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 1.9 1.1 1 2 1.3 2.3 1.4.3.2.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z"/></svg></a>` : ''}`;
}

function head(title, description) {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#f5eee2">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..600&family=Manrope:wght@400;500;600;700&family=Tiro+Devanagari+Sanskrit&display=swap">
<link rel="stylesheet" href="/css/styles.css?v=${cssVersion}">`;
}

// ---------- index blocks ----------

function stockLine(p, left) {
  if (left === 0) return `<p class="stock is-out">Sold — this bead has found its home</p>`;
  if (p.stock === 1) return `<p class="stock is-one"><span class="pulse"></span>Only piece. Once sold, it's gone.</p>`;
  const dots = Array.from({ length: p.stock }, (_, i) => `<i class="${i < left ? 'on' : ''}"></i>`).join('');
  return `<div class="stock"><span class="dots" aria-hidden="true">${dots}</span><span><b>${left} of ${p.stock}</b> left</span></div>`;
}

function productSection(p, i, left) {
  const specs = Object.entries(p.specs)
    .filter(([, v]) => v)
    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
    .join('');
  const wa = whatsappLink(`Namaste, I'd like to see the ${p.name} on a video call before buying.`);
  const buy =
    left > 0
      ? `<a class="btn btn-buy" href="/checkout/${esc(p.slug)}">Buy now · ${inr(p.price)}</a>`
      : `<span class="btn btn-buy is-disabled" aria-disabled="true">Sold out</span>`;

  return `<article class="product${i % 2 ? ' is-flipped' : ''}" id="${esc(p.slug)}">
<div class="product-media">
  <div class="arch">${gallery(p)}</div>
  <div class="tag" aria-hidden="true"><span>No. 0${i + 1}</span><b>${esc(p.shortName)}</b><span>${p.stock === 1 ? '1 of 1' : `${p.stock} pieces`} · Nepal</span></div>
</div>
<div class="product-info">
  <p class="eyebrow">${esc(p.badge)}</p>
  <h3 class="product-name">${esc(p.name)}</h3>
  <p class="hindi" lang="hi">${esc(p.nameHindi)}</p>
  <p class="price">${inr(p.price)}<small>${site.shippingFee ? ' + shipping' : ' · free shipping'}</small></p>
  ${stockLine(p, left)}
  <p class="lead">${esc(p.summary)}</p>
  ${p.description.map((d) => `<p>${esc(d)}</p>`).join('')}
  ${specs ? `<dl class="specs">${specs}</dl>` : ''}
  <div class="buy-row">${buy}${wa ? `<a class="btn btn-ghost" href="${esc(wa)}" target="_blank" rel="noopener">See it on video call</a>` : ''}</div>
  <ul class="assure">
    <li><b>Lab-tested certificate included in the parcel</b></li>
    <li>Held for you for ${site.reservationMinutes} minutes while you pay</li>
    <li>Pay by UPI — scan or tap, amount filled in</li>
    <li>Track your order online, from payment to delivery</li>
  </ul>
</div>
</article>`;
}

function faqItems() {
  const wa = site.whatsapp;
  const items = [
    [
      'Are these beads genuine?',
      'Yes. Every bead is a natural, Nepal-origin rudraksha. Each Gauri Shankar grew joined on the tree — nothing is glued or carved. If what you receive does not match what is shown here, you can return it.',
    ],
    [
      'Do I get a certificate?',
      'Yes. Every bead has been lab tested, and a copy of its lab certificate is packed with your order — proof that the bead you received is genuine.',
    ],
    [
      'Why do you only accept UPI?',
      `We are a small seller, not a big store. UPI lets you pay us directly with no gateway in between. Before you approve the payment, your UPI app shows the name registered to ${site.upiId}, so you can see exactly who you are paying.`,
    ],
    [
      'I paid but closed the page. What now?',
      `Go to “Track order” at the top of the site, enter your order number and mobile number, and type your 12-digit UTR there.${site.whatsapp ? ' Or WhatsApp us the UTR with your order number — we will match it by hand.' : ''}`,
    ],
    [
      'Where do I find the UTR number?',
      'Open the payment in your UPI app’s history. Google Pay calls it “UPI transaction ID”, PhonePe calls it “UTR”, and Paytm calls it “UPI Ref No.” It is always 12 digits.',
    ],
    ['When will my order ship?', `Within ${site.dispatchDays} of confirming your payment. ${site.shippingNote}. The courier tracking number appears on your order page under “Track order”.`],
    ['What is your return policy?', site.returnsPolicy],
    ...(wa ? [['Can I see the bead before buying?', 'Yes. Message us on WhatsApp and we will show you the exact bead on a video call.']] : []),
    [
      'Is my information safe?',
      'We use your name, phone, email and address only to ship your order and contact you about it. We never share them, and we never ask for card details, PINs or OTPs.',
    ],
  ];
  return items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');
}

// ---------- page entry ----------

function renderPage(name, data = {}) {
  const ctx = {
    head: '',
    header: header(),
    headerMinimal: header({ minimal: true }),
    footer: footer(),
    brand: site.brand,
    upiId: site.upiId,
    reservationMinutes: site.reservationMinutes,
    shippingNote: site.shippingNote,
    dispatchDays: site.dispatchDays,
    // Contact lines only appear when a WhatsApp number is set in config.
    payHelp: site.whatsapp
      ? `<p class="muted small center">Problem paying? <a href="${esc(whatsappLink('Namaste, I need help paying for my order.'))}" target="_blank" rel="noopener">WhatsApp us</a> with your order number.</p>`
      : '',
    questionsLink: site.whatsapp
      ? ` Questions? <a href="${esc(whatsappLink('Namaste, I have a question about my order.'))}" target="_blank" rel="noopener">WhatsApp us</a>`
      : '',
    faqContact: site.whatsapp
      ? `<p class="muted">Still unsure? <a href="${esc(whatsappLink('Namaste, I have a question about the rudraksha.'))}" target="_blank" rel="noopener">Ask us on WhatsApp</a>.</p>`
      : '',
  };

  if (name === 'index.html') {
    const { products, lefts } = data;
    const total = products.reduce((s, p) => s + p.stock, 0);
    const totalLeft = lefts.reduce((s, n) => s + n, 0);
    const minPrice = Math.min(...products.map((p) => p.price));
    Object.assign(ctx, {
      head: head(`${site.brand} — Genuine Nepal Gauri Shankar Rudraksha`, `Genuine Nepal Gauri Shankar and Gauri Shankar Ganesh rudraksha. Only ${total} beads. Pay by UPI.`),
      heroArt: beadSvg('gauri-shankar-ganesh', 'Gauri Shankar Ganesh rudraksha'),
      heroImage: products[0].images.length ? media(products[0], { eager: true }) : '',
      totalBeads: total,
      totalLeft,
      minPrice: inr(minPrice),
      inventory: products
        .map(
          (p, i) =>
            `<a class="inv" href="#${esc(p.slug)}"><span class="inv-num">${p.stock}</span><span><b>${esc(p.name)}</b><small>${lefts[i] === 0 ? 'Sold out' : `${lefts[i]} available · ${inr(p.price)}`}</small></span></a>`
        )
        .join(''),
      products: products.map((p, i) => productSection(p, i, lefts[i])).join(''),
      faq: faqItems(),
      whatsappCta: site.whatsapp
        ? `<a class="btn btn-ghost-light" href="${esc(whatsappLink('Namaste, I have a question about the rudraksha.'))}" target="_blank" rel="noopener">Ask on WhatsApp</a>`
        : '',
    });
    // The hero shows the real Ganesh bead photo once it exists.
    if (ctx.heroImage) ctx.heroArt = ctx.heroImage;
  }

  if (name === 'checkout.html') {
    const { product: p, available: left } = data;
    Object.assign(ctx, {
      head: head(`Checkout — ${p.name} · ${site.brand}`, `Buy ${p.name}`),
      slug: p.slug,
      productName: p.name,
      productHindi: p.nameHindi,
      productMedia: media(p),
      price: p.price,
      priceText: inr(p.price),
      shippingFee: site.shippingFee,
      shippingText: site.shippingFee ? inr(site.shippingFee) : 'Free',
      available: left,
      soldOut: left === 0 ? 'true' : '',
      stateOptions: STATES.map((s) => `<option>${esc(s)}</option>`).join(''),
    });
  }

  const titles = {
    'pay.html': `Payment · ${site.brand}`,
    'order.html': `Your order · ${site.brand}`,
    'track.html': `Track your order · ${site.brand}`,
    'admin.html': `Orders · ${site.brand}`,
    '404.html': `Page not found · ${site.brand}`,
  };
  if (titles[name]) ctx.head = head(titles[name], site.tagline);

  return readView(name)
    .replace(/\{\{\{(\w+)\}\}\}/g, (_, k) => (ctx[k] ?? ''))
    .replace(/\{\{(\w+)\}\}/g, (_, k) => esc(ctx[k] ?? ''));
}

module.exports = { renderPage };
