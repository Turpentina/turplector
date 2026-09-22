(function () {
    // Small "i" icon that shows a text popup on click - used to attach a short
    // explanation to a field or setting without taking up permanent space.
    // Click elsewhere (or on another icon) to close.
    function infoIcon(note) {
        return `<span class="info-icon" tabindex="0" role="button" aria-label="More info">i<span class="info-popup">${note}</span></span>`;
    }

    document.addEventListener("click", (e) => {
        const icon = e.target.closest(".info-icon");
        document.querySelectorAll(".info-icon.open").forEach((el) => {
            if (el !== icon) el.classList.remove("open");
        });
        if (icon) {
            icon.classList.toggle("open");
            e.stopPropagation();
        }
    });

    document.addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("info-icon")) {
            e.target.classList.toggle("open");
            e.preventDefault();
        }
    });

    window.tcgInfoPopup = { infoIcon };
})();
