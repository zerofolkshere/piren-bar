// ──────────────────────────────────────────────────────────────
// “tennis-checker” form  ✦  Brevo send (match logic is backend-only)
// ──────────────────────────────────────────────────────────────
(function () {
  const API_BASE = 'piren-tennis.up.railway.app';

  /* Wait until Webflow’s JS is ready */
  function onReady(cb) {
    if (window.Webflow && Webflow.push) Webflow.push(cb);
    else document.addEventListener('DOMContentLoaded', cb);
  }

  onReady(() => {
    /* 1 ▸ Grab the form by NAME or ID (Webflow assigns both) */
    const form =
      document.querySelector('form[name="tennis-checker"]') ||
      document.querySelector('#wf-form-tennis-checker') ||
      document.querySelector('#tennis-checker');
    if (!form) return console.warn('[tennis-checker] Form not found');

    /* 2 ▸ Grab the **specific** e-mail field you flagged */
    const emailInput = form.querySelector('[tennis-match="email"]');
    if (!emailInput) return console.warn('[tennis-checker] Input[tennis-match="email"] not found');

    /* 3 ▸ Grab submit button */
    const submitBtn = form.querySelector('[type="submit"]');

    /* 4 ▸ Intercept submit */
    form.addEventListener('submit', async e => {
      e.preventDefault();

      const email = emailInput.value.trim();
      if (!email) {
        alert('Please enter your email.');
        return;
      }

      const original = submitBtn?.value || submitBtn?.innerText || 'Submit';
      if (submitBtn) submitBtn.value ? submitBtn.value = 'Sending…'
                                     : submitBtn.innerText = 'Sending…';

      try {
        const r = await fetch(`${API_BASE}/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        if (!r.ok) throw new Error(await r.text());

        form.reset();
        alert('✓ Confirmation sent!');
      } catch (err) {
        console.error('[tennis-checker] send failed', err);
        alert('Something went wrong — please try again.');
      } finally {
        if (submitBtn) submitBtn.value ? submitBtn.value = original
                                       : submitBtn.innerText = original;
      }
    });
  });
})();
