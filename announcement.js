(function () {
  const storageKey = "bannerClosed";

  // Function to handle the banner
  function handleBanner() {
    const banner = document.querySelector('[banner="nav"]');
    const closeBtn = document.querySelector('[banner="close"]');

    if (!banner || !closeBtn) return;

    // If already closed, hide it immediately
    if (localStorage.getItem(storageKey) === "true") {
      banner.style.display = "none";
      return;
    }

    // Avoid double-listening
    if (closeBtn.dataset.listenerAttached === "true") return;
    closeBtn.dataset.listenerAttached = "true";

    // Close logic
    closeBtn.addEventListener("click", () => {
      banner.classList.add("closing");
      setTimeout(() => {
        banner.style.display = "none";
        localStorage.setItem(storageKey, "true");
      }, 1000);
    });
  }

  // Initial try
  document.addEventListener("DOMContentLoaded", handleBanner);

  // Observe DOM changes in case it's injected later (e.g., Webflow page load)
  const observer = new MutationObserver(() => {
    handleBanner();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
