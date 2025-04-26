/* -------------------------------------------------------------
 * Booking form logic – 27 Apr 2025  (stable, cdn-safe)
 * ------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {

(function(){
    if(!document.querySelector('[ab-form="guests"]')) return; // abort if form not present

    /*────────────────────── DOM CACHE ─────────────────────*/
    const qs  = s => document.querySelector(s);
    const qsa = s => [...document.querySelectorAll(s)];

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

    /*─────────────────── INITIAL VISUAL STATE ───────────────────*/
    if(guestWarning)       guestWarning.style.display       = 'none';
    if(warningUnavailable) warningUnavailable.style.display = 'none';
    if(mapMain)            mapMain.style.display            = 'none';
    if(mapTerrace)         mapTerrace.style.display         = 'none';

    /*───────────────────── CONSTANT LIMITS ─────────────────────*/
    if(welcomeInput){ welcomeInput.min = 0; }
    if(packageInput){ packageInput.min = 0; packageInput.max = 5; }

    /*─────────────────────── UTILITIES ─────────────────────────*/
    const formatSEK = v => v.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2});

    /*───────────────── TIME FIELD FORMATTING ─────────────────*/
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

    /*─────────────────── GUEST INPUT HANDLERS ─────────────────*/
    guestInput.addEventListener('input', e=>{
        const raw=e.target.value.replace(/\D/g,'');
        e.target.value=raw;
        guestWarning.style.display = (raw!=='' && parseInt(raw,10)>48)?'block':'none';
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
    /* ------------- only code in this block changed ------------- */

    /* keep strictly "YYYY-MM-DD" by stripping everything but digits + dash */
    const clean = str => str ? str.replace(/[^\d-]/g,'') : '';

    let bookedDates = new Set();
    const refreshBookedDates = ()=>{
        bookedDates = new Set(
            qsa('[ab-form="date-booked"]')
              .map(el => clean(el.textContent.trim()))
              .filter(Boolean)
        );
    };
    refreshBookedDates();
    new MutationObserver(refreshBookedDates)
        .observe(document.body,{childList:true,subtree:true});

    const checkDate = () => {
        if(!datePicked) return;
        const val = clean(datePicked.value);
        if(warningUnavailable)
            warningUnavailable.style.display = (val && bookedDates.has(val)) ? 'block':'none';
        updatePriceEstimate();
    };

    if(datePicked){
        ['input','change'].forEach(evt=>datePicked.addEventListener(evt,checkDate));
        new MutationObserver(checkDate)
          .observe(datePicked,{attributes:true,attributeFilter:['value']});
        let last=datePicked.value;
        setInterval(()=>{ if(datePicked.value!==last){ last=datePicked.value; checkDate(); } },400);
        checkDate();
    }

    /*────────────────────── MAIN CALCULATOR ───────────────────*/
    /* (entire remainder of script unchanged) */
    function updatePriceEstimate(){
        const guestCount = parseInt(guestInput.value||'0',10)||1;

        /* dynamic max for welcome-drink */
        if(welcomeInput){ const maxQty=guestCount*2; welcomeInput.max=maxQty; if(parseInt(welcomeInput.value||'0',10)>maxQty) welcomeInput.value=maxQty; }

        let total=0;

        /* 1. any input with ab-est="true" */
        qsa('input[ab-est="true"]').forEach(inp=>{
            const qty=parseFloat(inp.value||'0'); const price=parseFloat(inp.getAttribute('ab-price')||'0');
            if(!isNaN(qty)&&!isNaN(price)) total += qty*price;
        });

        /* 2. connector radios (generic) */
        qsa('input[type="radio"][ab-price-connect]').forEach(trigger=>{
            if(!trigger.checked) return;
            const units=parseFloat(trigger.getAttribute('ab-units')||'0')||1;
            const multiplier=units*guestCount;
            const addGroup = grpName => {
                const sel=qs(`input[type="radio"][name="${grpName}"]:checked`);
                if(!sel) return 0;
                const p=parseFloat(sel.getAttribute('ab-price')||'0');
                const d=parseFloat(sel.getAttribute('ab-discount')||'0');
                let sub=p*multiplier; if(!isNaN(d)&&d>0) sub*=(1-d/100); return sub;
            };
            total += addGroup(trigger.getAttribute('ab-price-connect'));
            const g2=trigger.getAttribute('ab-price-connect-2'); if(g2) total += addGroup(g2);
        });

        /* 3. welcome-drink */
        if(welcomeInput){
            const qty=parseInt(welcomeInput.value||'0',10);
            const r=qs('input[type="radio"][name="welcome-drink-choice"]:checked');
            if(r&&qty>0){
                const p=parseFloat(r.getAttribute('ab-price')||'0');
                const d=parseFloat(r.getAttribute('ab-discount')||'0');
                let sub=qty*p; if(!isNaN(d)&&d>0) sub*=(1-d/100); total+=sub;
            }
        }

        /* 4. drink-package */
        if(packageInput){
            const pq=parseInt(packageInput.value||'0',10);
            if(pq>0){
                const calcWine = name => {
                    const w=qs(`input[type="radio"][name="${name}"]:checked`);
                    if(!w) return 0;
                    const p=parseFloat(w.getAttribute('ab-price')||'0');
                    const d=parseFloat(w.getAttribute('ab-discount')||'0');
                    let sub=p; if(!isNaN(d)&&d>0) sub*=(1-d/100); return sub;
                };
                const perGuest = calcWine('wine') + calcWine('wine-2');
                if(perGuest>0) total += pq*guestCount*perGuest;
            }
        }

        /* 5. outputs */
        priceOutEls.forEach(el=>{ el.textContent = formatSEK(total); el.setAttribute('data-raw', total.toFixed(2)); });
        if(priceInputHidden) priceInputHidden.value = total.toFixed(2);
        if(momsField) momsField.textContent = formatSEK(total*0.25);

        /* 6. min-spend calculation */
        if(minSpendField && datePicked.value){
            const monthStr = new Date(datePicked.value).toLocaleString('sv-SE',{month:'long'}).toLowerCase();
            let ms=0;
            qsa('[ab-form="min-spend-list"]>*').forEach(it=>{
                const m=it.querySelector('[ab-form="min-spend-month"]');
                const a=it.querySelector('[ab-form="min-spend"]');
                if(m&&a&&m.textContent.trim().toLowerCase()===monthStr){
                    const num=parseFloat(a.textContent.replace(/[^\d,.-]/g,'').replace(',','.')); if(!isNaN(num)) ms=num;
                }
            });
            if(guestCount<=80) ms = (ms/134)*guestCount;
            minSpendField.textContent = formatSEK(ms);
            minSpendField.setAttribute('data-raw', ms.toFixed(2));

            /* reached? */
            const r=qs('[ab-form="min-reached"]');
            const n=qs('[ab-form="min-not-reached"]');
            if(r&&n){
                if(total < ms){ r.style.display='none'; n.style.display='inline'; }
                else           { r.style.display='inline'; n.style.display='none'; }
            }
        }

        /* 7. map logic */
        if(mapMain)    mapMain.style.display = 'none';
        if(mapTerrace) mapTerrace.style.display = 'none';
        const gVal=guestInput.value.trim(); const gNum=parseInt(gVal,10);
        if(gVal!=='' && !isNaN(gNum)){
            if(gNum<=47){ if(mapMain) mapMain.style.display='block'; }
            else if(gNum<=80){ if(mapTerrace) mapTerrace.style.display='block'; }
            else { if(mapMain) mapMain.style.display='block'; if(mapTerrace) mapTerrace.style.display='block'; }
        }
    }

    /*────────────────── GLOBAL EVENT HOOKS ─────────────────*/
    qsa('input[ab-est="true"], input[type="radio"][ab-price-connect], input[type="radio"][ab-price-connect-2], input[name="welcome-drink"], input[name="drink-package"]').forEach(el=>{
        ['input','change'].forEach(evt=>el.addEventListener(evt, updatePriceEstimate));
    });

    /* fire once on load */
    updatePriceEstimate();
})();

});
