(function () {
    const SHOW_DUPLICATES_KEY = "tcg_show_duplicates";

    function isShowDuplicatesEnabled() {
        return localStorage.getItem(SHOW_DUPLICATES_KEY) === "1";
    }

    function setShowDuplicatesEnabled(enabled) {
        localStorage.setItem(SHOW_DUPLICATES_KEY, enabled ? "1" : "0");
    }

    window.tcgDuplicates = { SHOW_DUPLICATES_KEY, isShowDuplicatesEnabled, setShowDuplicatesEnabled };
})();
