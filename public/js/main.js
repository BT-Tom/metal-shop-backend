document.addEventListener('DOMContentLoaded', () => {
    // Cart page display
    const cartDiv = document.getElementById('cart-items');
    if (cartDiv) {
        function loadCart() {
            fetch('http://localhost:3000/api/cart', {
                credentials: 'include'
            })
            .then(res => res.json())
            .then(items => {
                if (!items || items.length === 0) {
                    cartDiv.innerHTML = '<p>Your cart is empty.</p>';
                    return;
                }
                cartDiv.innerHTML = items.map(item => {
                    // build custom data display (controller already parses JSON)
                    let customHtml = '';
                    if (item.custom_data) {
                        if (item.custom_data.size) customHtml += `<div class="cart-meta">Size: ${item.custom_data.size}</div>`;
                        if (item.custom_data.length_mm !== undefined && item.custom_data.length_mm !== null) customHtml += `<div class="cart-meta">Length: ${item.custom_data.length_mm} mm</div>`;
                        if (item.custom_data.variant_id) customHtml += `<div class="cart-meta">Variant ID: ${item.custom_data.variant_id}</div>`;
                        // include any other keys generically
                        Object.keys(item.custom_data).forEach(k => {
                            if (["size","length_mm","variant_id"].indexOf(k) === -1) {
                                // render image key specially (skip here - handled in thumbnail)
                                if (k === 'image') return;
                                customHtml += `<div class="cart-meta">${k}: ${item.custom_data[k]}</div>`;
                            }
                        });
                    }
                    const perUnit = (item.price !== undefined && item.price !== null) ? Number(item.price) : 0;
                    const total = (perUnit * item.quantity) || 0;

                    // Determine thumbnail source: prefer custom_data.image (data URL or filename), else item.image
                    let thumbSrc = null;
                    if (item.custom_data && item.custom_data.image) {
                        const imgVal = item.custom_data.image;
                        if (typeof imgVal === 'string' && imgVal.startsWith('data:')) {
                            thumbSrc = imgVal; // data URL
                        } else if (typeof imgVal === 'string') {
                            // assume a filename stored server-side
                            thumbSrc = `images/${imgVal}`;
                        }
                    } else if (item.image) {
                        thumbSrc = `images/${item.image}`;
                    } else {
                        thumbSrc = `images/default.png`;
                    }

                    // small colour swatch display if provided
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
                        "Pale Eucalypt": "rgb(104,126,107)",
                    };
                    let colourSwatchHtml = '';
                    if (item.custom_data && item.custom_data.colour) {
                        const name = item.custom_data.colour;
                        const bg = colourMap[name] || name || '#fff';
                        colourSwatchHtml = `<div style="display:inline-flex;align-items:center;gap:8px;vertical-align:middle;margin-left:8px;">
                            <div style="width:18px; height:18px; border-radius:50%; border:1px solid #ccc; background:${bg};" title="${name}"></div>
                            <div style="font-size:0.95em; color:#333;">${name}</div>
                        </div>`;
                    }

                    return `
                    <div class="cart-item">
                        <img src="${thumbSrc}" alt="${item.name}" class="cart-thumb" data-fullsrc="${thumbSrc}" />
                        <div style="display:inline-block; margin-left:12px; vertical-align:middle; max-width: calc(100% - 120px);">
                            <strong>${item.name}</strong>
                            <div>Quantity: ${item.quantity}${item.custom_data && item.custom_data.colour ? ' ' + colourSwatchHtml : ''}</div>
                            <div>Unit price: $${perUnit.toFixed(2)} ${item.unit ? `<span style="font-size:0.85em; color:#666;">(${item.unit})</span>` : ''}</div>
                            <div><strong>Total: $${total.toFixed(2)}</strong></div>
                            ${customHtml}
                        </div>
                        <div style="margin-left:auto; display:flex; align-items:flex-start; gap:8px;">
                          <button class="remove-cart-item-btn" data-id="${item.cart_id}">Remove</button>
                        </div>
                    </div>
                `;
                }).join('');
                // Add event listeners for remove buttons
                document.querySelectorAll('.remove-cart-item-btn').forEach(btn => {
                    btn.onclick = function() {
                        const cartId = this.getAttribute('data-id');
                        fetch('http://localhost:3000/api/cart/remove', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ cart_id: cartId })
                        })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                loadCart();
                            } else {
                                alert('Could not remove item from cart.');
                            }
                        });
                    };
                });

                // Add delegated click handler for thumbnail expansion (lightbox)
                document.querySelectorAll('.cart-thumb').forEach(img => {
                    img.onclick = function(e) {
                        const src = this.getAttribute('data-fullsrc') || this.src;
                        showCartImagePreview(src, item = null);
                    };
                });
            });
        }
        loadCart();
    }
    // Roofing & Wall Cladding
    const roofingDiv = document.getElementById('roofing-items');
    if (roofingDiv) {
        fetch('http://localhost:3000/api/items?category=roofing')
            .then(res => res.json())
            .then(items => {
                roofingDiv.innerHTML = items.map(item => {
                    let priceHtml = '';
                    if (item.priceRange) {
                        priceHtml = `$${item.priceRange.min.toFixed(2)} – $${item.priceRange.max.toFixed(2)}`;
                    } else {
                        priceHtml = `$${item.price.toFixed(2)}`;
                    }
                    return `
                    <div class="shop-item">
                        <img src="images/${item.image ? item.image : 'default.png'}" alt="${item.name}" class="shop-item-link" data-id="${item.id}" style="cursor:pointer;" />
                        <h3 class="shop-item-link" data-id="${item.id}" style="cursor:pointer;">${item.name}</h3>
                        <p>${item.description}</p>
                        <span class="price">${priceHtml} <span style='font-size:0.9em;'>${item.unit || 'EACH'}</span></span>
                    </div>
                    `;
                }).join('');
            });
    }

    // Architectural Systems
    const architecturalDiv = document.getElementById('architectural-items');
    if (architecturalDiv) {
        fetch('http://localhost:3000/api/items?category=architectural')
            .then(res => res.json())
            .then(items => {
                architecturalDiv.innerHTML = items.map(item => {
                    let priceHtml = '';
                    if (item.priceRange) {
                        priceHtml = `$${item.priceRange.min.toFixed(2)} – $${item.priceRange.max.toFixed(2)}`;
                    } else {
                        priceHtml = `$${item.price.toFixed(2)}`;
                    }
                    return `
                    <div class="shop-item">
                        <img src="images/${item.image ? item.image : 'default.png'}" alt="${item.name}" />
                        <h3>${item.name}</h3>
                        <p>${item.description}</p>
                        <span class="price">${priceHtml}</span>
                    </div>
                    `;
                }).join('');
            });
    }

    // Gutters & Accessories
    const gutterDiv = document.getElementById('gutter-items');
    if (gutterDiv) {
        fetch('http://localhost:3000/api/items?category=gutters')
            .then(res => res.json())
            .then(items => {
                gutterDiv.innerHTML = items.map(item => {
                    let priceHtml = '';
                    if (item.priceRange) {
                        priceHtml = `$${item.priceRange.min.toFixed(2)} – $${item.priceRange.max.toFixed(2)}`;
                    } else {
                        priceHtml = `$${item.price.toFixed(2)}`;
                    }
                    return `
                    <div class="shop-item">
                        <img src="images/${item.image ? item.image : 'default.png'}" alt="${item.name}" />
                        <h3>${item.name}</h3>
                        <p>${item.description}</p>
                        <span class="price">${priceHtml}</span>
                    </div>
                    `;
                }).join('');
            });
    }

    // Polycarbonate & Fibreglass
    const polyDiv = document.getElementById('poly-items');
    if (polyDiv) {
        fetch('http://localhost:3000/api/items?category=poly')
            .then(res => res.json())
            .then(items => {
                polyDiv.innerHTML = items.map(item => {
                    let priceHtml = '';
                    if (item.priceRange) {
                        priceHtml = `$${item.priceRange.min.toFixed(2)} – $${item.priceRange.max.toFixed(2)}`;
                    } else {
                        priceHtml = `$${item.price.toFixed(2)}`;
                    }
                    return `
                    <div class="shop-item">
                        <img src="images/${item.image ? item.image : 'default.png'}" alt="${item.name}" />
                        <h3>${item.name}</h3>
                        <p>${item.description}</p>
                        <span class="price">${priceHtml}</span>
                    </div>
                    `;
                }).join('');
            });
    }

    // Insulation
    const insulationDiv = document.getElementById('insulation-items');
    if (insulationDiv) {
        fetch('http://localhost:3000/api/items?category=insulation')
            .then(res => res.json())
            .then(items => {
                insulationDiv.innerHTML = items.map(item => {
                    let priceHtml = '';
                    if (item.priceRange) {
                        priceHtml = `$${item.priceRange.min.toFixed(2)} – $${item.priceRange.max.toFixed(2)}`;
                    } else {
                        priceHtml = `$${item.price.toFixed(2)}`;
                    }
                    return `
                    <div class="shop-item">
                        <img src="images/${item.image ? item.image : 'default.png'}" alt="${item.name}" />
                        <h3>${item.name}</h3>
                        <p>${item.description}</p>
                        <span class="price">${priceHtml}</span>
                    </div>
                    `;
                }).join('');
            });
    }

    // Fasteners & Fixings
    const fastenersDiv = document.getElementById('fasteners-items');
    if (fastenersDiv) {
        fetch('http://localhost:3000/api/items?category=fasteners')
            .then(res => res.json())
            .then(items => {
                fastenersDiv.innerHTML = items.map(item => {
                    let priceHtml = '';
                    if (item.priceRange) {
                        priceHtml = `$${item.priceRange.min.toFixed(2)} – $${item.priceRange.max.toFixed(2)}`;
                    } else {
                        priceHtml = `$${item.price.toFixed(2)}`;
                    }
                    return `
                    <div class="shop-item">
                        <img src="images/${item.image ? item.image : 'default.png'}" alt="${item.name}" />
                        <h3>${item.name}</h3>
                        <p>${item.description}</p>
                        <span class="price">${priceHtml}</span>
                    </div>
                    `;
                }).join('');
            });
    }

    // Tools & Accessories
    const toolsDiv = document.getElementById('tools-items');
    if (toolsDiv) {
        fetch('http://localhost:3000/api/items?category=tools')
            .then(res => res.json())
            .then(items => {
                toolsDiv.innerHTML = items.map(item => {
                    let priceHtml = '';
                    if (item.priceRange) {
                        priceHtml = `$${item.priceRange.min.toFixed(2)} – $${item.priceRange.max.toFixed(2)}`;
                    } else {
                        priceHtml = `$${item.price.toFixed(2)}`;
                    }
                    return `
                    <div class="shop-item">
                        <img src="images/${item.image ? item.image : 'default.png'}" alt="${item.name}" />
                        <h3>${item.name}</h3>
                        <p>${item.description}</p>
                        <span class="price">${priceHtml}</span>
                    </div>
                    `;
                }).join('');
            });
    }
    // Delegate click to product detail page
    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('shop-item-link')) {
            const id = e.target.getAttribute('data-id');
            if (id) {
                window.location.href = `product.html?id=${id}`;
            }
        }
    });
});

function addToCart(itemId) {
    fetch('http://localhost:3000/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, quantity: 1 })
    }).then(res => res.json())
      .then(data => {
        if (data.success) {
            alert('Added to cart!');
        } else {
            alert('You are not logged in. You can add items as a guest, but you will always be at the lowest tier.');
        }
    });
}

// Simple lightbox for cart image previews
function showCartImagePreview(src) {
    // create overlay if not exists
    let overlay = document.getElementById('cart-image-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'cart-image-overlay';
        overlay.style.position = 'fixed';
        overlay.style.left = 0;
        overlay.style.top = 0;
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(0,0,0,0.75)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = 10000;
        overlay.onclick = () => overlay.remove();
        const img = document.createElement('img');
        img.id = 'cart-image-preview-img';
        img.style.maxWidth = '92vw';
        img.style.maxHeight = '92vh';
        img.style.boxShadow = '0 8px 40px rgba(0,0,0,0.6)';
        img.style.borderRadius = '8px';
        overlay.appendChild(img);
        document.body.appendChild(overlay);
    }
    const img = document.getElementById('cart-image-preview-img');
    if (img) img.src = src;
    overlay.style.display = 'flex';
}