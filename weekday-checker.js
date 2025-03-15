document.addEventListener("DOMContentLoaded", function () {
    // Define weekdays in Swedish
    const weekdayMap = {
        "Monday": "Måndag",
        "Tuesday": "Tisdag",
        "Wednesday": "Onsdag",
        "Thursday": "Torsdag",
        "Friday": "Fredag",
        "Saturday": "Lördag",
        "Sunday": "Söndag"
    };

    // Get today's English weekday and convert it to Swedish
    const todayDate = new Date();
    const todayEnglish = todayDate.toLocaleDateString("en-US", { weekday: "long" }).trim();
    const todaySwedish = weekdayMap[todayEnglish] || todayEnglish;

    console.log(`Today's weekday in Swedish: "${todaySwedish}"`);

    // Determine if today is a weekend
    const isWeekend = (todayEnglish === "Saturday" || todayEnglish === "Sunday");
    const targetDay = isWeekend ? "Måndag" : todaySwedish; // Show Monday's lunch on weekends

    // Get the current week number
    const weekNumber = getWeekNumber(todayDate);

    // Update heading if it's the weekend
    const headingElement = document.querySelector('[lunch="heading"]');
    if (headingElement && isWeekend) {
        headingElement.textContent = `Lunch v${weekNumber}`;
    }

    // Select all CMS items
    const cmsItems = document.querySelectorAll('[lunch="item"]');
    if (cmsItems.length === 0) {
        console.warn("No CMS items found with lunch='item'.");
        return;
    }

    cmsItems.forEach(item => {
        const dayElement = item.querySelector('[lunch="day"]');

        if (!dayElement) {
            console.warn("Skipping item: No 'lunch=day' element found inside this CMS item.");
            return;
        }

        const itemDay = dayElement.textContent.replace(/\s+/g, ' ').trim();
        console.log(`Checking item: "${itemDay}" (Expected: "${targetDay}")`);

        if (itemDay !== targetDay) {
            console.log(`Hiding item: "${itemDay}" (Does not match "${targetDay}")`);
            item.style.display = "none";
        } else {
            console.log(`Showing item: "${itemDay}" (Matches "${targetDay}")`);
        }
    });

    // Function to get ISO week number
    function getWeekNumber(date) {
        const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = tempDate.getUTCDay() || 7;
        tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
        return Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7) + 1;
    }
});
