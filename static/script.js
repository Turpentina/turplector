let cards = [];
const cardGrid = document.getElementById("cardGrid");
const searchInput = document.getElementById("searchInput");
const setFilter = document.getElementById("setFilter");
const categoryFilter = document.getElementById("categoryFilter");
const subcategoryFilter = document.getElementById("subcategoryFilter");
const rarityFilter = document.getElementById("rarityFilter");
const collectionFilter = document.getElementById("collectionFilter");


const TYPE_ORDER = [
    "Character",
    "Equipment",
    "Support",
    "Event",
    "Summon"
];

const SUBTYPE_ORDER = {
    Equipment: ["Weapon", "Artifact", "Talent"],
    Support: ["Companion", "Location", "Item"],
    Event: ["Food", "Elemental Resonance"]
};

// local storage for collected cards

const STORAGE_KEY = "tcg_collected";

function getCollectedMap() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}

function isCollected(serial) {
    const collected = getCollectedMap();
    return !!collected[serial];
}

function toggleCollected(serial) {
    const collected = getCollectedMap();

    if (collected[serial]) {
        delete collected[serial];
    } else {
        collected[serial] = true;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(collected));
}

// load cards from db 

//async function loadCards() {
//    subcategoryFilter.disabled = true;
//    try {
//        const response = await fetch("/cards");
//        cards = await response.json();
//
//        populateSetFilter(cards);
//        populateCategoryFilter(cards);
//        populateRarityFilter(cards);
//        renderCards(cards);
//    } catch (err) {
//        console.error("Failed to load cards:", err);
//    }
//}

// load cards from json
async function loadCards() {
    try {
        const response = await fetch("static/cards.json"); // serve JSON statically
        cards = await response.json();
        
        populateSetFilter(cards);
        populateCategoryFilter(cards);
        populateRarityFilter(cards);
        renderCards(cards);
    } catch (err) {
        console.error("Failed to load cards:", err);
    }
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

function populateSetFilter(cards) {
    const sets = new Set(cards.map(c => c.serial.split("-")[0]));
    const sortedSets = sortSetsDynamic(sets);

    sortedSets.forEach(setCode => {
        const option = document.createElement("option");
        option.value = setCode;
        option.textContent = setCode;
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

function renderCards(cardList) {
    cardGrid.innerHTML = "";
    const collectedCount = getCollectedCount(cardList);
    cardCountEl.textContent = `Showing ${cardList.length} cards — Collected ${collectedCount}`;

    cardList.forEach(card => {
        const cardEl = document.createElement("div");
        cardEl.className = "card";

        const collected = isCollected(card.serial);

        cardEl.innerHTML = `
            <div class="collected-badge ${collected ? "active" : ""}" title="Mark as collected">✔</div>
            <img src="https://raw.githubusercontent.com/Turpentina/turplector/main/backend/images/${card.image}" alt="${card.serial}">
            <div class="card-content">
                <div class="card-title">${card.serial}</div>
                <div>${card.name_en}</div>
            </div>
        `;

        // Click badge to toggle collection
        const badge = cardEl.querySelector(".collected-badge");
        badge.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent navigation
            toggleCollected(card.serial);
            badge.classList.toggle("active"); 
            // Update count for currently displayed cards
            const newCount = getCollectedCount(cardList);
            cardCountEl.textContent = `Showing ${cardList.length} cards — Collected ${newCount}`;
        });

        // Click anywhere else on card navigates to detail page
        cardEl.addEventListener("click", () => {
            window.location.href = `/turplector/card/${card.serial}`;
        });

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
        const matchesSet = selectedSet === "" || card.serial.startsWith(selectedSet + "-");
        const matchesRarity = selectedRarity === "" || String(card.rarity) === selectedRarity;
        // Only match category filter
        const matchesCategory = selectedCategory === "" || card.card_category == selectedCategory;
        const matchesSubcategory = selectedSubcategory === "" || card.card_subcategory == selectedSubcategory;

        const isCollectedCard = !!collectedMap[card.serial];
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
    renderCards(filtered);
}

const toggleAllBtn = document.getElementById("toggleAllCollected");

toggleAllBtn.addEventListener("click", () => {
    const filteredCards = Array.from(cardGrid.children).map(cardEl => {
        const serial = cardEl.querySelector(".card-title").textContent;
        return serial;
    });

    const collectedMap = getCollectedMap();

    // Determine if we should mark all as collected or uncollected
    const allCollected = filteredCards.every(serial => !!collectedMap[serial]);

    filteredCards.forEach(serial => {
        if (allCollected) {
            delete collectedMap[serial]; // unmark all
        } else {
            collectedMap[serial] = true; // mark all
        }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(collectedMap));

    // Re-render current filtered cards to update badges and count
    applyFilters();
});

// Count collected cards from a given card list
function getCollectedCount(cardList) {
    const collectedMap = getCollectedMap();
    const collectedCount = cardList.filter(card => collectedMap[card.serial]).length;
    return collectedCount;
}

// DOM elements for import/export buttons
const importBtn = document.getElementById("importCollected");
const importFileInput = document.getElementById("importCollectedFile");
const exportBtn = document.getElementById("exportCollected");

// Export collected cards to plain text
exportBtn.addEventListener("click", () => {
    const collectedMap = getCollectedMap();
    const serials = Object.keys(collectedMap);
    if (serials.length === 0) {
        alert("No collected cards to export!");
        return;
    }

    const blob = new Blob([serials.join("\n")], { type: "text/plain" });
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
        const content = e.target.result.split("\n").filter(Boolean);
        const collectedMap = getCollectedMap();
        content.forEach(serial => {
            collectedMap[serial.trim()] = true;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(collectedMap));
        applyFilters();
    };
    reader.readAsText(file, "utf-8");
});


searchInput.addEventListener("input", applyFilters);
setFilter.addEventListener("change", applyFilters);
rarityFilter.addEventListener("change", applyFilters);
categoryFilter.addEventListener("change", () => {
    updateSubcategoryOptions();
    subcategoryFilter.value = "";
    applyFilters();
});
subcategoryFilter.addEventListener("change", applyFilters);
collectionFilter.addEventListener("change", applyFilters);

loadCards();
