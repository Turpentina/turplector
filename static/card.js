async function loadCard() {
    
    // const pathParts = window.location.pathname.split("/");
    // const serial = pathParts[pathParts.length - 1];
    // Use query param instead of deep linking
    const params = new URLSearchParams(window.location.search);
    const serial = params.get("serial");
    if (!serial) {
        document.getElementById("cardDetail").innerHTML = "<p>No card specified</p>";
        return;
    }

    try {
        const res = await fetch(`static/cards.json`);
        if (!res.ok) {
            document.getElementById("cardDetail").innerHTML = "<p>Card not found</p>";
            return;
        }
        
        const cards = await res.json();
        const card = cards.find(c => c.serial === serial);

        const detailDiv = document.getElementById("cardDetail");
        const wikiCell =
            card.wiki_url && card.wiki_url !== "N/A"
                ? `<a href="${card.wiki_url}" target="_blank">${card.name_en}</a>`
                : "N/A";
        const descriptionRows = descriptionTableRows(card);
        detailDiv.innerHTML = `
            <img src="${cardImageUrl(card.image)}" alt="${card.serial}">
            <h1>${card.serial}</h1>
            <table class="card-info-table">
                <tr><th>Name (English)</th><td>${card.name_en}</td></tr>
                <tr><th>Name (Chinese)</th><td>${card.name_cn}</td></tr>
                <tr><th>Rarity</th><td>${card.rarity}</td></tr>
                <tr><th>Deck</th><td>${card.deck}</td></tr>
                <tr><th>Set</th><td>${card.set_number}</td></tr>
                <tr><th>Card Type</th><td>${card.card_type}</td></tr>
                <tr><th>Category</th><td>${card.card_category}</td></tr>
                <tr><th>Subcategory</th><td>${card.card_subcategory}</td></tr>
                <tr><th>Wiki</th><td>${wikiCell}</td></tr>
                ${descriptionRows}
            </table>
        `;

    } catch (err) {
        console.error(err);
        document.getElementById("cardDetail").innerHTML = "<p>Error loading card</p>";
    }
}

// Card text (rule text) is only present for cards the wechat mini program
// gave detail for; a handful of promos have none.
const EXPERIMENTAL_NOTE_CN = "Experimental: this text may be auto-translated.";
const EXPERIMENTAL_NOTE_EN = "Experimental: this text is auto-translated.";

function infoIcon(note) {
    return `<span class="info-icon" tabindex="0" role="button" aria-label="About this field">i<span class="info-popup">${note}</span></span>`;
}

function descriptionTableRows(card) {
    if (!card.description_cn && !card.description_en) return "";
    const cn = card.description_cn
        ? `<tr><th>Card Text (Chinese) ${infoIcon(EXPERIMENTAL_NOTE_CN)}</th><td class="description-cell">${card.description_cn}</td></tr>`
        : "";
    const en = card.description_en
        ? `<tr><th>Card Text (English) ${infoIcon(EXPERIMENTAL_NOTE_EN)}</th><td class="description-cell">${card.description_en}</td></tr>`
        : "";
    return cn + en;
}

// Info-icon popups: click to toggle, click elsewhere to close.
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

// Load card on page load
loadCard();
