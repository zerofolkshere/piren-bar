document.addEventListener("DOMContentLoaded", function () {
    // Hide all warning divs on page load
    document.querySelectorAll('[warning]').forEach(div => {
        div.style.display = 'none';
    });

    // Time field validation - only format after blur (losing focus)
    document.querySelectorAll('[ab-form="time"]').forEach(input => {
        input.addEventListener('blur', function (e) {
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

    // Guests field validation - allow full user input control
    const guestInput = document.querySelector('[ab-form="guests"]');
    const guestWarning = document.querySelector('[warning="guest-capacity"]');
    
    guestInput.addEventListener('input', function (e) {
        let val = e.target.value.replace(/\D/g, ''); // Remove non-numeric characters
        e.target.value = val; // Allow any number while typing

        // Show guest capacity warning if over 48 in real-time
        if (val !== "" && parseInt(val, 10) > 48) {
            guestWarning.style.display = 'block';
        } else {
            guestWarning.style.display = 'none';
        }
    });

    guestInput.addEventListener('blur', function (e) {
        let val = parseInt(e.target.value, 10);
        if (!isNaN(val)) {
            if (val > 134) val = 134;
            if (val < 40) val = 40;
            e.target.value = val;
        } else {
            e.target.value = "40"; // Default to minimum if empty
        }
    });

    // Date validation against booked dates
    const bookedDates = new Set(
        Array.from(document.querySelectorAll('[ab-form="date-booked"]')).map(el => el.textContent.trim())
    );
    const datePicked = document.querySelector('[ab-form="date-picked"]');
    const warningUnavailable = document.querySelector('[warning="date-unavailable"]');
    
    datePicked.addEventListener('input', function () {
        const pickedDate = datePicked.value.trim();
        if (bookedDates.has(pickedDate)) {
            warningUnavailable.style.display = 'block';
        } else {
            warningUnavailable.style.display = 'none';
        }
    });
});
