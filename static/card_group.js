// Every non-starter printing of one card number (e.g. "C001"), as a plain
// grid. Opened from the condensed view; never touches the sidebar's filters.

function baseCardNumber(serial) {
    // "GCG04B-A048(2)" -> "A048"
    const afterDash = serial.split("-")[1] || "";
    return afterDash.replace(/\(\d+\)$/, "");
}

function isStarterSerial(serial) {
    return serial.split("-")[0].endsWith("S");
}

function updateGroupCount(cardList) {
    const collectedMap = window.tcgCollection.getCollectedMap();
    const collectedCount = cardList.filter(
        c => window.tcgCollection.normalizeCount(collectedMap[c.serial]) > 0
    ).length;
    const percent = cardList.length > 0 ? ((collectedCount / cardList.length) * 100).toFixed(1) : "0.0";
    document.getElementById("cardCount").textContent =
        `Showing ${cardList.length} cards — Collected ${collectedCount} (${percent}%)`;
}

// Same tile markup/behavior as script.js's renderCards; kept separate since
// this page has no filters or Check/Uncheck All to share.
function renderGroupGrid(cardList) {
    const gridEl = document.getElementById("cardGrid");
    gridEl.innerHTML = "";
    updateGroupCount(cardList);

    const showDuplicates = window.tcgDuplicates.isShowDuplicatesEnabled();
    const collectedMap = window.tcgCollection.getCollectedMap();

    cardList.forEach(card => {
        const cardEl = document.createElement("a");
        cardEl.className = "card";
        cardEl.href = `card.html?serial=${encodeURIComponent(card.serial)}`;

        const count = window.tcgCollection.normalizeCount(collectedMap[card.serial]);

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
                updateGroupCount(cardList);
            };

            counterEl.querySelector(".count-minus").addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                syncUI(window.tcgCollection.incrementCount(card.serial, -1));
            });

            counterEl.querySelector(".count-plus").addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                syncUI(window.tcgCollection.incrementCount(card.serial, 1));
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
                syncUI(window.tcgCollection.setCount(card.serial, parseInt(input.value, 10)));
            });
        } else {
            const badge = cardEl.querySelector(".collected-badge");
            badge.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.tcgCollection.toggleCollected(card.serial);
                badge.classList.toggle("active");
                updateGroupCount(cardList);
            });
        }

        gridEl.appendChild(cardEl);
    });
}

async function loadGroup() {
    const params = new URLSearchParams(window.location.search);
    const number = params.get("number");
    const titleEl = document.getElementById("groupTitle");

    if (!number) {
        titleEl.textContent = "No card specified";
        document.getElementById("cardCount").textContent = "";
        return;
    }

    try {
        const response = await fetch("static/cards.json");
        const cards = await response.json();

        const matches = cards.filter(card =>
            !isStarterSerial(card.serial) && baseCardNumber(card.serial) === number
        );

        matches.sort((a, b) => {
            const setA = a.serial.split("-")[0];
            const setB = b.serial.split("-")[0];
            if (setA !== setB) return setA.localeCompare(setB, undefined, { numeric: true });
            return (a.rarity || 0) - (b.rarity || 0);
        });

        titleEl.textContent = matches.length
            ? `${matches[0].name_en} (${number})`
            : `No cards found for ${number}`;

        renderGroupGrid(matches);
    } catch (err) {
        console.error("Failed to load cards:", err);
        titleEl.textContent = "Error loading cards";
    }
}

loadGroup();
