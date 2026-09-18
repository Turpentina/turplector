let cards = [];
const cardGrid = document.getElementById("cardGrid");
const searchInput = document.getElementById("searchInput");
const setFilter = document.getElementById("setFilter");
const categoryFilter = document.getElementById("categoryFilter");
const subcategoryFilter = document.getElementById("subcategoryFilter");
const rarityFilter = document.getElementById("rarityFilter");
const collectionFilter = document.getElementById("collectionFilter");
const applyFiltersBtn = document.getElementById("applyFilters");
const toggleBtn = document.getElementById("sidebarToggle");
const sidebar = document.getElementById("sidebar");
const sortMode = document.getElementById("sortMode");

const LIST_STATE_KEY = "tcg_list_filters";


const TYPE_ORDER = [
    "Character",
    "Equipment",
    "Support",
    "Event",
    "Summon",
    "Skill",
    "Status",
    "None"
];

const SUBTYPE_ORDER = {
    Equipment: ["Weapon", "Artifact", "Talent", "Technique"],
    Support: ["Companion", "Location", "Item"],
    Event: ["Arcane Legend", "Elemental Resonance", "Food"],
    Skill: ["Elemental Skill", "Elemental Burst"]
};

// Sidebar toggle for mobile
toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
});

// Capture phase so this runs before the click reaches its target (e.g. a
// card), letting us swallow the click instead of letting it act as well.
document.addEventListener("click", (e) => {
    if (
        sidebar.classList.contains("open") &&
        !sidebar.contains(e.target) &&
        e.target !== toggleBtn
    ) {
        sidebar.classList.remove("open");
        e.preventDefault();
        e.stopPropagation();
    }
}, true);

// local storage for collected cards
//
// Values are normally a positive integer (how many copies owned). Older data
// stored `true` for a collected serial with no count — normalizeCount treats
// that as 1 so old data keeps working without a migration step.

const STORAGE_KEY = "tcg_collected";
const SHOW_DUPLICATES_KEY = "tcg_show_duplicates";

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

function showDuplicatesEnabled() {
    return localStorage.getItem(SHOW_DUPLICATES_KEY) === "1";
}

// load cards from json (full list for filter options; grid only after Apply or restore)
async function loadCards() {
    try {
        const response = await fetch("static/cards.json"); // serve JSON statically
        cards = await response.json();

        populateSetFilter(cards);
        populateCategoryFilter(cards);
        populateRarityFilter(cards);

        if (restoreListStateFromStorage()) {
            applyFilters();
        } else {
            subcategoryFilter.disabled = true;
            renderCards([]);
            cardCountEl.textContent =
                "Set filters and click Apply filters to load cards.";
        }
    } catch (err) {
        console.error("Failed to load cards:", err);
    }
}

function restoreListStateFromStorage() {
    let saved;
    try {
        saved = JSON.parse(sessionStorage.getItem(LIST_STATE_KEY) || "null");
    } catch {
        return false;
    }
    if (!saved || typeof saved !== "object") return false;

    searchInput.value = saved.search ?? "";
    setFilter.value = saved.set ?? "";
    categoryFilter.value = saved.category ?? "";
    updateSubcategoryOptions();
    subcategoryFilter.value = saved.subcategory ?? "";
    rarityFilter.value = saved.rarity ?? "";
    collectionFilter.value = saved.collection ?? "";
	sortMode.value = saved.sortMode ?? "set";
    return true;
}

function persistListState() {
	const state = {
		search: searchInput.value,
		set: setFilter.value,
		category: categoryFilter.value,
		subcategory: subcategoryFilter.value,
		rarity: rarityFilter.value,
		collection: collectionFilter.value,
		sortMode: sortMode.value
	};
    sessionStorage.setItem(LIST_STATE_KEY, JSON.stringify(state));
}

function sortByOrder(values, order) {
    return [...values].sort((a, b) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);

        if (ai === -1 && bi === -1) {
            return a.localeCompare(b);
        }
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });
}

function sortSetsDynamic(sets) {
    const setArray = Array.from(sets);

    return setArray.sort((a, b) => {
        const aEnd = a.slice(-1);
        const bEnd = b.slice(-1);

        const rank = x => {
            if (x === "B") return 0;   // B sets first
            if (x === "S") return 1;   // S sets second
            return 2;                   // everything else last
        };

        const aRank = rank(aEnd);
        const bRank = rank(bEnd);

        if (aRank !== bRank) return aRank - bRank;

        // tie-breaker: alphabetical
        return a.localeCompare(b);
    });
}

function getCardOrderKey(serial) {
    const match = serial.match(
        /^GCG\d+[A-Z]-([A-Z]+)(\d+)(?:\((\d+)\))?$/
    );

    if (!match) {
        return {
            num: Number.MAX_SAFE_INTEGER,
            typeRank: Number.MAX_SAFE_INTEGER,
            rarity: Number.MAX_SAFE_INTEGER
        };
    }

    const [, type, cardNum, rarity] = match;

    const typeRank = {
        C: 0,
        A: 1,
        T: 2,
		P: 3
    };

    return {
        num: parseInt(cardNum, 10),
        typeRank: typeRank[type],
        rarity: rarity ? parseInt(rarity, 10) : 0
    };
}

function sortCardsByCardOrder(cardList) {
    return [...cardList].sort((a, b) => {
        const ka = getCardOrderKey(a.serial);
        const kb = getCardOrderKey(b.serial);

        if (ka.typeRank !== kb.typeRank) {
            return ka.typeRank - kb.typeRank;
        }

        if (ka.num !== kb.num) {
            return ka.num - kb.num;
        }

        return ka.rarity - kb.rarity;
    });
}

function populateSetFilter(cards) {
    const sets = new Set(cards.map(c => c.serial.split("-")[0]));
    const sortedSets = sortSetsDynamic(sets);

    const boostersOption = document.createElement("option");
    boostersOption.value = "__ALL_BOOSTERS__";
    boostersOption.textContent = "All Booster Sets";
    boostersOption.selected = true;
    setFilter.appendChild(boostersOption);

    sortedSets.forEach(setCode => {
        const option = document.createElement("option");
        option.value = setCode;
        option.textContent = setCode === "GCG" ? "Promo" : setCode;
        setFilter.appendChild(option);
    });
}

function populateRarityFilter(cards) {
    const rarities = new Set(
        cards
            .map(c => c.rarity)
            .filter(r => r !== null && r !== undefined)
    );

    const sortedRarities = [...rarities].sort((a, b) => a - b);

    sortedRarities.forEach(rarity => {
        const option = document.createElement("option");
        option.value = String(rarity);
        option.textContent = rarity;
        rarityFilter.appendChild(option);
    });
}

function populateCategoryFilter(cards) {
    const categorys = new Set(cards.map(c => c.card_category));
    const sortedCategorys = sortByOrder(categorys, TYPE_ORDER);

    sortedCategorys.forEach(cardCategory => {
        const option = document.createElement("option");
        option.value = cardCategory;
        option.textContent = cardCategory;
        categoryFilter.appendChild(option);
    });
}

function updateSubcategoryOptions() {
    const selectedCategory = categoryFilter.value;
    const order = SUBTYPE_ORDER[selectedCategory] || [];

    // Reset
    subcategoryFilter.innerHTML = `<option value="">All Subcategories</option>`;

    if (!selectedCategory) {
        subcategoryFilter.disabled = true;
        return;
    }

    // Collect available subcategorys for this category
    const subcategorys = new Set();
    cards.forEach(card => {
        if (card.card_category === selectedCategory && card.card_subcategory) {
            subcategorys.add(card.card_subcategory);
        }
    });

    // Sort by predefined order
    const sortedSubcategorys = sortByOrder([...subcategorys], order);

    // Append to dropdown
    sortedSubcategorys.forEach(subcategory => {
        const opt = document.createElement("option");
        opt.value = subcategory;
        opt.textContent = subcategory;
        subcategoryFilter.appendChild(opt);
    });

    subcategoryFilter.disabled = sortedSubcategorys.length === 0;
}


const cardCountEl = document.getElementById("cardCount");

function updateCardCount(cardList) {
    const collectedCount = getCollectedCount(cardList);
    const percent =
        cardList.length > 0
            ? ((collectedCount / cardList.length) * 100).toFixed(1)
            : "0.0";

    cardCountEl.textContent =
        `Showing ${cardList.length} cards — Collected ${collectedCount} (${percent}%)`;
}

function renderCards(cardList) {
    cardGrid.innerHTML = "";
	updateCardCount(cardList);

    const showDuplicates = showDuplicatesEnabled();

    cardList.forEach(card => {
        const cardEl = document.createElement("a");
        cardEl.className = "card";
        cardEl.href = `card.html?serial=${encodeURIComponent(card.serial)}`;

        const count = getCount(card.serial);

        const badgeHtml = showDuplicates
            ? `<div class="collected-counter ${count > 0 ? "active" : ""}">
                   <button type="button" class="count-btn count-minus" aria-label="Decrease count">−</button>
                   <input type="number" class="count-input" min="0" step="1" value="${count}" aria-label="Copies owned">
                   <button type="button" class="count-btn count-plus" aria-label="Increase count">+</button>
               </div>`
            : `<div class="collected-badge ${count > 0 ? "active" : ""}" title="Mark as collected">✔</div>`;

        cardEl.innerHTML = `
            ${badgeHtml}
            <img src="${cardImageUrl(card.image)}" alt="${card.serial}">
            <div class="card-content">
                <div class="card-title">${card.serial}</div>
                <div>${card.name_en}</div>
            </div>
        `;

        if (showDuplicates) {
            const counterEl = cardEl.querySelector(".collected-counter");
            const input = counterEl.querySelector(".count-input");

            const applyCount = (n) => {
                const applied = setCount(card.serial, n);
                input.value = applied;
                counterEl.classList.toggle("active", applied > 0);
                updateCardCount(cardList);
            };

            counterEl.querySelector(".count-minus").addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                applyCount(getCount(card.serial) - 1);
            });

            counterEl.querySelector(".count-plus").addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                applyCount(getCount(card.serial) + 1);
            });

            input.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            input.addEventListener("mousedown", (e) => e.stopPropagation());
            input.addEventListener("keydown", (e) => {
                e.stopPropagation();
                if (e.key === "Enter") input.blur();
            });
            input.addEventListener("change", () => {
                applyCount(parseInt(input.value, 10));
            });
        } else {
            const badge = cardEl.querySelector(".collected-badge");
            badge.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                toggleCollected(card.serial);
                badge.classList.toggle("active");

                updateCardCount(cardList);
            });
        }

        cardGrid.appendChild(cardEl);
    });
}


// Combined filter: search input + set filter
function applyFilters() {
    const query = searchInput.value.toLowerCase();
    const selectedSet = setFilter.value;
    const selectedCategory = categoryFilter.value;
    const selectedSubcategory = subcategoryFilter.value;
    const selectedRarity = rarityFilter.value;
    const collectionMode = collectionFilter.value;
    const collectedMap = getCollectedMap();

    const filtered = cards.filter(card => {
        const matchesSearch = card.serial.toLowerCase().includes(query) ||
                              card.name_en.toLowerCase().includes(query)||
                              card.name_cn.includes(query)

        // Only match exact set prefix followed by dash
        const matchesSet =
            selectedSet === "" ||
            (selectedSet === "__ALL_BOOSTERS__"
                ? card.serial.split("-")[0].endsWith("B")
                : card.serial.startsWith(selectedSet + "-"));
        const matchesRarity = selectedRarity === "" || String(card.rarity) === selectedRarity;
        // Only match category filter
        const matchesCategory = selectedCategory === "" || card.card_category == selectedCategory;
        const matchesSubcategory = selectedSubcategory === "" || card.card_subcategory == selectedSubcategory;

        const isCollectedCard = normalizeCount(collectedMap[card.serial]) > 0;
        const matchesCollection =
            collectionMode === "" ||
            (collectionMode === "collected" && isCollectedCard) ||
            (collectionMode === "missing" && !isCollectedCard);

        return (
            matchesSearch &&
            matchesSet &&
            matchesCategory &&
            matchesSubcategory &&
            matchesRarity &&
            matchesCollection
        );
    });
	
	let sorted = filtered;

	if (sortMode.value === "card") {
		sorted = sortCardsByCardOrder(filtered);
	}
	
    persistListState();
    renderCards(sorted);
}

const toggleAllBtn = document.getElementById("toggleAllCollected");

toggleAllBtn.addEventListener("click", () => {
    const filteredCards = Array.from(cardGrid.children).map(cardEl => {
        const serial = cardEl.querySelector(".card-title").textContent;
        return serial;
    });

    const collectedMap = getCollectedMap();

    // Determine if we should mark all as collected or uncollected
    const allCollected = filteredCards.every(serial => normalizeCount(collectedMap[serial]) > 0);

    filteredCards.forEach(serial => {
        if (allCollected) {
            delete collectedMap[serial]; // unmark all
        } else if (normalizeCount(collectedMap[serial]) === 0) {
            collectedMap[serial] = 1; // mark as owned, without touching existing counts
        }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(collectedMap));

    // Re-render current filtered cards to update badges and count
    applyFilters();
});

// Count unique cards owned (at least 1 copy) from a given card list
function getCollectedCount(cardList) {
    const collectedMap = getCollectedMap();
    const collectedCount = cardList.filter(card => normalizeCount(collectedMap[card.serial]) > 0).length;
    return collectedCount;
}

// DOM elements for import/export buttons
const importBtn = document.getElementById("importCollected");
const importFileInput = document.getElementById("importCollectedFile");
const exportBtn = document.getElementById("exportCollected");

// Export collected cards to plain text. A card with more than 1 copy is
// written as "serial xN"; a single copy is just the serial, so files from
// before duplicate tracking existed stay identical in shape.
exportBtn.addEventListener("click", () => {
    const collectedMap = getCollectedMap();
    const serials = Object.keys(collectedMap).filter(serial => normalizeCount(collectedMap[serial]) > 0);
    if (serials.length === 0) {
        alert("No collected cards to export!");
        return;
    }

    const lines = serials.map(serial => {
        const count = normalizeCount(collectedMap[serial]);
        return count > 1 ? `${serial} x${count}` : serial;
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "collected_cards.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`Exported ${serials.length} collected cards.`);
});

// Import collected cards from plain text
importBtn.addEventListener("click", () => {
    importFileInput.click();
});

importFileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const lines = e.target.result.split("\n");

        const collectedMap = {};

        for (const line of lines) {
            const trimmed = line.trim();

            // ignore comments / headers
            if (!trimmed || trimmed.startsWith("#")) continue;

            // optional "serial xN" suffix for duplicate counts; a bare
            // serial (old export format) implies a single copy
            const match = trimmed.match(/^(.+?)\s+x(\d+)$/i);
            if (match) {
                collectedMap[match[1]] = Math.max(1, parseInt(match[2], 10));
            } else {
                collectedMap[trimmed] = 1;
            }
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(collectedMap));
        applyFilters();
    };

    reader.readAsText(file, "utf-8");
});


applyFiltersBtn.addEventListener("click", applyFilters);

searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        applyFilters();
    }
});

categoryFilter.addEventListener("change", () => {
    updateSubcategoryOptions();
    subcategoryFilter.value = "";
});

sortMode.addEventListener("change", applyFilters);

loadCards();
