/* -------------------------------------------------------------
 * Booking form logic – updated for current live form
 * ------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  (function () {
    const qs = (s, ctx = document) => ctx.querySelector(s);
    const qsa = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

    /* abort if the form is not on the page */
    const form = qs('#wf-form-abonnering');
    const guestInput = qs('[ab-form="guests"]', form || document);
    if (!form || !guestInput) return;

    /*────────────────────── DOM CACHE ─────────────────────*/
    const guestWarning = qs('[warning="guest-capacity"]');
    const datePicked = qs('[ab-form="date-picked"]', form);
    const warningUnavailable = qs('[warning="date-unavailable"]');

    const mapMain = qs('[ab-form="map-main"]');
    const mapTerrace = qs('[ab-form="map-terrace"]');

    const minSpendField = qs('[ab-form="sum-min-spend"]');       // optional, not present in current HTML
    const minSpendInput = qs('[ab-form="input-min-spend"]');     // present in current HTML
    const minReached = qs('[ab-form="min-reached"]');            // optional, not present in current HTML
    const minNotReached = qs('[ab-form="min-not-reached"]');     // optional, not present in current HTML

    /*─────────────────── INITIAL VISUAL STATE ───────────────────*/
    if (guestWarning) guestWarning.style.display = 'none';
    if (warningUnavailable) warningUnavailable.style.display = 'none';
    if (mapMain) mapMain.style.display = 'none';
    if (mapTerrace) mapTerrace.style.display = 'none';

    /*─────────────────────── UTILITIES ─────────────────────────*/
    const formatSEK = v =>
      v.toLocaleString('sv-SE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

    const swedishMonths = [
      'januari', 'februari', 'mars', 'april', 'maj', 'juni',
      'juli', 'augusti', 'september', 'oktober', 'november', 'december'
    ];

    const pad = n => String(n).padStart(2, '0');

    function parseDateValue(value) {
      if (!value) return null;
      const v = String(value).trim();

      let m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
      if (m) {
        const year = +m[1];
        const month = +m[2];
        const day = +m[3];
        return {
          year,
          month,
          day,
          iso: `${year}-${pad(month)}-${pad(day)}`
        };
      }

      m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
      if (m) {
        const day = +m[1];
        const month = +m[2];
        const year = +m[3];
        return {
          year,
          month,
          day,
          iso: `${year}-${pad(month)}-${pad(day)}`
        };
      }

      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const day = d.getDate();
        return {
          year,
          month,
          day,
          iso: `${year}-${pad(month)}-${pad(day)}`
        };
      }

      return null;
    }

    function getGuestCount() {
      const n = parseInt(guestInput.value || '0', 10);
      return isNaN(n) ? 0 : n;
    }

    function clampGuestInput() {
      let v = parseInt(guestInput.value, 10);
      if (isNaN(v)) v = 40;
      v = Math.max(40, Math.min(127, v));
      guestInput.value = v;
      return v;
    }

    function updateGuestWarning() {
      if (!guestWarning) return;
      const raw = getGuestCount();
      guestWarning.style.display = raw > 48 ? 'block' : 'none';
    }

    function updateMaps() {
      if (mapMain) mapMain.style.display = 'none';
      if (mapTerrace) mapTerrace.style.display = 'none';

      const guests = getGuestCount();
      if (!guests) return;

      if (guests <= 47) {
        if (mapMain) mapMain.style.display = 'block';
      } else if (guests <= 80) {
        if (mapTerrace) mapTerrace.style.display = 'block';
      } else {
        if (mapMain) mapMain.style.display = 'block';
        if (mapTerrace) mapTerrace.style.display = 'block';
      }
    }

    /*───────────────── TIME FIELD FORMATTING ─────────────────*/
    function formatTimeInput(input) {
      let v = String(input.value || '').replace(/[^\d:]/g, '');
      if (!v) return;

      if (/^\d{1,2}$/.test(v)) {
        v = pad(v) + ':00';
      } else if (/^\d{1,2}:$/.test(v)) {
        v = pad(v.replace(':', '')) + ':00';
      } else if (/^\d{3,4}$/.test(v)) {
        v = v.padStart(4, '0').replace(/^(\d{2})(\d{2})$/, '$1:$2');
      }

      const match = v.match(/^(\d{1,2}):(\d{1,2})$/);
      if (!match) return;

      let hh = parseInt(match[1], 10);
      const isEndTime = input.id === 'end-time' || input.name === 'end-time';

      if (isEndTime) {
        if (hh === 0 || hh >= 24) {
          input.value = '00:00';
          return;
        }
        hh = Math.max(16, Math.min(23, hh));
        input.value = `${pad(hh)}:00`;
        return;
      }

      hh = Math.max(16, Math.min(23, hh));
      input.value = `${pad(hh)}:00`;
    }

    qsa('[ab-form="time"]', form).forEach(inp => {
      inp.addEventListener('blur', () => formatTimeInput(inp));
    });

    /*───────────────────── DATE PICKER SETUP ───────────────────*/
    let bookedDates = new Set();

    function refreshBookedDates() {
      bookedDates = new Set(
        qsa('[ab-form="date-booked"]')
          .map(el => (el.textContent || '').trim())
          .filter(Boolean)
      );
    }

    function checkDateAvailability() {
      if (!datePicked || !warningUnavailable) return;
      const parsed = parseDateValue(datePicked.value);
      const iso = parsed ? parsed.iso : '';
      warningUnavailable.style.display =
        iso && bookedDates.has(iso) ? 'block' : 'none';
    }

    refreshBookedDates();
    new MutationObserver(refreshBookedDates).observe(document.body, {
      childList: true,
      subtree: true
    });

    if (datePicked) {
      ['input', 'change', 'blur'].forEach(evt => {
        datePicked.addEventListener(evt, function () {
          checkDateAvailability();
          updateMinSpend();
        });
      });

      new MutationObserver(function () {
        checkDateAvailability();
        updateMinSpend();
      }).observe(datePicked, {
        attributes: true,
        attributeFilter: ['value']
      });

      let lastDateValue = datePicked.value;
      setInterval(function () {
        if (datePicked.value !== lastDateValue) {
          lastDateValue = datePicked.value;
          checkDateAvailability();
          updateMinSpend();
        }
      }, 400);
    }

    /*────────────────────── MIN SPEND ──────────────────────*/
    function updateMinSpend() {
      const parsedDate = datePicked ? parseDateValue(datePicked.value) : null;
      const guests = getGuestCount();

      if (!parsedDate || !guests) {
        if (minSpendInput) minSpendInput.value = '';
        if (minSpendField) minSpendField.textContent = '';
        if (minReached) minReached.style.display = 'none';
        if (minNotReached) minNotReached.style.display = 'none';
        return;
      }

      const monthStr = swedishMonths[parsedDate.month - 1];
      let baseMinSpend = 0;

      qsa('[ab-form="min-spend-list"] > *').forEach(item => {
        const monthEl = qs('[ab-form="min-spend-month"]', item);
        const amountEl = qs('[ab-form="min-spend"]', item);

        if (!monthEl || !amountEl) return;

        if (monthEl.textContent.trim().toLowerCase() === monthStr) {
          const num = parseFloat(
            amountEl.textContent.replace(/[^\d,.-]/g, '').replace(',', '.')
          );
          if (!isNaN(num)) baseMinSpend = num;
        }
      });

      let minSpend = baseMinSpend;
      if (guests <= 80) {
        minSpend = (baseMinSpend / 134) * guests;
      }

      if (minSpendInput) minSpendInput.value = minSpend.toFixed(2);
      if (minSpendField) {
        minSpendField.textContent = formatSEK(minSpend);
        minSpendField.setAttribute('data-raw', minSpend.toFixed(2));
      }

      /* if you later re-add visible total/minimum elements, this still supports them */
      const priceTotalEl = qs('[ab-form="price-est"]');
      const totalRaw = priceTotalEl ? parseFloat(priceTotalEl.getAttribute('data-raw') || '0') : 0;

      if (minReached && minNotReached) {
        if (totalRaw < minSpend) {
          minReached.style.display = 'none';
          minNotReached.style.display = 'inline';
        } else {
          minReached.style.display = 'inline';
          minNotReached.style.display = 'none';
        }
      }
    }

    /*─────────────────── GUEST INPUT HANDLERS ─────────────────*/
    guestInput.addEventListener('input', function (e) {
      const raw = e.target.value.replace(/\D/g, '');
      e.target.value = raw;
      updateGuestWarning();
      updateMaps();
      updateMinSpend();
    });

    guestInput.addEventListener('blur', function () {
      clampGuestInput();
      updateGuestWarning();
      updateMaps();
      updateMinSpend();
    });

    /*────────────────── INITIAL RUN ─────────────────*/
    updateGuestWarning();
    updateMaps();
    checkDateAvailability();
    updateMinSpend();
  })();
});
