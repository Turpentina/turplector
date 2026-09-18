const themeGrid = document.getElementById("themeGrid");
const themeOptions = Array.from(themeGrid.querySelectorAll(".theme-option"));

function markSelected(themeId) {
    themeOptions.forEach(opt => {
        opt.classList.toggle("selected", opt.dataset.themeId === themeId);
    });
}

themeOptions.forEach(opt => {
    opt.addEventListener("click", () => {
        const themeId = opt.dataset.themeId;
        window.tcgTheme.setTheme(themeId);
        markSelected(themeId);
    });
});

markSelected(window.tcgTheme.getStoredTheme());

const showDuplicatesToggle = document.getElementById("showDuplicatesToggle");

showDuplicatesToggle.checked = window.tcgDuplicates.isShowDuplicatesEnabled();

showDuplicatesToggle.addEventListener("change", () => {
    window.tcgDuplicates.setShowDuplicatesEnabled(showDuplicatesToggle.checked);
});

const deleteSiteDataBtn = document.getElementById("deleteSiteDataBtn");

deleteSiteDataBtn.addEventListener("click", () => {
    const confirmed = confirm(
        "Delete all browser data for this site?\n\n" +
        "This permanently erases your collected cards, filters, and theme preference on this device. This cannot be undone."
    );
    if (!confirmed) return;

    localStorage.clear();
    window.location.href = "index.html";
});
