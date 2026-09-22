async function loadCard() {
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

// Card text is only present for cards the wechat mini program had detail for.
const EXPERIMENTAL_NOTE_CN = "Experimental: this text may be auto-translated.";
const EXPERIMENTAL_NOTE_EN = "Experimental: this text is auto-translated.";

function descriptionTableRows(card) {
    if (!card.description_cn && !card.description_en) return "";
    const cn = card.description_cn
        ? `<tr><th>Card Text (Chinese) ${window.tcgInfoPopup.infoIcon(EXPERIMENTAL_NOTE_CN)}</th><td class="description-cell">${card.description_cn}</td></tr>`
        : "";
    const en = card.description_en
        ? `<tr><th>Card Text (English) ${window.tcgInfoPopup.infoIcon(EXPERIMENTAL_NOTE_EN)}</th><td class="description-cell">${card.description_en}</td></tr>`
        : "";
    return cn + en;
}

// Load card on page load
loadCard();
