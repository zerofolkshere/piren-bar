(function () {
  const API_BASE = 'https://piren-aw-production.up.railway.app';

  function onReady(cb) {
    if (window.Webflow && Webflow.push) Webflow.push(cb);
    else document.addEventListener('DOMContentLoaded', cb);
  }

  onReady(() => {
    // target ONLY the tennis-signup form
    const form =
      document.querySelector('form[name="tennis-signup"]') ||
      document.querySelector('#wf-form-tennis-signup') ||
      document.querySelector('#tennis-signup');
    if (!form) return;

    const nameInput  = form.querySelector('input[name="Name"], [placeholder*="name" i]');
    const emailInput = form.querySelector('input[type="email"], input[name="Email"]');
    const submitBtn  = form.querySelector('[type="submit"]');
    if (!nameInput || !emailInput) {
      console.warn('[tennis-signup] Name or Email field missing'); return;
    }

    form.addEventListener(
      'submit',
      async (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();          // block Webflow’s default POST

        const payload = {
          name:  nameInput.value.trim(),
          email: emailInput.value.trim()
        };
        if (!payload.name || !payload.email) {
          alert('Please fill in both fields.'); return;
        }

        const original = submitBtn?.value || submitBtn?.innerText || 'Submit';
        if (submitBtn) submitBtn.value ? submitBtn.value = 'Sending…'
                                       : submitBtn.innerText = 'Sending…';

        try {
          const r = await fetch(`${API_BASE}/tennis-signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!r.ok) throw new Error(await r.text());
          form.reset();
          alert('Tack! Vi har tagit emot din förfrågan.');
        } catch (err) {
          console.error('[tennis-signup] error', err);
          alert('Ett fel inträffade – försök igen.');
        } finally {
          if (submitBtn) submitBtn.value ? submitBtn.value = original
                                         : submitBtn.innerText = original;
        }
      },
      true        // capture phase – guarantees we fire before Webflow
    );
  });
})();
