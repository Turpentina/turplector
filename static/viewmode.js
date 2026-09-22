(function () {
    const CONDENSED_VIEW_KEY = "tcg_condensed_view";
    const SETS_PER_ROW_KEY = "tcg_condensed_sets_per_row";
    // Sentinel for "however many booster sets currently exist"; also the default.
    const ALL_SETS_PER_ROW = "all";

    function isCondensedViewEnabled() {
        return localStorage.getItem(CONDENSED_VIEW_KEY) === "1";
    }

    function setCondensedViewEnabled(enabled) {
        localStorage.setItem(CONDENSED_VIEW_KEY, enabled ? "1" : "0");
    }

    function isAllSetsPerRow() {
        const raw = localStorage.getItem(SETS_PER_ROW_KEY);
        return raw === null || raw === ALL_SETS_PER_ROW;
    }

    // totalBoosterSets resolves the "all" sentinel and clamps stale numbers.
    function getSetsPerRow(totalBoosterSets) {
        const total = Number.isInteger(totalBoosterSets) && totalBoosterSets > 0 ? totalBoosterSets : null;

        if (isAllSetsPerRow()) {
            return total || 1;
        }

        const n = parseInt(localStorage.getItem(SETS_PER_ROW_KEY), 10);
        if (!Number.isInteger(n) || n <= 0) return total || 1;
        return total ? Math.min(n, total) : n;
    }

    function setSetsPerRow(value) {
        if (value === ALL_SETS_PER_ROW) {
            localStorage.setItem(SETS_PER_ROW_KEY, ALL_SETS_PER_ROW);
            return;
        }
        localStorage.setItem(SETS_PER_ROW_KEY, String(Math.max(1, Math.floor(value) || 1)));
    }

    window.tcgViewMode = {
        CONDENSED_VIEW_KEY, SETS_PER_ROW_KEY, ALL_SETS_PER_ROW,
        isCondensedViewEnabled, setCondensedViewEnabled,
        getSetsPerRow, setSetsPerRow, isAllSetsPerRow
    };
})();
