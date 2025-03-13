function getISOWeekNumber(date = new Date()) {
    const tempDate = new Date(date.getTime());
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - (tempDate.getUTCDay() || 7)); // Adjust to nearest Thursday
    const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
    return Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
}

document.addEventListener("DOMContentLoaded", () => {
    const weekElement = document.querySelector('[week="current"]');
    if (weekElement) {
        weekElement.textContent = getISOWeekNumber();
    }
});
