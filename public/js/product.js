// product.js
// Loads product details and variants, handles selection and add to cart

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const itemId = params.get('id');
    let isLoggedIn = false;
    if (!itemId) {
        document.getElementById('product-detail').innerHTML = '<p>Product not found.</p>';
        return;
    }
    // Check login status
    try {
        const resp = await fetch('/api/auth/status', { credentials: 'include' });
        const data = await resp.json();
        isLoggedIn = data.success && data.user;
    } catch (e) { isLoggedIn = false; }
    // Fetch item and variants
    const [item, variants] = await Promise.all([
        fetch(`/api/items/${itemId}`).then(r => r.json()),
        fetch(`/api/variants/item/${itemId}`).then(r => r.json())
    ]);
    if (!item) {
        document.getElementById('product-detail').innerHTML = '<p>Product not found.</p>';
        return;
    }
    // Build unique colour and size lists, filter out null/empty
    const colours = [...new Set(variants.map(v => v.colour).filter(c => c && c !== 'null' && c !== 'undefined'))];
    const sizes = [...new Set(variants.map(v => v.size).filter(s => s && s !== 'null' && s !== 'undefined'))];
    // Initial selection: prefer a globally persisted preferred colour if available
    let selectedColour = (function(){
        try { const pref = localStorage.getItem('preferredColour'); if (pref && colours.includes(pref)) return pref; } catch(e) {}
        return colours[0] || '';
    })();
    let selectedSize = sizes[0] || '';
    // Remember user-entered length and quantity so switching colour/size doesn't reset them
    let selectedQuantity = 1;
    let selectedLength = '';
    function getSelectedVariant() {
        return variants.find(v => v.colour === selectedColour && v.size === selectedSize);
    }
    function render() {
                const colourMap = {
                    "Dover White": "rgb(237,234,227)",
                    "Surfmist": "rgb(229,227,216)",
                    "Evening Haze": "rgb(193,184,167)",
                    "Classic Cream": "rgb(223,202,156)",
                    "Paperbark": "rgb(203,188,165)",
                    "Dune": "rgb(186,179,171)",
                    "Southerly": "rgb(210,209,203)",
                    "Shale Grey": "rgb(190,188,187)",
                    "Bluegum": "rgb(141,146,150)",
                    "Windspray": "rgb(142,149,149)",
                    "Gully": "rgb(119,115,107)",
                    "Jasper": "rgb(114,80,70)",
                    "Manor Red": "#5E1D0E",
                    "Wallaby": "rgb(108,103,99)",
                    "Basalt": "rgb(95,94,95)",
                    "Woodland Grey": "rgb(77,81,79)",
                    "Monument": "rgb(50,54,56)",
                    "Night Sky": "rgb(34,35,36)",
                    "Ironstone": "rgb(71,65,66)",
                    "Deep Ocean": "rgb(59,68,75)",
                    "Cottage Green": "rgb(62,84,78)",
                    "Pale Eucalypt": "rgb(104,126,107)"
                };
        const variant = getSelectedVariant();
        const swatchColour = colourMap[selectedColour] || '#fff';
        document.getElementById('product-detail').innerHTML = `
            <div class="product-detail-card">
                <h2>${item.name}</h2>
                <div style="display:flex;gap:24px;align-items:flex-start;">
                    <img id="product-image" src="images/${variant && variant.image ? variant.image : (item.image && item.image !== 'default.png' ? item.image : 'default.png')}" alt="${item.name}" style="max-width:300px;border-radius:8px;">
                    <div style="flex:1;">
                        <p>${item.description}</p>
                        <div class="product-detail-controls">
                            <div class="field-row">
                                <label>Colour:</label>
                                <div class="inline-control">
                                    <select id="colour-select">
                                        <option value="" disabled ${!selectedColour ? 'selected' : ''}>Select Colour</option>
                                        ${colours.map(c => `<option value="${c}" ${c===selectedColour?'selected':''}>${c}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="field-row swatch-row" style="margin-top:6px;">
                                <label></label>
                                <div class="inline-control">
                                    <div class="swatch-list">
                                        ${colours.map(c => `<div class="swatch ${c===selectedColour?'selected':''}" data-colour="${c}" title="${c}" style="background:${(colourMap[c]||'#fff')}"></div>`).join('')}
                                    </div>
                                </div>
                            </div>
                            <div class="field-row">
                                <label>Length (mm):</label>
                                <div class="inline-control">
                                    <input id="length-mm" type="number" placeholder="mm" min="1" style="width:140px;" required />
                                </div>
                            </div>
                            <div class="field-row">
                                <label>Size:</label>
                                <div class="inline-control">
                                    <select id="size-select">
                                        <option value="" disabled ${!selectedSize ? 'selected' : ''}>Select Size</option>
                                        ${sizes.map(s => `<option value="${s}" ${s===selectedSize?'selected':''}>${s}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="field-row">
                                <label>Quantity:</label>
                                <div class="inline-control">
                                    <select id="quantity-select">
                                        ${Array.from({length: 20}, (_, i) => `<option value="${i+1}">${i+1}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <div style="font-size:1.2em;">
                                <strong>Price:</strong> <span id="live-price">${variant ? variant.price.toFixed(2) : item.price ? item.price.toFixed(2) : '--'}</span>
                                <span id="price-note" style="font-size:0.95em; color:#555; margin-left:8px;">${item.unit ? item.unit : ''}</span>
                            </div>
                            <div>
                                <button id="add-to-cart-btn" ${!variant ? 'disabled' : ''} class="shop-item-add-btn">Add to Cart</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        // lightweight update that avoids replacing the whole DOM to prevent flashing
        function refreshVariantDisplay() {
            const currVariant = getSelectedVariant();
            const img = document.getElementById('product-image');
            if (img) img.src = `images/${currVariant && currVariant.image ? currVariant.image : (item.image && item.image !== 'default.png' ? item.image : 'default.png')}`;
            document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('selected', s.getAttribute('data-colour') === selectedColour));
            const colourSelect = document.getElementById('colour-select'); if (colourSelect) colourSelect.value = selectedColour;
            const sizeSelect = document.getElementById('size-select'); if (sizeSelect) sizeSelect.value = selectedSize;
            const qtySelect = document.getElementById('quantity-select'); if (qtySelect) qtySelect.value = selectedQuantity;
            const lengthInput = document.getElementById('length-mm'); if (lengthInput) lengthInput.value = selectedLength;
            updatePriceUI();
        }

        document.getElementById('colour-select').onchange = e => {
            selectedColour = e.target.value;
            refreshVariantDisplay();
        };
        // swatch click handlers
        document.querySelectorAll('.swatch').forEach(s => {
            s.onclick = function() {
                const c = this.getAttribute('data-colour');
                selectedColour = c;
                try { localStorage.setItem('preferredColour', c); } catch (e) {}
                refreshVariantDisplay();
            };
        });

        // Live price calculation helpers
        function formatCurrency(v) {
            return '$' + Number(v).toFixed(2);
        }

        function computePrice() {
            const v = getSelectedVariant();
            if (!v) return { perUnit: 0, total: 0 };
            const qty = parseInt(document.getElementById('quantity-select').value, 10) || 1;
            const lengthInput = document.getElementById('length-mm');
            const lengthMm = lengthInput ? parseFloat(lengthInput.value) || 0 : 0;
            // Assumption: variant.price is price per metre (or per item unit). We'll treat it as per metre if length provided.
            let perUnitPrice = v.price || 0;
            if (lengthMm > 0) {
                // convert mm to metres
                const meters = lengthMm / 1000;
                perUnitPrice = v.price * meters;
            }
            const total = perUnitPrice * qty;
            return { perUnit: perUnitPrice, total };
        }

        function updatePriceUI() {
            const priceSpan = document.getElementById('live-price');
            const note = document.getElementById('price-note');
            if (!priceSpan) return;
            const p = computePrice();
            priceSpan.textContent = formatCurrency(p.total);
            if (p.perUnit && p.total) {
                note.textContent = `(${formatCurrency(p.perUnit)} each)`;
            } else {
                note.textContent = '';
            }
            // enable add-to-cart only if variant exists and required fields present
            const addBtn = document.getElementById('add-to-cart-btn');
            const lengthVal = document.getElementById('length-mm') ? parseFloat(document.getElementById('length-mm').value) || 0 : 0;
            if (addBtn) {
                addBtn.disabled = !getSelectedVariant() || !selectedSize || lengthVal <= 0;
            }
        }

        // attach listeners for live updates
        // restore previously entered values so switching options doesn't wipe them
        const lengthInput = document.getElementById('length-mm');
        if (lengthInput) {
            lengthInput.value = selectedLength;
            lengthInput.addEventListener('input', function(e){ selectedLength = e.target.value; updatePriceUI(); });
        }
        const qtySelect = document.getElementById('quantity-select');
        if (qtySelect) {
            qtySelect.value = selectedQuantity;
            qtySelect.addEventListener('change', function(e){ selectedQuantity = parseInt(e.target.value,10) || 1; updatePriceUI(); });
        }
    const sizeSelect = document.getElementById('size-select');
    if (sizeSelect) sizeSelect.addEventListener('change', function(e){ selectedSize = e.target.value; refreshVariantDisplay(); });
        document.querySelectorAll('.swatch').forEach(s => s.addEventListener('click', updatePriceUI));

    // initial price update
    updatePriceUI();
        document.getElementById('add-to-cart-btn').onclick = () => {
            if (!variant) return;
            if (!isLoggedIn) {
                if (typeof showPopup === 'function') {
                    showPopup('Log in to add to cart');
                } else {
                    alert('Log in to add to cart');
                }
                return;
            }
            const qty = parseInt(document.getElementById('quantity-select').value, 10) || 1;
            const lengthMm = parseInt(document.getElementById('length-mm').value, 10) || 0;
            if (!lengthMm || lengthMm <= 0) {
                alert('Please enter length in mm.');
                return;
            }
            if (!selectedSize) {
                alert('Please select a size.');
                return;
            }
            fetch('/api/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: itemId, variant_id: variant.id, quantity: qty, length_mm: lengthMm, size: selectedSize })
            }).then(r => r.json()).then(data => {
                if (data.success) {
                    // Show a styled notification like the shop page
                    const btn = document.getElementById('add-to-cart-btn');
                    btn.textContent = 'Added!';
                    btn.disabled = true;
                    setTimeout(() => {
                        btn.textContent = 'Add to Cart';
                        btn.disabled = false;
                    }, 1200);
                } else {
                    alert('Could not add to cart.');
                }
            });
        };
    }
    render();
});
