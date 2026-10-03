(async () => {
  const { id, token } = RN.orderRef();
  const $ = (sel) => document.querySelector(sel);

  let o;
  try {
    o = await RN.api(`/api/orders/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`);
  } catch (err) {
    $('#loading').hidden = true;
    $('#load-error').textContent = err.status === 404 ? 'We could not find this order. Look it up from Track order with your order number and mobile number.' : err.message;
    $('#load-error').hidden = false;
    return;
  }

  // The pay page also handles lapsed reservations, so a buyer who paid late can still enter a UTR.
  if (o.status === 'awaiting_payment' || o.status === 'expired') {
    location.replace(`/pay/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`);
    return;
  }

  const copy = {
    verifying: ['Thank you — we are checking your payment', 'We match every UTR with our UPI account by hand, usually within a few hours. Check back here — this page shows it as soon as it’s confirmed.'],
    paid: ['Payment confirmed', 'Your rudraksha is being packed. The courier tracking number will appear here when it ships.'],
    shipped: ['On its way', 'Your rudraksha has been shipped. Please record a video while opening the parcel.'],
    delivered: ['Delivered', 'We hope it brings peace and harmony to your home.'],
    cancelled: ['Order cancelled', 'If you already paid, contact us and we will refund you in full to the same UPI account.'],
    expired: ['Reservation ended', 'We did not receive a UTR in time. If you paid, you can still enter your UTR on the payment page.'],
  }[o.status] || ['Your order', ''];

  $('#headline').textContent = copy[0];
  $('#subline').textContent = copy[1];
  $('#seal').className = 'seal is-' + o.status;

  RN.fill(document, {
    id: o.id,
    product: o.productName,
    qty: o.qty,
    subtotal: RN.inr(o.subtotal),
    shipping: o.shipping ? RN.inr(o.shipping) : 'Free',
    total: RN.inr(o.total),
    utr: o.utr || '',
    email: o.email,
  });
  $('#utr-line').hidden = !o.utr;

  const a = o.address;
  $('#address').innerHTML = [o.name, a.line1, a.line2, `${a.city}, ${a.state} ${a.pincode}`, `+91 ${o.phone}`]
    .filter(Boolean)
    .map(RN.esc)
    .join('<br>');

  // Timeline
  const when = {};
  o.history.forEach((h) => (when[h.status] = h.at));
  const fmt = (t) => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const stopped = o.status === 'cancelled' || o.status === 'expired';
  const steps = [
    ['awaiting_payment', 'Order placed'],
    ['verifying', 'Payment submitted'],
    ['paid', 'Payment confirmed'],
    ['shipped', 'Shipped'],
    ['delivered', 'Delivered'],
  ];
  const order = steps.map((s) => s[0]);
  const reached = stopped ? -1 : order.indexOf(o.status);
  let html = steps
    .map(([key, label], i) => {
      const done = when[key] && (stopped || i <= reached);
      const cls = done ? (i === reached ? 'is-current' : 'is-done') : '';
      return `<li class="${cls}"><b>${label}</b>${done ? `<small>${fmt(when[key])}</small>` : ''}</li>`;
    })
    .join('');
  if (stopped) html += `<li class="is-stopped"><b>${o.status === 'cancelled' ? 'Cancelled' : 'Reservation ended'}</b><small>${fmt(when[o.status])}</small></li>`;
  $('#timeline').innerHTML = html;

  if (o.tracking || o.courier) {
    const t = $('#tracking');
    t.innerHTML = `<span class="muted small">Courier</span> <b>${RN.esc(o.courier || '—')}</b><br><span class="muted small">Tracking number</span> <code>${RN.esc(o.tracking || '—')}</code>`;
    t.hidden = false;
  }

  $('#loading').hidden = true;
  $('#order').hidden = false;
})();
