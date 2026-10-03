(() => {
  const form = document.getElementById('track');
  const err = document.getElementById('track-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      const { id, token } = await RN.api('/api/track', {
        method: 'POST',
        body: { id: form.elements['order-id'].value, phone: form.elements.phone.value },
      });
      location.href = `/order/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`;
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
      btn.disabled = false;
    }
  });
})();
