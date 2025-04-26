/* -------------------------------------------------------------
 * Booking form logic – 27 Apr 2025  (stable, live-dates version)
 * ------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', ()=>{

(function(){
    if(!document.querySelector('[ab-form="guests"]')) return; // abort if form not present

    /*────────────────────── DOM CACHE ─────────────────────*/
    const qs  = s => document.querySelector(s);
    const qsa = s => [...document.querySelectorAll(s)];

    /* form pieces … (unchanged) */
    const guestInput         = qs('[ab-form="guests"]');
    const guestWarning       = qs('[warning="guest-capacity"]');
    const datePicked         = qs('[ab-form="date-picked"]');
    const warningUnavailable = qs('[warning="date-unavailable"]');
    const mapMain            = qs('[ab-form="map-main"]');
    const mapTerrace         = qs('[ab-form="map-terrace"]');
    const welcomeInput       = qs('input[name="welcome-drink"]');
    const packageInput       = qs('input[name="drink-package"]');
    const priceOutEls        = qsa('[ab-form="price-est"]');
    const priceInputHidden   = qs('[ab-form="price-input"]');
    const momsField          = qs('[ab-form="sum-moms"]');
    const minSpendField      = qs('[ab-form="sum-min-spend"]');

    /*───────────────────── VISUAL DEFAULTS ───────────────────*/
    if(guestWarning)       guestWarning.style.display       = 'none';
    if(warningUnavailable) warningUnavailable.style.display = 'none';
    if(mapMain)            mapMain.style.display            = 'none';
    if(mapTerrace)         mapTerrace.style.display         = 'none';

    /*────────────────────── LIMITS ───────────────────────────*/
    if(welcomeInput){ welcomeInput.min = 0; }
    if(packageInput){ packageInput.min = 0; packageInput.max = 5; }

    /*──────────────────── UTILITIES ──────────────────────────*/
    const formatSEK = v => v.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2});

    /*────────────────── TIME INPUT CLEAN-UP (unchanged) ─────*/
    qsa('[ab-form="time"]').forEach(inp=>{
        inp.addEventListener('blur', e=>{
            let v=e.target.value.replace(/[^0-9:]/g,'');
            if(/^\d{2}$/.test(v)||/^\d{2}:$/.test(v)) v=v.replace(':','')+':00';
            v=v.replace(/^(\d{2})(\d{2})$/, '$1:$2');
            let [hh,mm]=v.split(':');
            if(hh&&mm){ hh=Math.max(16,Math.min(23,parseInt(hh,10))); mm='00'; v=String(hh).padStart(2,'0')+':'+mm; }
            e.target.value=v;
        });
    });

    /*──────────────────── BOOKED-DATE SET ───────────────────*/
    let bookedDates = new Set();
    const refreshBookedDates = ()=>{
        bookedDates = new Set(qsa('[ab-form="date-booked"]').map(el=>el.textContent.trim()));
    };
    refreshBookedDates();

    /* keep it fresh – reacts to CMS elements injected later */
    new MutationObserver(refreshBookedDates).observe(document.body,{childList:true,subtree:true});

    const checkDate = ()=>{
        if(!datePicked) return;
        const val = datePicked.value.trim();
        if(warningUnavailable)
            warningUnavailable.style.display = (val && bookedDates.has(val)) ? 'block' : 'none';
        updatePriceEstimate();
    };

    /*───────────────── GUEST INPUT HANDLERS (unchanged) ─────*/
    guestInput.addEventListener('input', e=>{
        const raw=e.target.value.replace(/\D/g,'');
        e.target.value=raw;
        guestWarning.style.display = (raw && parseInt(raw,10)>48)?'block':'none';
        updatePriceEstimate();
    });
    guestInput.addEventListener('blur', e=>{
        let v=parseInt(e.target.value,10);
        if(isNaN(v)) v=40;
        v=Math.max(40,Math.min(127,v));
        e.target.value=v;
        updatePriceEstimate();
    });

    /* hook date field */
    if(datePicked){
        ['input','change'].forEach(evt=>datePicked.addEventListener(evt,checkDate));
        new MutationObserver(checkDate).observe(datePicked,{attributes:true,attributeFilter:['value']});
        let last=datePicked.value;
        setInterval(()=>{ if(datePicked.value!==last){ last=datePicked.value; checkDate(); } },400);
        checkDate();
    }

    /*──────────────────── MAIN CALCULATOR (unchanged) ───────*/
    function updatePriceEstimate(){
        const guestCount = parseInt(guestInput.value||'0',10)||1;

        /* dynamic max – welcome-drink */
        if(welcomeInput){
            const maxQty = guestCount*2;
            welcomeInput.max = maxQty;
            if(+welcomeInput.value > maxQty) welcomeInput.value = maxQty;
        }

        let total = 0;

        /* 1. generic qty×price fields */
        qsa('input[ab-est="true"]').forEach(inp=>{
            const qty   = +inp.value || 0;
            const price = +inp.getAttribute('ab-price') || 0;
            total += qty*price;
        });

        /* 2. connector radios … (unchanged) */
        qsa('input[type="radio"][ab-price-connect]').forEach(trigger=>{
            if(!trigger.checked) return;
            const units      = +trigger.getAttribute('ab-units') || 1;
            const multiplier = units*guestCount;

            const addGroup = grp =>{
                const sel = qs(`input[type="radio"][name="${grp}"]:checked`);
                if(!sel) return 0;
                const p = +sel.getAttribute('ab-price') || 0;
                const d = +sel.getAttribute('ab-discount') || 0;
                return (p * multiplier) * (d ? 1 - d/100 : 1);
            };

            total += addGroup(trigger.getAttribute('ab-price-connect'));
            const grp2 = trigger.getAttribute('ab-price-connect-2');
            if(grp2) total += addGroup(grp2);
        });

        /* 3. welcome-drink … (unchanged) */
        if(welcomeInput){
            const qty = +welcomeInput.value || 0;
            const r   = qs('input[type="radio"][name="welcome-drink-choice"]:checked');
            if(r && qty){
                const p = +r.getAttribute('ab-price') || 0;
                const d = +r.getAttribute('ab-discount') || 0;
                total += (qty*p) * (d ? 1 - d/100 : 1);
            }
        }

        /* 4. drink-package … (unchanged) */
        if(packageInput){
            const pq = +packageInput.value || 0;
            if(pq){
                const wine = name =>{
                    const w = qs(`input[type="radio"][name="${name}"]:checked`);
                    if(!w) return 0;
                    const p = +w.getAttribute('ab-price') || 0;
                    const d = +w.getAttribute('ab-discount') || 0;
                    return p * (d ? 1 - d/100 : 1);
                };
                const perGuest = wine('wine') + wine('wine-2');
                if(perGuest) total += pq*guestCount*perGuest;
            }
        }

        /* 5. outputs … (unchanged) */
        priceOutEls.forEach(el=>{
            el.textContent = formatSEK(total);
            el.dataset.raw = total.toFixed(2);
        });
        if(priceInputHidden) priceInputHidden.value = total.toFixed(2);
        if(momsField) momsField.textContent = formatSEK(total*0.25);

        /* 6. min-spend calc … (unchanged) */
        if(minSpendField && datePicked.value){
            const monthStr = new Date(datePicked.value)
                             .toLocaleString('sv-SE',{month:'long'})
                             .toLowerCase();
            let ms=0;
            qsa('[ab-form="min-spend-list"]>*').forEach(it=>{
                const m=it.querySelector('[ab-form="min-spend-month"]');
                const a=it.querySelector('[ab-form="min-spend"]');
                if(m&&a&&m.textContent.trim().toLowerCase()===monthStr){
                    const num=parseFloat(a.textContent.replace(/[^\d,.-]/g,'').replace(',','.'));
                    if(!isNaN(num)) ms=num;
                }
            });
            if(guestCount<=80) ms = (ms/134)*guestCount;
            minSpendField.textContent = formatSEK(ms);
            minSpendField.dataset.raw = ms.toFixed(2);

            const r = qs('[ab-form="min-reached"]');
            const n = qs('[ab-form="min-not-reached"]');
            if(r&&n){
                if(total < ms){ r.style.display='none'; n.style.display='inline'; }
                else           { r.style.display='inline'; n.style.display='none'; }
            }
        }

        /* 7. map logic … (unchanged) */
        if(mapMain)    mapMain.style.display = 'none';
        if(mapTerrace) mapTerrace.style.display = 'none';
        const g = +guestInput.value || 0;
        if(g){
            if(g<=47)        { if(mapMain)    mapMain.style.display='block'; }
            else if(g<=80)   { if(mapTerrace) mapTerrace.style.display='block'; }
            else             { if(mapMain)    mapMain.style.display='block';
                               if(mapTerrace) mapTerrace.style.display='block'; }
        }
    }

    /*──────────────── GLOBAL EVENT HOOKS ───────────────────*/
    qsa('input[ab-est="true"], input[type="radio"][ab-price-connect], '+
       'input[type="radio"][ab-price-connect-2], input[name="welcome-drink"], '+
       'input[name="drink-package"]').forEach(el=>{
        ['input','change'].forEach(evt=>el.addEventListener(evt, updatePriceEstimate));
    });

    /* kick things off */
    updatePriceEstimate();

})(); // IIFE end

}); // DOMContentLoaded end
