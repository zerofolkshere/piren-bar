// ──────────────────────────────────────────────────────────────
// “after-work” form  ✦  real-time domain check  ✦  Brevo send
// ──────────────────────────────────────────────────────────────
(function () {
  const API_BASE = 'https://piren-aw-production.up.railway.app';

  /* Wait until Webflow’s JS is ready */
  function onReady(cb) {
    if (window.Webflow && Webflow.push) Webflow.push(cb);
    else document.addEventListener('DOMContentLoaded', cb);
  }

  onReady(() => {
    /* 1 ▸ Grab the form by NAME (Webflow assigns both id & name) */
    const form =
      document.querySelector('form[name="after-work"]') ||
      document.querySelector('#wf-form-after-work');
    if (!form) return console.warn('[after-work] Form not found');

    /* 2 ▸ Grab the **specific** e-mail field you flagged */
    const emailInput = form.querySelector('[aw-match="email"]');
    if (!emailInput) return console.warn('[after-work] Input[aw-match=\"email\"] not found');

    /* 3 ▸ Other elements */
    const submitBtn = form.querySelector('[type="submit"]');
    const okElem  = form.querySelector('[aw-match="true"]');
    const badElem = form.querySelector('[aw-match="false"]');
    const show = (el, bool) => el && (el.style.display = bool ? 'block' : 'none');

    /* Hide match indicators at load */
    show(okElem, false);
    show(badElem, false);

    /* Helpers */
    let domainOK = false;
    const debounce = (fn, ms=400) => { let t; return (...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);} };
    const setUI = ok => {
      domainOK = ok;
      if (submitBtn) submitBtn.disabled = !ok;
      show(okElem,  ok);
      show(badElem, !ok);
    };

    /* 4 ▸ Check domain */
    const check = async () => {
      const m = emailInput.value.trim().match(/^[^@]+@([^@]+)$/);
      if (!m) return setUI(false);
      try {
        const r = await fetch(`${API_BASE}/check-domain?domain=${m[1].toLowerCase()}`);
        const d = await r.json();
        setUI(!!d.allowed);
      } catch (e) {
        console.error('[after-work] fetch error', e);
        setUI(false);
      }
    };

    emailInput.addEventListener('input', debounce(check));
    emailInput.addEventListener('blur', check);

    /* 5 ▸ Intercept submit */
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!domainOK) return;                 // extra safety
      const original = submitBtn?.value || submitBtn?.innerText || 'Submit';
      if (submitBtn) submitBtn.value ? submitBtn.value = 'Sending…'
                                     : submitBtn.innerText = 'Sending…';
      try {
        const r = await fetch(`${API_BASE}/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.value.trim() })
        });
        if (!r.ok) throw new Error(await r.text());
        form.reset(); setUI(false);
        alert('✓ Confirmation sent!');
      } catch (err) {
        console.error('[after-work] send failed', err);
        alert('Something went wrong — please try again.');
      } finally {
        if (submitBtn) submitBtn.value ? submitBtn.value = original
                                       : submitBtn.innerText = original;
      }
    });
  });
})();
