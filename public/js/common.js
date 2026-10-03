window.RN = {
  inr(n) {
    return '₹' + Number(n).toLocaleString('en-IN');
  },

  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  },

  async api(url, { method = 'GET', body } = {}) {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
    let data = {};
    try {
      data = await res.json();
    } catch {}
    if (!res.ok) {
      const err = new Error(data.error || 'Something went wrong. Please try again.');
      Object.assign(err, { status: res.status, data });
      throw err;
    }
    return data;
  },

  // /pay/RN-XXXX?t=token → { id, token }
  orderRef() {
    const id = decodeURIComponent(location.pathname.split('/').pop());
    const token = new URLSearchParams(location.search).get('t') || '';
    return { id, token };
  },

  fill(root, values) {
    for (const [key, val] of Object.entries(values)) {
      root.querySelectorAll(`[data-f="${key}"]`).forEach((el) => (el.textContent = val));
    }
  },

  isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
};
