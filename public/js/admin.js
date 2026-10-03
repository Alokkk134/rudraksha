(() => {
  const $ = (sel) => document.querySelector(sel);
  const esc = RN.esc;
  let data = null;
  let filter = 'verifying';

  const LABELS = {
    awaiting_payment: 'Waiting to pay',
    verifying: 'Check payment',
    paid: 'Paid — to ship',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    expired: 'Expired',
  };
  const HINTS = {
    verifying: 'Open FamPay, find a payment with this UTR and amount, then press Confirm. If you can’t find it, Cancel with a reason.',
    paid: 'Pack and ship these, then enter the courier and tracking number.',
    awaiting_payment: 'These buyers have a bead reserved but haven’t entered a UTR yet.',
    shipped: 'Mark delivered once the courier shows it delivered.',
    all: '',
  };

  async function load() {
    try {
      data = await RN.api('/api/admin/orders');
    } catch (err) {
      if (err.status === 401) return showLogin();
      alert(err.message);
      return;
    }
    $('#login').hidden = true;
    $('#dash').hidden = false;
    $('#logout').hidden = false;
    render();
  }

  function showLogin() {
    $('#dash').hidden = true;
    $('#logout').hidden = true;
    $('#login').hidden = false;
    $('#password').focus();
  }

  const isLive = (o) => o.status !== 'awaiting_payment' || o.expiresAt > Date.now();

  function render() {
    $('#stock').innerHTML = data.stock
      .map((s) => `<div class="card stock-card"><span class="muted small">${esc(s.name)}</span><b>${s.available}</b><span class="muted small">of ${s.stock} available</span></div>`)
      .join('');

    document.querySelectorAll('#tabs button').forEach((b) => {
      const f = b.dataset.filter;
      const n = f === 'all' ? data.orders.length : data.orders.filter((o) => o.status === f && isLive(o)).length;
      b.querySelector('span').textContent = n || '';
      b.classList.toggle('is-active', f === filter);
    });

    $('#hint').textContent = HINTS[filter] || '';
    const list = filter === 'all' ? data.orders : data.orders.filter((o) => o.status === filter && isLive(o));
    $('#orders').innerHTML = list.length ? list.map(card).join('') : '<p class="muted center">Nothing here.</p>';
  }

  const fmt = (t) => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

  function card(o) {
    const a = o.address;
    const addr = [o.name, a.line1, a.line2, `${a.city}, ${a.state} - ${a.pincode}`, `Phone: ${o.phone}`].filter(Boolean).join('\n');
    const actions = [];
    if (['verifying', 'awaiting_payment', 'expired'].includes(o.status)) actions.push(`<button class="btn btn-small" data-act="confirm">Confirm payment received</button>`);
    if (o.status === 'paid') {
      actions.push(`<input name="courier" placeholder="Courier (e.g. India Post)" maxlength="60"><input name="tracking" placeholder="Tracking number" maxlength="60"><button class="btn btn-small" data-act="ship">Mark shipped</button>`);
    }
    if (o.status === 'shipped') actions.push(`<button class="btn btn-small" data-act="deliver">Mark delivered</button>`);
    if (['awaiting_payment', 'verifying', 'paid', 'expired'].includes(o.status)) actions.push(`<button class="btn btn-small btn-danger" data-act="cancel">Cancel…</button>`);

    return `<article class="card order-card" data-id="${esc(o.id)}">
<header>
  <div><b>${esc(o.id)}</b> <span class="pill is-${esc(o.status)}">${esc(LABELS[o.status] || o.status)}</span></div>
  <span class="muted small">${fmt(o.createdAt)}</span>
</header>
${o.stockConflict ? '<p class="warn">Reservation had expired before the UTR came in — the bead may be sold to someone else. Check stock before confirming; refund if needed.</p>' : ''}
<div class="order-cols">
  <div>
    <p class="big-amount">${RN.inr(o.total)}</p>
    <p>${esc(o.productName)} × ${o.qty}</p>
    ${o.utr ? `<p>UTR <code class="utr">${esc(o.utr)}</code></p>` : '<p class="muted small">No UTR yet</p>'}
    ${o.tracking ? `<p class="small">${esc(o.courier)} · <code>${esc(o.tracking)}</code></p>` : ''}
    ${o.cancelReason ? `<p class="small muted">Reason: ${esc(o.cancelReason)}</p>` : ''}
  </div>
  <div>
    <pre class="addr">${esc(addr)}</pre>
    <p class="small"><a href="mailto:${esc(o.email)}">${esc(o.email)}</a> · <a href="tel:+91${esc(o.phone)}">Call</a></p>
    <button class="link small" data-copy-addr="${esc(addr)}">Copy address</button>
  </div>
</div>
${actions.length ? `<div class="order-actions">${actions.join('')}</div>` : ''}
</article>`;
  }

  $('#orders').addEventListener('click', async (e) => {
    const copyBtn = e.target.closest('[data-copy-addr]');
    if (copyBtn) {
      await navigator.clipboard.writeText(copyBtn.dataset.copyAddr).catch(() => {});
      copyBtn.textContent = 'Copied';
      return;
    }
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const cardEl = btn.closest('.order-card');
    const id = cardEl.dataset.id;
    const o = data.orders.find((x) => x.id === id);
    const act = btn.dataset.act;
    const body = { action: act };

    if (act === 'confirm' && !confirm(`Did you receive ${RN.inr(o.total)}${o.utr ? ` with UTR ${o.utr}` : ''} in FamPay?\n\nThe buyer's order page will then show it as confirmed.`)) return;
    if (act === 'ship') {
      body.courier = cardEl.querySelector('[name=courier]').value;
      body.tracking = cardEl.querySelector('[name=tracking]').value;
      if (!body.tracking && !confirm('Ship without a tracking number?')) return;
    }
    if (act === 'cancel') {
      const reason = prompt('Reason for cancelling (sent to the buyer):', o.status === 'verifying' ? 'We could not find a payment matching your UTR.' : '');
      if (reason === null) return;
      body.reason = reason;
    }

    btn.disabled = true;
    try {
      await RN.api(`/api/admin/orders/${encodeURIComponent(id)}`, { method: 'POST', body });
      await load();
    } catch (err) {
      alert(err.message);
      btn.disabled = false;
    }
  });

  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    filter = b.dataset.filter;
    render();
  });

  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#login-error');
    err.hidden = true;
    try {
      await RN.api('/api/admin/login', { method: 'POST', body: { password: $('#password').value } });
      $('#password').value = '';
      load();
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  });

  $('#logout').addEventListener('click', async () => {
    await RN.api('/api/admin/logout', { method: 'POST' });
    showLogin();
  });

  load();
  setInterval(() => !$('#dash').hidden && load(), 60 * 1000);
})();
