document.addEventListener("DOMContentLoaded", function () {
    function activateTab() {
        const params = new URLSearchParams(window.location.search);
        const tabName = params.get("tab");

        if (tabName) {
            // Select the tab link based on the custom 'tab' attribute
            const targetTab = document.querySelector(`[tab="${tabName}"]`);

            if (targetTab) {
                targetTab.click(); // Simulate a click to activate the tab

                // Ensure Webflow applies the correct active class
                document.querySelectorAll(".w-tab-link").forEach(tab => tab.classList.remove("w--current"));
                document.querySelectorAll(".w-tab-pane").forEach(pane => pane.classList.remove("w--current"));

                targetTab.classList.add("w--current");
                const targetPane = document.querySelector(`.w-tab-pane[tab="${tabName}"]`);
                if (targetPane) {
                    targetPane.classList.add("w--current");
                }
            }
        }
    }

    // Run activation immediately
    activateTab();
});
