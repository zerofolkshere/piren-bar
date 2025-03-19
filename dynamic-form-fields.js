document.querySelectorAll('[data-cms-name]').forEach(input => {
    let cmsName = input.getAttribute('data-cms-name');
    if (cmsName) {
        input.setAttribute('name', cmsName.replace(/\s+/g, '-').toLowerCase()); // Format name
    }
});
