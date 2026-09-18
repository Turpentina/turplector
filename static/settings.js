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

const SHOW_DUPLICATES_KEY = "tcg_show_duplicates";
const showDuplicatesToggle = document.getElementById("showDuplicatesToggle");

showDuplicatesToggle.checked = localStorage.getItem(SHOW_DUPLICATES_KEY) === "1";

showDuplicatesToggle.addEventListener("change", () => {
    localStorage.setItem(SHOW_DUPLICATES_KEY, showDuplicatesToggle.checked ? "1" : "0");
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
