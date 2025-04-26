    $(document).ready(function () {
        $('[data-toggle="datepicker"]').datepicker({
            format: 'yyyy-mm-dd'
        });
        // Available date placeholders:
        // Year: yyyy
        // Month: mm
        // Day: dd
        if (window.innerWidth < 768) {
            $('[data-toggle="datepicker"]').attr('readonly', 'readonly')
        }
    });
