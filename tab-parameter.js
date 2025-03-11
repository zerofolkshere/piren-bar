document.addEventListener("DOMContentLoaded", function () {
    function activateTab() {
        const params = new URLSearchParams(window.location.search);
        const tabName = params.get("tab");

        if (tabName) {
            // Select the correct tab link by the custom 'tab' attribute
            const targetTab = document.querySelector(`[tab="${tabName}"]`);

            if (targetTab) {
                targetTab.click(); // Simulate a click to activate the tab
            }
        }
    }

    // Delay execution to ensure Webflow's tabs are initialized
    setTimeout(activateTab, 100);
});
