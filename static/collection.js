(function () {
    // Collected-card storage, shared by every page that needs to read or
    // change it (currently script.js keeps its own copy for the main list -
    // this module exists for the pages added afterward, e.g. card_group.js).
    //
    // Values are normally a positive integer (how many copies owned). Older
    // data stored `true` for a collected serial with no count - normalizeCount
    // treats that as 1 so old data keeps working without a migration step.
    const STORAGE_KEY = "tcg_collected";

    function getCollectedMap() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    }

    function normalizeCount(raw) {
        if (typeof raw === "number" && raw > 0) return Math.floor(raw);
        return raw ? 1 : 0;
    }

    function getCount(serial) {
        return normalizeCount(getCollectedMap()[serial]);
    }

    function isCollected(serial) {
        return getCount(serial) > 0;
    }

    function setCount(serial, count) {
        const collected = getCollectedMap();
        const n = Math.max(0, Math.floor(count) || 0);

        if (n > 0) {
            collected[serial] = n;
        } else {
            delete collected[serial];
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(collected));
        return n;
    }

    function incrementCount(serial, delta) {
        return setCount(serial, getCount(serial) + delta);
    }

    function toggleCollected(serial) {
        setCount(serial, isCollected(serial) ? 0 : 1);
    }

    window.tcgCollection = {
        STORAGE_KEY, getCollectedMap, normalizeCount, getCount, isCollected,
        setCount, incrementCount, toggleCollected
    };
})();
