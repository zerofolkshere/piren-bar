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
    const todayEnglish = new Date().toLocaleDateString("en-US", { weekday: "long" }).trim();
    const todaySwedish = weekdayMap[todayEnglish] || todayEnglish;

    console.log(`Today's weekday in Swedish: "${todaySwedish}"`);

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
        console.log(`Checking item: "${itemDay}" (Expected: "${todaySwedish}")`);

        if (itemDay !== todaySwedish) {
            console.log(`Hiding item: "${itemDay}" (Does not match "${todaySwedish}")`);
            item.style.display = "none";
        } else {
            console.log(`Showing item: "${itemDay}" (Matches "${todaySwedish}")`);
        }
    });
});
