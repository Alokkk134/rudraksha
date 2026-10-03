(async () => {
  const { id, token } = RN.orderRef();
  const q = `?t=${encodeURIComponent(token)}`;
  const $ = (sel) => document.querySelector(sel);
  const orderPage = `/order/${encodeURIComponent(id)}${q}`;

  let order;
  try {
    order = await RN.api(`/api/orders/${encodeURIComponent(id)}${q}`);
  } catch (err) {
    $('#loading').hidden = true;
    $('#load-error').textContent = err.status === 404 ? 'We could not find this order. Look it up from Track order with your order number and mobile number.' : err.message;
    $('#load-error').hidden = false;
    return;
  }

  if (!['awaiting_payment', 'expired'].includes(order.status)) {
    location.replace(orderPage);
    return;
  }

  $('#loading').hidden = true;
  $('#pay').hidden = false;
  document.body.classList.add(RN.isMobile ? 'is-mobile' : 'is-desktop');

  RN.fill(document, {
    id: order.id,
    product: `${order.productName} × ${order.qty}`,
    total: RN.inr(order.total),
    upi: order.upi.id,
    amount: order.total.toFixed(2),
  });

  $('#pay-any').href = order.upi.links.any;
  $('#pay-gpay').href = order.upi.links.gpay;
  $('#pay-phonepe').href = order.upi.links.phonepe;
  $('#pay-paytm').href = order.upi.links.paytm;
  $('#qr').src = `/api/orders/${encodeURIComponent(id)}/qr.svg${q}`;
  $('#qr-download').href = `/api/orders/${encodeURIComponent(id)}/qr.png${q}`;

  // Copy buttons
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy === 'upi' ? order.upi.id : order.total.toFixed(2);
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied';
      } catch {
        btn.textContent = text;
      }
      setTimeout(() => (btn.textContent = 'Copy'), 1800);
    });
  });

  // Countdown, corrected for any clock difference between phone and server
  const skew = Date.now() - order.serverNow;
  function showExpired() {
    document.querySelector('.pay-card').hidden = true;
    $('#expired').hidden = false;
  }
  if (order.status === 'expired') {
    showExpired();
  } else {
    const tick = () => {
      const left = order.expiresAt - (Date.now() - skew);
      if (left <= 0) {
        clearInterval(timer);
        $('#timer-text').textContent = '0:00';
        showExpired();
        return;
      }
      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000);
      $('#timer-text').textContent = `${m}:${String(s).padStart(2, '0')}`;
      $('#timer').classList.toggle('is-low', left < 5 * 60000);
    };
    const timer = setInterval(tick, 1000);
    tick();
  }

  // UTR
  const utr = $('#utr');
  utr.addEventListener('input', () => (utr.value = utr.value.replace(/[^\d ]/g, '')));
  $('#utr-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#utr-error');
    err.hidden = true;
    const value = utr.value.replace(/\s/g, '');
    if (!/^\d{12}$/.test(value)) {
      err.textContent = 'The UTR is 12 digits. Check your UPI app’s payment details.';
      err.hidden = false;
      utr.focus();
      return;
    }
    const btn = $('#utr-submit');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      await RN.api(`/api/orders/${encodeURIComponent(id)}/utr${q}`, { method: 'POST', body: { utr: value } });
      location.href = orderPage;
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Submit';
    }
  });
})();
