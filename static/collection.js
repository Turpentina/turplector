(function () {
    // Shared collected-card storage (script.js keeps its own copy for the main list).
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
