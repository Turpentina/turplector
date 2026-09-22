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

const condensedViewEl = document.getElementById("condensedView");
const condensedSummaryEl = document.getElementById("condensedSummary");
const condensedSetsEl = document.getElementById("condensedSets");
const setsPerRowSelect = document.getElementById("setsPerRowSelect");
const condensedViewToggle = document.getElementById("condensedViewToggle");
const showDuplicatesToggle = document.getElementById("showDuplicatesToggle");

const LIST_STATE_KEY = "tcg_list_filters";

// Card objects currently on screen, kept in sync by renderCurrentView().
let lastFilteredCards = [];


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

// Capture phase: close before the click reaches its target.
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

// Local storage for collected cards. Values are a copy count; older data
// stored `true`, which normalizeCount treats as 1.
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

// Pristine "nothing loaded yet" state - used on first load and Reset Filters.
function renderNothingLoaded() {
    updateViewVisibility();
    lastFilteredCards = [];
    renderCards([]);
    const placeholder = "Set filters and click Apply filters to load cards.";
    cardCountEl.textContent = placeholder;
    condensedSetsEl.innerHTML = "";
    condensedSummaryEl.innerHTML = `<p class="condensed-empty">${placeholder}</p>`;
}

// load cards from json (full list for filter options; grid only after Apply or restore)
async function loadCards() {
    try {
        const response = await fetch("static/cards.json"); // serve JSON statically
        cards = await response.json();

        populateSetFilter(cards);
        populateCategoryFilter(cards);
        populateRarityFilter(cards);

        populateSetsPerRowSelect();

        if (restoreListStateFromStorage()) {
            applyFilters();
        } else {
            subcategoryFilter.disabled = true;
            renderNothingLoaded();
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

        // tie-breaker: numeric, so set 10+ still sorts after set 9
        return a.localeCompare(b, undefined, { numeric: true });
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

    const showDuplicates = window.tcgDuplicates.isShowDuplicatesEnabled();
    const collectedMap = getCollectedMap();

    cardList.forEach(card => {
        const cardEl = document.createElement("a");
        cardEl.className = "card";
        cardEl.href = `card.html?serial=${encodeURIComponent(card.serial)}`;

        const count = normalizeCount(collectedMap[card.serial]);

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

            const syncUI = (applied) => {
                input.value = applied;
                counterEl.classList.toggle("active", applied > 0);
                updateCardCount(cardList);
            };

            counterEl.querySelector(".count-minus").addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                syncUI(incrementCount(card.serial, -1));
            });

            counterEl.querySelector(".count-plus").addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                syncUI(incrementCount(card.serial, 1));
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
                syncUI(setCount(card.serial, parseInt(input.value, 10)));
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


// Condensed view: one table per booster set, one row per card number, one
// column per rarity, instead of a tile per rarity variant.

function updateViewVisibility() {
    const condensed = window.tcgViewMode.isCondensedViewEnabled();
    cardCountEl.style.display = condensed ? "none" : "";
    cardGrid.style.display = condensed ? "none" : "";
    // Stylesheet default is display:none, so this needs an explicit value.
    condensedViewEl.style.display = condensed ? "block" : "none";
}

// Renders the current view mode and keeps lastFilteredCards in sync.
function renderCurrentView(cardList) {
    lastFilteredCards = cardList;
    updateViewVisibility();
    if (window.tcgViewMode.isCondensedViewEnabled()) {
        renderCondensedView(cardList);
    } else {
        renderCards(cardList);
    }
}

function boosterBaseKey(serial) {
    return serial.replace(/\(\d+\)$/, "");
}

function isBoosterSerial(serial) {
    return serial.split("-")[0].endsWith("B");
}

// Every booster card, unfiltered, grouped by set code then card number.
function buildBoosterGroups() {
    const bySet = new Map();
    cards.forEach(card => {
        if (!isBoosterSerial(card.serial)) return;
        const setCode = card.serial.split("-")[0];
        const base = boosterBaseKey(card.serial);
        if (!bySet.has(setCode)) bySet.set(setCode, new Map());
        const setMap = bySet.get(setCode);
        if (!setMap.has(base)) {
            setMap.set(base, {
                base,
                name_en: card.name_en,
                name_cn: card.name_cn,
                card_category: card.card_category,
                variants: {}
            });
        }
        setMap.get(base).variants[card.rarity] = card;
    });
    return bySet;
}

function highestRarity(bySet) {
    let max = 1;
    bySet.forEach(setMap => setMap.forEach(group => {
        Object.keys(group.variants).forEach(r => { max = Math.max(max, parseInt(r, 10)); });
    }));
    return max;
}

// Rarity 3 art if it exists, else 2, else 1.
function representativeVariant(group) {
    for (const r of [3, 2, 1]) {
        if (group.variants[r]) return group.variants[r];
    }
    const any = Object.values(group.variants)[0];
    return any || null;
}

function buildCardRow(group, rarityCols, interactiveSerials) {
    const tr = document.createElement("tr");
    const rep = representativeVariant(group);
    // Identity link opens every non-starter printing of this card number
    // (card_group.html) without touching the sidebar's own filters.
    const numberMatch = group.base.match(/-([A-Z]+\d+)$/);
    const cardNumber = numberMatch ? numberMatch[1] : group.base;
    const groupHref = `card_group.html?number=${encodeURIComponent(cardNumber)}`;

    const thumbTd = document.createElement("td");
    thumbTd.className = "condensed-thumb";
    thumbTd.innerHTML = rep
        ? `<a href="${groupHref}"><img src="${cardImageUrl(rep.image)}" alt="${rep.serial}"></a>`
        : "";
    tr.appendChild(thumbTd);

    const nameTd = document.createElement("td");
    nameTd.className = "condensed-name";
    nameTd.innerHTML = `
        <a href="${groupHref}" class="condensed-cardnum">${cardNumber}</a>
        <div class="condensed-cardname">${group.name_en}</div>
    `;
    tr.appendChild(nameTd);

    const showDuplicates = window.tcgDuplicates.isShowDuplicatesEnabled();
    const collectedMap = getCollectedMap();

    for (let r = 1; r <= rarityCols; r++) {
        const variant = group.variants[r];
        const td = document.createElement("td");

        if (!variant || !interactiveSerials.has(variant.serial)) {
            td.className = "condensed-cell condensed-na";
            td.textContent = "—";
            tr.appendChild(td);
            continue;
        }

        td.className = "condensed-cell";
        const serial = variant.serial;
        const count = normalizeCount(collectedMap[serial]);

        if (showDuplicates) {
            td.innerHTML = `
                <div class="collected-counter condensed-counter ${count > 0 ? "active" : ""}">
                    <button type="button" class="count-btn count-minus" aria-label="Decrease count">−</button>
                    <input type="number" class="count-input" min="0" step="1" value="${count}" aria-label="Copies owned">
                    <button type="button" class="count-btn count-plus" aria-label="Increase count">+</button>
                </div>`;
            const counterEl = td.querySelector(".collected-counter");
            const input = counterEl.querySelector(".count-input");
            const syncUI = (applied) => {
                input.value = applied;
                counterEl.classList.toggle("active", applied > 0);
                refreshCondensedSummary();
            };
            counterEl.querySelector(".count-minus").addEventListener("click", () => syncUI(incrementCount(serial, -1)));
            counterEl.querySelector(".count-plus").addEventListener("click", () => syncUI(incrementCount(serial, 1)));
            input.addEventListener("click", (e) => e.stopPropagation());
            input.addEventListener("mousedown", (e) => e.stopPropagation());
            input.addEventListener("keydown", (e) => {
                e.stopPropagation();
                if (e.key === "Enter") input.blur();
            });
            input.addEventListener("change", () => syncUI(setCount(serial, parseInt(input.value, 10))));
        } else {
            td.innerHTML = `<div class="collected-badge condensed-badge ${count > 0 ? "active" : ""}" title="Mark as collected">✔</div>`;
            td.querySelector(".collected-badge").addEventListener("click", () => {
                toggleCollected(serial);
                td.querySelector(".collected-badge").classList.toggle("active");
                refreshCondensedSummary();
            });
        }

        tr.appendChild(td);
    }

    return tr;
}

function buildSetTable(setCode, groups, rarityCols, interactiveSerials) {
    const wrapper = document.createElement("div");
    wrapper.className = "condensed-set-block";

    const table = document.createElement("table");
    table.className = "condensed-table";

    const headRow = document.createElement("tr");
    const setTh = document.createElement("th");
    setTh.className = "condensed-set-header";
    setTh.colSpan = 2;
    setTh.textContent = setCode;
    headRow.appendChild(setTh);
    for (let r = 1; r <= rarityCols; r++) {
        const th = document.createElement("th");
        th.textContent = `R${r}`;
        headRow.appendChild(th);
    }
    const thead = document.createElement("thead");
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    groups.forEach(group => tbody.appendChild(buildCardRow(group, rarityCols, interactiveSerials)));
    table.appendChild(tbody);

    wrapper.appendChild(table);
    return wrapper;
}

// Lets a toggle refresh just the summary table, not every set's table.
let lastCondensedContext = null;

function renderCondensedSummary(cardList, boosterSetCodes, rarityCols) {
    const collectedMap = getCollectedMap();
    const bySetRarity = new Map();
    let overallTotal = 0, overallCollected = 0;

    cardList.forEach(card => {
        if (!isBoosterSerial(card.serial)) return;
        const setCode = card.serial.split("-")[0];
        const key = `${setCode}|${card.rarity}`;
        if (!bySetRarity.has(key)) bySetRarity.set(key, { total: 0, collected: 0 });
        const entry = bySetRarity.get(key);
        entry.total++;
        overallTotal++;
        if (normalizeCount(collectedMap[card.serial]) > 0) {
            entry.collected++;
            overallCollected++;
        }
    });

    let html = `<table class="condensed-summary-table"><thead><tr><th>Set</th>`;
    for (let r = 1; r <= rarityCols; r++) html += `<th>R${r}</th>`;
    html += `<th>Total</th></tr></thead><tbody>`;

    boosterSetCodes.forEach(setCode => {
        let rowTotal = 0, rowCollected = 0;
        let rowHtml = `<tr><th>${setCode}</th>`;
        for (let r = 1; r <= rarityCols; r++) {
            const entry = bySetRarity.get(`${setCode}|${r}`);
            if (!entry) {
                rowHtml += `<td class="condensed-na">—</td>`;
            } else {
                rowTotal += entry.total;
                rowCollected += entry.collected;
                rowHtml += `<td>${entry.collected}/${entry.total}</td>`;
            }
        }
        if (rowTotal === 0) return; // this set was entirely filtered out
        const rowPercent = ((rowCollected / rowTotal) * 100).toFixed(0);
        rowHtml += `<td>${rowCollected}/${rowTotal} (${rowPercent}%)</td></tr>`;
        html += rowHtml;
    });

    const overallPercent = overallTotal > 0 ? ((overallCollected / overallTotal) * 100).toFixed(1) : "0.0";
    html += `<tr class="condensed-summary-overall"><th>Overall</th>`;
    for (let r = 1; r <= rarityCols; r++) html += `<td></td>`;
    html += `<td>${overallCollected}/${overallTotal} (${overallPercent}%)</td></tr>`;
    html += `</tbody></table>`;

    condensedSummaryEl.innerHTML = overallTotal > 0
        ? html
        : `<p class="condensed-empty">No booster cards match the current filters.</p>`;
}

function refreshCondensedSummary() {
    if (!lastCondensedContext) return;
    const { cardList, boosterSetCodes, rarityCols } = lastCondensedContext;
    renderCondensedSummary(cardList, boosterSetCodes, rarityCols);
}

function renderCondensedView(cardList) {
    const interactiveSerials = new Set(cardList.map(c => c.serial));
    const bySet = buildBoosterGroups();
    const rarityCols = highestRarity(bySet);
    const boosterSetCodes = sortSetsDynamic(new Set(cards.map(c => c.serial.split("-")[0])))
        .filter(isBoosterSerial);

    lastCondensedContext = { cardList, boosterSetCodes, rarityCols };
    renderCondensedSummary(cardList, boosterSetCodes, rarityCols);

    condensedSetsEl.innerHTML = "";
    condensedSetsEl.style.setProperty("--sets-per-row", String(window.tcgViewMode.getSetsPerRow(boosterSetCodes.length)));

    let anySetShown = false;
    boosterSetCodes.forEach(setCode => {
        const setMap = bySet.get(setCode);
        if (!setMap) return;

        const groups = Array.from(setMap.values()).filter(g =>
            Object.values(g.variants).some(v => interactiveSerials.has(v.serial))
        );
        if (groups.length === 0) return;

        groups.sort((a, b) => {
            const ta = TYPE_ORDER.indexOf(a.card_category);
            const tb = TYPE_ORDER.indexOf(b.card_category);
            if (ta !== tb) return (ta === -1 ? 999 : ta) - (tb === -1 ? 999 : tb);
            return a.base.localeCompare(b.base, undefined, { numeric: true });
        });

        anySetShown = true;
        condensedSetsEl.appendChild(buildSetTable(setCode, groups, rarityCols, interactiveSerials));
    });

    if (!anySetShown) {
        condensedSetsEl.innerHTML = `<p class="condensed-empty">No booster cards match the current filters.</p>`;
    }
}

function populateSetsPerRowSelect() {
    const boosterCount = sortSetsDynamic(new Set(cards.map(c => c.serial.split("-")[0])))
        .filter(isBoosterSerial).length || 1;

    setsPerRowSelect.innerHTML = "";
    for (let n = 1; n <= boosterCount; n++) {
        const opt = document.createElement("option");
        opt.value = String(n);
        opt.textContent = String(n);
        setsPerRowSelect.appendChild(opt);
    }
    // Dedicated "All" option so it still means "every set" once more exist.
    if (boosterCount > 1) {
        const allOpt = document.createElement("option");
        allOpt.value = window.tcgViewMode.ALL_SETS_PER_ROW;
        allOpt.textContent = "All";
        setsPerRowSelect.appendChild(allOpt);
    }

    setsPerRowSelect.value = window.tcgViewMode.isAllSetsPerRow()
        ? window.tcgViewMode.ALL_SETS_PER_ROW
        : String(window.tcgViewMode.getSetsPerRow(boosterCount));
}

setsPerRowSelect.addEventListener("change", () => {
    const value = setsPerRowSelect.value === window.tcgViewMode.ALL_SETS_PER_ROW
        ? window.tcgViewMode.ALL_SETS_PER_ROW
        : parseInt(setsPerRowSelect.value, 10);
    window.tcgViewMode.setSetsPerRow(value);
    if (window.tcgViewMode.isCondensedViewEnabled()) {
        renderCondensedView(lastFilteredCards);
    }
});

// Display preferences take effect immediately.
condensedViewToggle.checked = window.tcgViewMode.isCondensedViewEnabled();
condensedViewToggle.addEventListener("change", () => {
    window.tcgViewMode.setCondensedViewEnabled(condensedViewToggle.checked);
    renderCurrentView(lastFilteredCards);
});

showDuplicatesToggle.checked = window.tcgDuplicates.isShowDuplicatesEnabled();
showDuplicatesToggle.addEventListener("change", () => {
    window.tcgDuplicates.setShowDuplicatesEnabled(showDuplicatesToggle.checked);
    renderCurrentView(lastFilteredCards);
});


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
    renderCurrentView(sorted);
}

const toggleAllBtn = document.getElementById("toggleAllCollected");

toggleAllBtn.addEventListener("click", () => {
    const visibleCards = lastFilteredCards;
    const collectedMap = getCollectedMap();

    const allCollected = visibleCards.every(card => normalizeCount(collectedMap[card.serial]) > 0);

    const confirmMessage = allCollected
        ? `Unmark all ${visibleCards.length} currently visible cards as collected?`
        : `Mark all ${visibleCards.length} currently visible cards as collected?`;
    if (!window.confirm(confirmMessage)) {
        return;
    }

    visibleCards.forEach(card => {
        if (allCollected) {
            delete collectedMap[card.serial]; // unmark all
        } else if (normalizeCount(collectedMap[card.serial]) === 0) {
            collectedMap[card.serial] = 1; // mark as owned, without touching existing counts
        }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(collectedMap));
    renderCurrentView(visibleCards);
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

// Export to plain text: "serial xN" for N>1 copies, else just the serial.
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

            // "serial xN" for duplicate counts, or a bare serial for 1 copy
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

const resetFiltersBtn = document.getElementById("resetFilters");

resetFiltersBtn.addEventListener("click", () => {
    searchInput.value = "";
    setFilter.value = "__ALL_BOOSTERS__";
    rarityFilter.value = "";
    categoryFilter.value = "";
    updateSubcategoryOptions(); // also disables it, since category is now blank
    subcategoryFilter.value = "";
    collectionFilter.value = "";
    sortMode.value = "set";

    sessionStorage.removeItem(LIST_STATE_KEY); // don't restore the cleared filters

    renderNothingLoaded();
});

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
