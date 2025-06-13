document.addEventListener("DOMContentLoaded", function () {
  const banner = document.querySelector('[banner="nav"]');
  const closeBtn = document.querySelector('[banner="close"]');
  const storageKey = "bannerClosed";

  // Hide if already closed
  if (localStorage.getItem(storageKey) === "true") {
    if (banner) banner.style.display = "none";
    return;
  }

  // Close button logic
  if (closeBtn && banner) {
    closeBtn.addEventListener("click", function () {
      // Trigger your CSS animation here if needed (e.g., adding a class)
      banner.classList.add("closing");

      // Wait 1 second to let animation play
      setTimeout(() => {
        banner.style.display = "none";
        localStorage.setItem(storageKey, "true");
      }, 1000);
    });
  }
});
