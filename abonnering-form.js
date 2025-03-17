document.addEventListener("DOMContentLoaded", function () {
    // Hide all warning divs on page load
    document.querySelectorAll('[warning]').forEach(div => {
        div.style.display = 'none';
    });

    // Time field validation
    document.querySelectorAll('[ab-form="time"]').forEach(input => {
        input.addEventListener('input', function (e) {
            let val = e.target.value.replace(/[^0-9:]/g, ''); // Remove invalid characters
            val = val.replace(/^([0-9]{2})([0-9]{2})$/, '$1:$2'); // Auto-add colon if needed
            
            let [hh, mm] = val.split(':');
            if (hh && mm) {
                hh = Math.max(16, Math.min(23, parseInt(hh))); // Restrict to 16:00 - 23:59
                mm = "00"; // Round down minutes
                val = `${hh.toString().padStart(2, '0')}:${mm}`;
            }
            e.target.value = val;
        });
    });

    // Guests field validation
    document.querySelector('[ab-form="guests"]').addEventListener('input', function (e) {
        let val = parseInt(e.target.value.replace(/\D/g, ''), 10) || 40;
        val = Math.max(40, Math.min(134, val));
        e.target.value = val;

        // Show guest capacity warning if over 48
        document.querySelector('[warning="guest-capacity"]').style.display = val > 48 ? 'block' : 'none';
    });

    // Date validation against booked dates
    const bookedDates = Array.from(document.querySelectorAll('[ab-form="date-booked"]')).map(el => el.textContent.trim());
    const datePicked = document.querySelector('[ab-form="date-picked"]');
    const warningUnavailable = document.querySelector('[warning="date-unavailable"]');
    
    datePicked.addEventListener('change', function () {
        if (bookedDates.includes(datePicked.value)) {
            warningUnavailable.style.display = 'block';
        }
    });

    datePicked.addEventListener('focus', function () {
        warningUnavailable.style.display = 'none';
    });
});
