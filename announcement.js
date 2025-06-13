document.addEventListener("DOMContentLoaded", function () {
  const storageKey = "bannerClosed";

  // If already closed, abort and don't show the banner
  if (localStorage.getItem(storageKey) === "true") {
    const banner = document.querySelector('[banner="nav"]');
    if (banner) banner.style.display = "none";
    return;
  }

  // Wait for banner to become visible before attaching listener
  const interval = setInterval(() => {
    const banner = document.querySelector('[banner="nav"]');
    const closeBtn = document.querySelector('[banner="close"]');

    // Only proceed if both exist and banner is visible
    if (
      banner &&
      closeBtn &&
      getComputedStyle(banner).display !== "none"
    ) {
      clearInterval(interval); // Stop checking once found

      closeBtn.addEventListener("click", () => {
        banner.classList.add("closing"); // Trigger your animation
        setTimeout(() => {
          banner.style.display = "none";
          localStorage.setItem(storageKey, "true");
        }, 1000); // Wait for animation to finish
      });
    }
  }, 100); // Check every 100ms
});
