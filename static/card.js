async function loadCard() {
    const pathParts = window.location.pathname.split("/");
    const serial = pathParts[pathParts.length - 1];
    if (!serial) {
        document.getElementById("cardDetail").innerHTML = "<p>No card specified</p>";
        return;
    }

    try {
        const res = await fetch(`/cards.json`);
        if (!res.ok) {
            document.getElementById("cardDetail").innerHTML = "<p>Card not found</p>";
            return;
        }
        
        const cards = await res.json();
        const card = cards.find(c => c.serial === serial);

        const detailDiv = document.getElementById("cardDetail");
        detailDiv.innerHTML = `
            <img src="https://raw.githubusercontent.com/Turpentina/turplector/main/backend/${card.image}" alt="${card.serial}">
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
                <tr><th>Wiki</th><td><a href="${card.wiki_url}" target="_blank">${card.name_en}</a></td></tr>
            </table>
        `;

    } catch (err) {
        console.error(err);
        document.getElementById("cardDetail").innerHTML = "<p>Error loading card</p>";
    }
}

// Load card on page load
loadCard();
