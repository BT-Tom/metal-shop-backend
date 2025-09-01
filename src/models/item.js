
const Database = require('better-sqlite3');
const db = new Database('database/metalshop.db');
const variantExtra = require('./variantExtra');

module.exports = {
    getAll: (category) => {
        let items;
        if (category) {
            items = db.prepare('SELECT * FROM items WHERE category = ?').all(category);
        } else {
            items = db.prepare('SELECT * FROM items').all();
        }
        // Get price ranges for all items
        const itemIds = items.map(i => i.id);
        const priceRanges = variantExtra.getPriceRangeForItems(itemIds);
        // Attach priceRange to each item if variants exist
        for (const item of items) {
            if (priceRanges[item.id]) {
                item.priceRange = priceRanges[item.id];
            }
        }
        return items;
    },
    getById: (id) => db.prepare('SELECT * FROM items WHERE id = ?').get(id),
    create: (item) => db.prepare('INSERT INTO items (name, price, category, description, image, unit) VALUES (?, ?, ?, ?, ?, ?)').run(item.name, item.price, item.category, item.description, item.image, item.unit || 'EACH'),
    update: (id, item) => db.prepare('UPDATE items SET name = ?, price = ?, category = ?, description = ?, image = ?, unit = ? WHERE id = ?').run(item.name, item.price, item.category, item.description, item.image, item.unit || 'EACH', id),
    delete: (id) => {
        const result = db.prepare('DELETE FROM items WHERE id = ?').run(id);
        if (result.changes === 0) throw new Error('Item not found');
    }
};