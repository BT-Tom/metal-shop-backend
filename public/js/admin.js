const API_BASE = 'http://localhost:3000/api';
let editingItemId = null;

// Helper function for showing messages
function showNotification(message, isError = false) {
  const notification = document.createElement('div');
  notification.className = `notification ${isError ? 'error' : 'success'}`;
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '4px';
  notification.style.backgroundColor = isError ? '#f8d7da' : '#d4edda';
  notification.style.border = `1px solid ${isError ? '#f5c6cb' : '#c3e6cb'}`;
  notification.style.color = isError ? '#721c24' : '#155724';
  notification.style.zIndex = '1000';
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// Perform fetch with error handling
async function fetchAPI(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include'
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    showNotification(error.message || 'Network error occurred', true);
    throw error;
  }
}

// Flashing pricing admin controls (fetch and save)
async function loadFlashingPricing() {
  try {
    const res = await fetchAPI(`${API_BASE}/flashing-pricing`);
    const p = res.pricing || { per_bend: 0, base_fee: 0, per_width_mm: 0, per_length_mm: 0 };
    // Inject UI into admin content
    let container = document.getElementById('flashing-pricing-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'flashing-pricing-container';
      container.style.marginTop = '18px';
      const html = `
        <h3>Custom Flashing Pricing</h3>
        <div>
          <label>Price per bend:</label>
          <input id="fp-per-bend" type="number" step="0.01" style="width:120px;margin-right:12px;" />
          <label>Price per mm width:</label>
          <input id="fp-per-width-mm" type="number" step="0.0001" style="width:120px;margin-right:12px;" />
          <label>Price per mm length:</label>
          <input id="fp-per-length-mm" type="number" step="0.0001" style="width:120px;margin-right:12px;" />
          <label>Base Fee:</label>
          <input id="fp-base-fee" type="number" step="0.01" style="width:120px;margin-right:12px;" />
        </div>
        <div style="margin-top:10px;">
          <button id="fp-save-btn" type="button">Save Pricing</button>
        </div>
      `;
      container.innerHTML = html;
      document.getElementById('admin-content').appendChild(container);
      document.getElementById('fp-save-btn').addEventListener('click', async () => {
        const per_bend = parseFloat(document.getElementById('fp-per-bend').value) || 0;
        const per_width_mm = parseFloat(document.getElementById('fp-per-width-mm').value) || 0;
        const per_length_mm = parseFloat(document.getElementById('fp-per-length-mm').value) || 0;
        const base_fee = parseFloat(document.getElementById('fp-base-fee').value) || 0;
        try {
          const updated = await fetchAPI(`${API_BASE}/flashing-pricing`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ per_bend, per_width_mm, per_length_mm, base_fee })
          });
          showNotification('Flashing pricing updated');
        } catch (err) {}
      });
    }
    document.getElementById('fp-per-bend').value = p.per_bend || 0;
    document.getElementById('fp-per-width-mm').value = p.per_width_mm || 0;
    document.getElementById('fp-per-length-mm').value = p.per_length_mm || 0;
    document.getElementById('fp-base-fee').value = p.base_fee || 0;
  } catch (err) {
    console.error('Failed to load flashing pricing', err);
    let container = document.getElementById('flashing-pricing-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'flashing-pricing-container';
      container.style.marginTop = '18px';
      document.getElementById('admin-content').appendChild(container);
    }
    container.innerHTML = '<div style="color:red;font-weight:bold;">Failed to load Custom Flashing Pricing: ' + (err && err.message ? err.message : err) + '</div>';
  }
}

// Initialize the admin panel
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[DEBUG] DOMContentLoaded');
  const adminLoginDiv = document.getElementById('admin-login');
  const adminContentDiv = document.getElementById('admin-content');
  
  // Setup login form
  adminLoginDiv.innerHTML = `
    <form id="admin-login-form">
        <input type="email" id="admin-email" placeholder="Admin Email" value="admin@metalshop.com" required>
        <input type="password" id="admin-password" placeholder="Admin Password" required>
        <button type="submit">Login</button>
    </form>
    <div id="admin-login-msg"></div>
  `;
  
  // Handle all clicks with event delegation
  document.addEventListener('click', async (e) => {
    // Delete button handling
    if (e.target.matches('.delete-btn')) {
      e.preventDefault();
      e.stopPropagation();
      
      const id = e.target.dataset.id;
      if (confirm('Are you sure you want to delete this item?')) {
        try {
          const response = await fetch(`${API_BASE}/items/${id}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          
          const data = await response.json();
          
          if (data.success) {
            showNotification('Item deleted successfully!');
            loadItems(); // Refresh the list
          } else {
            showNotification(data.message || 'Failed to delete item', true);
          }
        } catch (err) {
          console.error('Delete error:', err);
          showNotification('Error deleting item: ' + err.message, true);
        }
      }
      
      return false;
    }
    
    // Edit button handling
    if (e.target.matches('.edit-btn')) {
      e.preventDefault();
      e.stopPropagation();
      
      const id = e.target.dataset.id;
      try {
        const item = await fetchAPI(`${API_BASE}/items/${id}`);
        editingItemId = id;
        document.getElementById('item-id').value = item.id;
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-price').value = item.price;
        document.getElementById('item-category').value = item.category;
  document.getElementById('item-description').value = item.description;
  document.getElementById('item-unit').value = item.unit || 'EACH';
        document.getElementById('item-submit-btn').textContent = 'Update Item';
        
        // Scroll to form
        document.getElementById('item-form').scrollIntoView({ behavior: 'smooth' });
        // If this is a custom flashing, expose an editable bends input (stored inside description JSON metadata)
        try {
          // ensure we have a container for additional item fields
          let extra = document.getElementById('item-extra-fields');
          if (!extra) {
            extra = document.createElement('div');
            extra.id = 'item-extra-fields';
            extra.style.marginTop = '8px';
            const desc = document.getElementById('item-description');
            desc.parentNode.insertBefore(extra, desc.nextSibling);
          }

          // Only show bends input for custom flashing category
          if (item.category === 'custom-flashings') {
            let bendsVal = 0;
            try {
              const parsed = JSON.parse(item.description || '{}');
              if (parsed && parsed.metadata && typeof parsed.metadata.bends !== 'undefined') bendsVal = parsed.metadata.bends;
              else if (parsed && typeof parsed.bends !== 'undefined') bendsVal = parsed.bends;
            } catch (e) {}

            extra.innerHTML = `\n              <label style="display:block;margin-top:6px;">Bends (editable): <input id="item-bends" name="item_bends" type="number" value="${bendsVal}" min="0" style="width:80px; margin-left:6px;" /></label>\n            `;
          } else {
            extra.innerHTML = '';
          }
        } catch (e) {
          console.warn('Could not render extra item fields', e);
        }
      } catch (err) {
        // Error already handled by fetchAPI
      }
    }
  });
  
  // Admin login form submission
  document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('[DEBUG] Admin login attempt');
    
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    try {
        const response = await fetch(`${API_BASE}/auth/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });

        const data = await response.json();
        console.log('[DEBUG] Admin login response:', data);

        if (data.success) {
            adminLoginDiv.style.display = 'none';
            adminContentDiv.style.display = 'block';
            await loadItems();
            await loadUsers();
            await loadFlashingPricing(); // <-- ensure pricing UI loads right after login
        } else {
            document.getElementById('admin-login-msg').textContent = 
                data.message || 'Invalid credentials';
        }
    } catch (err) {
        console.error('[DEBUG] Admin login error:', err);
        document.getElementById('admin-login-msg').textContent = 
            'Login failed: ' + err.message;
    }
  });
  
  // Item form submission
  document.getElementById('item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    // If this is a custom flashing item and bends input exists, merge bends into description JSON
    try {
      const category = formData.get('category') || document.getElementById('item-category').value;
      const bendsEl = document.getElementById('item-bends');
      if (category === 'custom-flashings' && bendsEl) {
        // try parse existing description JSON and set metadata.bends
        let desc = document.getElementById('item-description').value || '';
        let parsed = {};
        try { parsed = JSON.parse(desc); } catch (e) { parsed = { text: desc }; }
        if (!parsed.metadata) parsed.metadata = {};
        parsed.metadata.bends = Number(bendsEl.value) || 0;
        formData.set('description', JSON.stringify(parsed));
      }
    } catch (e) {
      console.warn('Could not set bends into description', e);
    }
    
    let url = `${API_BASE}/items`;
    let method = 'POST';
    
    if (editingItemId) {
      url = `${API_BASE}/items/${editingItemId}`;
      method = 'PUT';
    }
    
    try {
      const data = await fetchAPI(url, {
        method: method,
        body: formData
      });
      
      if (data.success) {
        showNotification(editingItemId ? 'Item updated!' : 'Item added!');
        form.reset();
        editingItemId = null;
        document.getElementById('item-submit-btn').textContent = 'Add Item';
        loadItems();
      }
    } catch (err) {
      // Error already handled by fetchAPI
    }
  });

  // Toggle extra fields (bends) when category changes
  document.getElementById('item-category').addEventListener('change', (e) => {
    const cat = e.target.value;
    let extra = document.getElementById('item-extra-fields');
    if (!extra) {
      extra = document.createElement('div');
      extra.id = 'item-extra-fields';
      extra.style.marginTop = '8px';
      const desc = document.getElementById('item-description');
      desc.parentNode.insertBefore(extra, desc.nextSibling);
    }
    if (cat === 'custom-flashings') {
      if (!document.getElementById('item-bends')) {
        extra.innerHTML = `<label style="display:block;margin-top:6px;">Bends (editable): <input id="item-bends" name="item_bends" type="number" value="0" min="0" style="width:80px; margin-left:6px;" /></label>`;
      }
    } else {
      extra.innerHTML = '';
    }
  });
  
  // Sort change handler
  document.getElementById('sort-select').addEventListener('change', () => {
    loadItems();
  });
});

// Load items with proper error handling
async function loadItems() {
  const sort = document.getElementById('sort-select').value;
  
    try {
    const items = await fetchAPI(`${API_BASE}/items?sort=${sort}`);

    const list = document.getElementById('items-list');
    list.innerHTML = items.map(item => `
      <div class="item-card">
        <input type="checkbox" class="bulk-item-checkbox" data-id="${item.id}" style="margin-right:8px;">
        ${item.image ? `<img src="images/${item.image}" style="width:40px;">` : ''}
        <strong>${item.name}</strong> ($${item.price.toFixed(2)} <span style='font-size:0.9em;'>${item.unit || 'EACH'}</span>) - ${item.category}
        <div class="item-actions">
          <button type="button" class="edit-btn" data-id="${item.id}">Edit</button>
          <button type="button" class="delete-btn" data-id="${item.id}">Delete</button>
          <button type="button" class="variant-btn" data-id="${item.id}" data-name="${item.name}">Manage Variants</button>
        </div>
      </div>
    `).join('');

    // Add event listeners for variant buttons
    document.querySelectorAll('.variant-btn').forEach(btn => {
      btn.addEventListener('click', () => openVariantModal(btn.dataset.id, btn.dataset.name));
    });

    // Wire up bulk duplicate button (ensure it's idempotent)
    const bulkBtn = document.getElementById('bulk-duplicate-btn');
    if (bulkBtn) {
      bulkBtn.onclick = async () => {
        const nameInput = document.getElementById('bulk-duplicate-names');
        const raw = (nameInput && nameInput.value) ? nameInput.value.trim() : '';
        if (!raw) { showNotification('Enter comma-separated new names', true); return; }
        const newNames = raw.split(',').map(s => s.trim()).filter(Boolean);
        if (newNames.length === 0) { showNotification('No valid names entered', true); return; }
        // Get selected items
        const selected = Array.from(document.querySelectorAll('.bulk-item-checkbox:checked')).map(cb => cb.dataset.id);
        if (selected.length === 0) { showNotification('Select at least one item to duplicate', true); return; }

        // For each selected item, duplicate it under each new name
        for (const itemId of selected) {
          try {
            const base = await fetchAPI(`${API_BASE}/items/${itemId}`);
            for (const newName of newNames) {
              // create new item using POST /api/items
              const form = new FormData();
              form.append('name', newName);
              form.append('price', base.price || 0);
              form.append('category', base.category || 'roofing');
              form.append('description', base.description || '');
              // leave image empty so admin can upload later; server will default or show placeholder
              form.append('unit', base.unit || 'EACH');

              const created = await fetchAPI(`${API_BASE}/items`, { method: 'POST', body: form });
              if (created && created.id) {
                showNotification(`Created ${newName}`);
                // copy variants
                const variants = await fetchAPI(`${API_BASE}/variants/item/${itemId}`);
                for (const v of variants) {
                  const vform = new FormData();
                  vform.append('item_id', created.id);
                  vform.append('size', v.size || '');
                  vform.append('colour', v.colour || '');
                  vform.append('price', v.price || 0);
                  // don't copy images automatically; admin can upload later
                  await fetchAPI(`${API_BASE}/variants`, { method: 'POST', body: vform });
                }
              }
            }
          } catch (err) {
            console.error('Bulk duplicate error for item', itemId, err);
            showNotification('Error duplicating item ' + itemId, true);
          }
        }
        // Refresh list after done
        nameInput.value = '';
        loadItems();
      };
    }
  } catch (err) {
    // Error already handled by fetchAPI
  }
}

// Variant Modal Logic
const variantModal = document.getElementById('variant-modal');
const closeVariantModalBtn = document.getElementById('close-variant-modal');
const variantStyleName = document.getElementById('variant-style-name');
const variantItemIdInput = document.getElementById('variant-item-id');
const variantForm = document.getElementById('variant-form');
const variantListDiv = document.getElementById('variant-list');

function openVariantModal(itemId, styleName) {
  variantModal.style.display = 'flex';
  variantStyleName.textContent = styleName;
  variantItemIdInput.value = itemId;
  loadVariants(itemId);
}

closeVariantModalBtn.onclick = () => {
  variantModal.style.display = 'none';
  variantForm.reset();
  variantListDiv.innerHTML = '';
};

variantForm.onsubmit = async (e) => {
  e.preventDefault();
  const formData = new FormData(variantForm);
  const editingVariantId = variantForm.getAttribute('data-editing-variant');
  let url = `${API_BASE}/variants`;
  let method = 'POST';
  if (editingVariantId) {
    url = `${API_BASE}/variants/${editingVariantId}`;
    method = 'PUT';
  }
  try {
    await fetchAPI(url, {
      method: method,
      body: formData
    });
    showNotification(editingVariantId ? 'Variant updated!' : 'Variant added!');
    variantForm.reset();
    variantForm.removeAttribute('data-editing-variant');
    document.getElementById('variant-submit-btn').textContent = 'Add Variant';
    loadVariants(variantItemIdInput.value);
  } catch (err) {}
};

async function loadVariants(itemId) {
  try {
    const variants = await fetchAPI(`${API_BASE}/variants/item/${itemId}`);
    let selectAllBtn = '';
    if (variants.length > 0) {
      // Get unique sizes
      const uniqueSizes = [...new Set(variants.map(v => v.size))];
      selectAllBtn = '<button id="select-all-variants-btn" type="button" style="margin-bottom:8px;">Select All</button>';
      selectAllBtn += uniqueSizes.map(size => `<button class="select-size-btn" data-size="${size}" type="button" style="margin-left:6px;margin-bottom:8px;">Select All ${size}</button>`).join('');
    }
    // Colour name to RGB mapping
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
    variantListDiv.innerHTML = variants.length === 0 ? '<em>No variants yet.</em>' :
      selectAllBtn +
      variants.map(v => {
        const rgb = colourMap[v.colour] || '#fff';
        return `
        <div class="variant-row" style="margin-bottom:8px;">
          <input type="checkbox" class="bulk-variant-checkbox" data-id="${v.id}">
          <strong>Size:</strong> ${v.size} <strong>Colour:</strong> ${v.colour}
          <span style="display:inline-block;width:20px;height:20px;background:${rgb};border:2px solid #000;margin-left:6px;vertical-align:middle;"></span>
          <strong>Price:</strong> $${v.price.toFixed(2)}
          ${v.image ? `<img src="images/${v.image}" style="width:32px;vertical-align:middle;">` : ''}
          <button type="button" class="edit-variant-btn" data-id="${v.id}">Edit</button>
          <button type="button" class="delete-variant-btn" data-id="${v.id}">Delete</button>
        </div>
        `;
      }).join('');
    // Add select all logic
    const selectAllVariantsBtn = document.getElementById('select-all-variants-btn');
    if (selectAllVariantsBtn) {
      selectAllVariantsBtn.onclick = () => {
        document.querySelectorAll('.bulk-variant-checkbox').forEach(cb => cb.checked = true);
      };
    }
    // Add select all by size logic
    document.querySelectorAll('.select-size-btn').forEach(btn => {
      btn.onclick = () => {
        const size = btn.getAttribute('data-size');
        document.querySelectorAll('.bulk-variant-checkbox').forEach(cb => {
          const row = cb.closest('.variant-row');
          if (row && row.innerHTML.includes(`<strong>Size:</strong> ${size} `)) {
            cb.checked = true;
          }
        });
      };
    });
// Bulk Edit Prices logic
const bulkEditBtn = document.getElementById('bulk-edit-prices-btn');
const bulkEditForm = document.getElementById('bulk-edit-prices-form');
const bulkPriceValue = document.getElementById('bulk-price-value');
const applyBulkBtn = document.getElementById('apply-bulk-price-btn');
const cancelBulkBtn = document.getElementById('cancel-bulk-price-btn');

// Call loadFlashingPricing after admin login success
// Hook into existing login success path by wrapping or calling after loadItems/loadUsers in the login handler above
// We'll add an interval check here to call it after DOM ready and when admin-content is visible
setInterval(() => {
  const adminContent = document.getElementById('admin-content');
  if (adminContent && adminContent.style.display === 'block' && !document.getElementById('flashing-pricing-container')) {
    loadFlashingPricing();
  }
}, 800);

if (bulkEditBtn && bulkEditForm && bulkPriceValue && applyBulkBtn && cancelBulkBtn) {
  bulkEditBtn.onclick = () => {
    bulkEditForm.style.display = 'block';
    bulkPriceValue.value = '';
  };
  cancelBulkBtn.onclick = () => {
    bulkEditForm.style.display = 'none';
    bulkPriceValue.value = '';
  };
  applyBulkBtn.onclick = async () => {
    const newPrice = parseFloat(bulkPriceValue.value);
    if (isNaN(newPrice)) {
      showNotification('Enter a valid price', true);
      return;
    }
    const checked = Array.from(document.querySelectorAll('.bulk-variant-checkbox:checked'));
    if (checked.length === 0) {
      showNotification('Select at least one variant', true);
      return;
    }
    for (const cb of checked) {
      const id = cb.dataset.id;
      await fetchAPI(`${API_BASE}/variants/${id}`, {
        method: 'PUT',
        body: new URLSearchParams({ price: newPrice })
      });
    }
    showNotification('Bulk price update complete!');
    bulkEditForm.style.display = 'none';
    bulkPriceValue.value = '';
    loadVariants(variantItemIdInput.value);
  };
}
    // Add delete listeners
    document.querySelectorAll('.delete-variant-btn').forEach(btn => {
      btn.onclick = async () => {
        if (confirm('Delete this variant?')) {
          await fetchAPI(`${API_BASE}/variants/${btn.dataset.id}`, { method: 'DELETE' });
          showNotification('Variant deleted!');
          loadVariants(itemId);
        }
      };
    });
    // Add edit listeners
    document.querySelectorAll('.edit-variant-btn').forEach(btn => {
      btn.onclick = async () => {
        const variant = await fetchAPI(`${API_BASE}/variants/${btn.dataset.id}`);
        variantForm.setAttribute('data-editing-variant', btn.dataset.id);
        document.getElementById('variant-size').value = variant.size;
        document.getElementById('variant-colour').value = variant.colour;
        document.getElementById('variant-price').value = variant.price;
        document.getElementById('variant-submit-btn').textContent = 'Update Variant';
      };
    });
  } catch (err) {
    variantListDiv.innerHTML = '<em>Error loading variants.</em>';
  }
}

// Load users with proper error handling
async function loadUsers() {
  try {
    const users = await fetchAPI(`${API_BASE}/users`);
    
    const div = document.getElementById('user-tiers');
    div.innerHTML = users.map(user => `
      <div>
        <strong>${user.name}</strong> (${user.email}) - Tier: 
        <select class="tier-select" data-user-id="${user.id}">
          ${[...Array(10)].map((_, i) => `<option value="${i+1}" ${user.tier==i+1?'selected':''}>${i+1}</option>`).join('')}
        </select>
      </div>
    `).join('');
    
    // Add event listeners for tier changes
    document.querySelectorAll('.tier-select').forEach(select => {
      select.addEventListener('change', async (e) => {
        const userId = e.target.dataset.userId;
        const tier = e.target.value;
        
        try {
          await fetchAPI(`${API_BASE}/users/${userId}/tier`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tier })
          });
          
          showNotification(`User tier updated to ${tier}`);
        } catch (err) {
          // Error already handled by fetchAPI
        }
      });
    });
  } catch (err) {
    // Error already handled by fetchAPI
  }
}