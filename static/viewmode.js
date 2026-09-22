(function () {
    const CONDENSED_VIEW_KEY = "tcg_condensed_view";
    const SETS_PER_ROW_KEY = "tcg_condensed_sets_per_row";
    const DEFAULT_SETS_PER_ROW = 2;

    function isCondensedViewEnabled() {
        return localStorage.getItem(CONDENSED_VIEW_KEY) === "1";
    }

    function setCondensedViewEnabled(enabled) {
        localStorage.setItem(CONDENSED_VIEW_KEY, enabled ? "1" : "0");
    }

    function getSetsPerRow() {
        const n = parseInt(localStorage.getItem(SETS_PER_ROW_KEY), 10);
        return Number.isInteger(n) && n > 0 ? n : DEFAULT_SETS_PER_ROW;
    }

    function setSetsPerRow(n) {
        localStorage.setItem(SETS_PER_ROW_KEY, String(Math.max(1, Math.floor(n) || 1)));
    }

    window.tcgViewMode = {
        CONDENSED_VIEW_KEY, SETS_PER_ROW_KEY, DEFAULT_SETS_PER_ROW,
        isCondensedViewEnabled, setCondensedViewEnabled, getSetsPerRow, setSetsPerRow
    };
})();
