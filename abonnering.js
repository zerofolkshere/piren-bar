/* -------------------------------------------------------------
 * Booking form logic – updated to avoid submit blocking
 * ------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {

(function(){
    /* abort if the form is not on the page */
    if(!document.querySelector('[ab-form="guests"]')) return;

    /*────────────────────── DOM CACHE ─────────────────────*/
    const qs  = s => document.querySelector(s);
    const qsa = s => [...document.querySelectorAll(s)];

    const guestInput         = qs('[ab-form="guests"]');
    const guestWarning       = qs('[warning="guest-capacity"]');
    const datePicked         = qs('[ab-form="date-picked"]');
    const warningUnavailable = qs('[warning="date-unavailable"]');

    const mapMain            = qs('[ab-form="map-main"]');
    const mapTerrace         = qs('[ab-form="map-terrace"]');

    const priceOutEls        = qsa('[ab-form="price-est"]');
    const priceInputHidden   = qs('[ab-form="price-input"]');
    const momsField          = qs('[ab-form="sum-moms"]');
    const minSpendField      = qs('[ab-form="sum-min-spend"]');
    const minSpendInput      = qs('[ab-form="input-min-spend"]');

    /*─────────────────── INITIAL VISUAL STATE ───────────────────*/
    if(guestWarning)       guestWarning.style.display       = 'none';
    if(warningUnavailable) warningUnavailable.style.display = 'none';
    if(mapMain)            mapMain.style.display            = 'none';
    if(mapTerrace)         mapTerrace.style.display         = 'none';

    /*─────────────────────── UTILITIES ─────────────────────────*/
    const formatSEK = v => v.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2});

    const pad = n => String(n).padStart(2, '0');

    const parseDateParts = value => {
        if(!value) return null;
        const v = String(value).trim();

        let m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if(m){
            return { year:+m[1], month:+m[2], day:+m[3] };
        }

        m = v.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
        if(m){
            return { year:+m[1], month:+m[2], day:+m[3] };
        }

        m = v.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if(m){
            return { year:+m[3], month:+m[2], day:+m[1] };
        }

        m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if(m){
            return { year:+m[3], month:+m[2], day:+m[1] };
        }

        const d = new Date(v);
        if(!isNaN(d.getTime())){
            return {
                year: d.getFullYear(),
                month: d.getMonth() + 1,
                day: d.getDate()
            };
        }

        return null;
    };

    const toIsoDate = value => {
        const p = parseDateParts(value);
        if(!p) return '';
        return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
    };

    const getMonthNameSv = value => {
        const p = parseDateParts(value);
        if(!p) return '';
        return new Date(p.year, p.month - 1, p.day)
            .toLocaleString('sv-SE',{month:'long'})
            .toLowerCase();
    };

    /*───────────────── TIME FIELD FORMATTING ─────────────────*/
    qsa('[ab-form="time"]').forEach(inp=>{
        inp.addEventListener('blur', e=>{
            let v=e.target.value.replace(/[^0-9:]/g,'');
            if(/^\d{2}$/.test(v)||/^\d{2}:$/.test(v)) v=v.replace(':','')+':00';
            v=v.replace(/^(\d{2})(\d{2})$/, '$1:$2');
            let [hh,mm]=v.split(':');
            if(hh&&mm){
                hh=Math.max(16,Math.min(23,parseInt(hh,10)));
                mm='00';
                v=String(hh).padStart(2,'0')+':'+mm;
            }
            e.target.value=v;
        });
    });

    /*─────────────────── GUEST INPUT HANDLERS ─────────────────*/
    guestInput.addEventListener('input', e=>{
        const raw=e.target.value.replace(/\D/g,'');
        e.target.value=raw;
        if(guestWarning){
            guestWarning.style.display = (raw!=='' && parseInt(raw,10)>48)?'block':'none';
        }
        updatePriceEstimate();
    });
    guestInput.addEventListener('blur', e=>{
        let v=parseInt(e.target.value,10);
        if(isNaN(v)) v=40;
        v=Math.max(40,Math.min(127,v));
        e.target.value=v;
        updatePriceEstimate();
    });

    /*───────────────────── DATE PICKER SETUP ───────────────────*/
    let bookedDates = new Set();
    const refreshBookedDates = ()=>{
        bookedDates = new Set(
            qsa('[ab-form="date-booked"]')
              .map(el => toIsoDate(el.textContent.trim()))
              .filter(Boolean)
        );
    };
    refreshBookedDates();
    new MutationObserver(refreshBookedDates)
        .observe(document.body,{childList:true,subtree:true});

    const checkDate = () => {
        if(!datePicked) return;
        const val = toIsoDate(datePicked.value);
        if(warningUnavailable){
            warningUnavailable.style.display = (val && bookedDates.has(val)) ? 'block':'none';
        }
        updatePriceEstimate();
    };

    if(datePicked){
        ['input','change','blur'].forEach(evt=>datePicked.addEventListener(evt,checkDate));
        new MutationObserver(checkDate)
          .observe(datePicked,{attributes:true,attributeFilter:['value']});
        let last=datePicked.value;
        setInterval(()=>{ if(datePicked.value!==last){ last=datePicked.value; checkDate(); } },400);
        checkDate();
    }

    /*────────────────────── MAIN CALCULATOR ───────────────────*/
    function updatePriceEstimate(){

        /* guests for general calculations */
        const guestCount = parseInt(guestInput.value||'0',10) || 1;
        let total = 0;

        /* 1. any input with ab-est="true" --------------------------------*/
        qsa('input[ab-est="true"]').forEach(inp=>{
            const qty   = parseFloat(inp.value||'0');
            const price = parseFloat(inp.getAttribute('ab-price')||'0');
            if(!isNaN(qty) && !isNaN(price)) total += qty * price;
        });

        /* 2. connector radios (generic) ---------------------------------*/
        qsa('input[type="radio"][ab-price-connect]').forEach(trigger=>{
            if(!trigger.checked) return;

            const units      = parseFloat(trigger.getAttribute('ab-units')||'0') || 1;
            const multiplier = units * guestCount;

            const addGroup = grpName => {
                const sel = qs(`input[type="radio"][name="${grpName}"]:checked`);
                if(!sel) return 0;
                const p = parseFloat(sel.getAttribute('ab-price')||'0');
                const d = parseFloat(sel.getAttribute('ab-discount')||'0');
                let sub = p * multiplier;
                if(!isNaN(d) && d>0) sub *= (1 - d/100);
                return sub;
            };

            total += addGroup(trigger.getAttribute('ab-price-connect'));

            const g2 = trigger.getAttribute('ab-price-connect-2');
            if(g2) total += addGroup(g2);
        });

        /* 3. output fields ----------------------------------------------*/
        priceOutEls.forEach(el=>{
            el.textContent = formatSEK(total);
            el.setAttribute('data-raw', total.toFixed(2));
        });
        if(priceInputHidden) priceInputHidden.value = total.toFixed(2);
        if(momsField) momsField.textContent = formatSEK(total * 0.25);

        /* 4. min-spend calculation --------------------------------------*/
        if(datePicked && datePicked.value){
            const monthStr = getMonthNameSv(datePicked.value);
            let ms = 0;

            qsa('[ab-form="min-spend-list"]>*').forEach(it=>{
                const m = it.querySelector('[ab-form="min-spend-month"]');
                const a = it.querySelector('[ab-form="min-spend"]');
                if(m && a && m.textContent.trim().toLowerCase() === monthStr){
                    const num = parseFloat(
                        a.textContent.replace(/[^\d,.-]/g,'').replace(',','.')
                    );
                    if(!isNaN(num)) ms = num;
                }
            });

            if(guestCount <= 80) ms = (ms / 134) * guestCount;

            /* fix submit blocking:
               always populate the required hidden input when it exists,
               even if the old visible sum-min-spend element is missing */
            if(minSpendField){
                minSpendField.textContent = formatSEK(ms);
                minSpendField.setAttribute('data-raw', ms.toFixed(2));
            }
            if(minSpendInput) minSpendInput.value = ms.toFixed(2);

            /* reached? */
            const r = qs('[ab-form="min-reached"]');
            const n = qs('[ab-form="min-not-reached"]');
            if(r && n){
                if(total < ms){ r.style.display='none';  n.style.display='inline'; }
                else          { r.style.display='inline'; n.style.display='none';  }
            }
        } else {
            /* avoid browser blocking if date has not been selected yet */
            if(minSpendInput) minSpendInput.value = '';
            if(minSpendField){
                minSpendField.textContent = '';
                minSpendField.removeAttribute('data-raw');
            }
        }

        /* 5. map logic ---------------------------------------------------*/
        if(mapMain)    mapMain.style.display = 'none';
        if(mapTerrace) mapTerrace.style.display = 'none';
        const gVal = guestInput.value.trim();
        const gNum = parseInt(gVal,10);
        if(gVal !== '' && !isNaN(gNum)){
            if(gNum <= 47){
                if(mapMain) mapMain.style.display = 'block';
            } else if(gNum <= 80){
                if(mapTerrace) mapTerrace.style.display = 'block';
            } else {
                if(mapMain)    mapMain.style.display = 'block';
                if(mapTerrace) mapTerrace.style.display = 'block';
            }
        }
    }

    /*────────────────── GLOBAL EVENT HOOKS ─────────────────*/
    /* master list of inputs that trigger recalculation */
    qsa(`
        input[ab-est="true"],
        input[type="radio"][ab-price-connect],
        input[type="radio"][ab-price-connect-2]
    `).forEach(el=>{
        ['input','change'].forEach(evt=>el.addEventListener(evt, updatePriceEstimate));
    });

    /* fire once on load */
    updatePriceEstimate();
})();

});
