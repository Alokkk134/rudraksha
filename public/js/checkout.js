(() => {
  const form = document.getElementById('checkout');
  const price = Number(form.dataset.price);
  const shipping = Number(form.dataset.shipping);
  let available = Number(form.dataset.available);
  let qty = 1;

  const qtyOut = document.getElementById('qty');
  const qtyRow = document.getElementById('qty-row');
  const qtyNote = document.getElementById('qty-note');
  const submit = document.getElementById('submit');
  const formError = document.getElementById('form-error');

  function render() {
    qtyOut.textContent = qty;
    document.querySelectorAll('[data-subtotal]').forEach((el) => (el.textContent = RN.inr(price * qty)));
    document.querySelectorAll('[data-total]').forEach((el) => (el.textContent = RN.inr(price * qty + shipping)));
    qtyRow.hidden = available <= 1;
    qtyNote.textContent = available > 1 ? `${available} available` : available === 1 ? 'The only piece — yours if you continue.' : '';
  }

  qtyRow.addEventListener('click', (e) => {
    const step = Number(e.target.dataset.step || 0);
    if (!step) return;
    qty = Math.min(Math.max(1, qty + step), Math.max(1, available));
    render();
  });

  if (form.dataset.soldout) {
    submit.disabled = true;
    submit.textContent = 'Sold out';
    formError.textContent = 'Sorry, this bead is sold or reserved by another buyer right now.';
    formError.hidden = false;
  }

  const phone = form.phone;
  phone.addEventListener('input', () => (phone.value = phone.value.replace(/[^\d\s]/g, '')));
  form.pincode.addEventListener('input', (e) => (e.target.value = e.target.value.replace(/\D/g, '')));

  // Remember details so a returning buyer doesn't retype them. Stays on this device only.
  const KEY = 'rn-buyer';
  const FIELDS = ['name', 'phone', 'email', 'line1', 'line2', 'city', 'state', 'pincode'];
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    FIELDS.forEach((f) => saved[f] && !form[f].value && (form[f].value = saved[f]));
  } catch {}

  function showErrors(fields = {}) {
    form.querySelectorAll('.err').forEach((el) => {
      const msg = fields[el.dataset.for] || '';
      el.textContent = msg;
      form[el.dataset.for]?.setAttribute('aria-invalid', msg ? 'true' : 'false');
    });
    const first = Object.keys(fields)[0];
    if (first) form[first]?.focus();
  }

  function localCheck(v) {
    const e = {};
    if (v.name.trim().length < 2) e.name = 'Please enter your full name.';
    if (!/^[6-9]\d{9}$/.test(v.phone.replace(/\s/g, '').replace(/^(\+?91|0)(?=\d{10}$)/, ''))) e.phone = 'Enter a 10-digit mobile number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = 'Enter a valid email address.';
    if (v.line1.trim().length < 5) e.line1 = 'Enter your house number and street.';
    if (!/^[1-9]\d{5}$/.test(v.pincode)) e.pincode = 'Enter a 6-digit PIN code.';
    if (v.city.trim().length < 2) e.city = 'Enter your city or town.';
    if (!v.state) e.state = 'Choose your state.';
    return e;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.hidden = true;
    const v = Object.fromEntries(FIELDS.map((f) => [f, form[f].value]));
    const errs = localCheck(v);
    showErrors(errs);
    if (Object.keys(errs).length) return;

    submit.disabled = true;
    const label = submit.innerHTML;
    submit.textContent = 'Reserving your bead…';
    try {
      const { id, token } = await RN.api('/api/orders', {
        method: 'POST',
        body: {
          slug: form.dataset.slug,
          qty,
          name: v.name,
          phone: v.phone,
          email: v.email,
          address: { line1: v.line1, line2: v.line2, city: v.city, state: v.state, pincode: v.pincode },
        },
      });
      try {
        localStorage.setItem(KEY, JSON.stringify(v));
      } catch {}
      location.href = `/pay/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`;
    } catch (err) {
      if (err.data?.fields) showErrors(err.data.fields);
      if (typeof err.data?.available === 'number') {
        available = err.data.available;
        qty = Math.min(qty, Math.max(1, available));
        render();
      }
      formError.textContent = err.message;
      formError.hidden = false;
      submit.disabled = available === 0;
      submit.innerHTML = available === 0 ? 'Sold out' : label;
      render();
    }
  });

  render();
})();
