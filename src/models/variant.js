const Database = require('better-sqlite3');
const db = new Database('database/metalshop.db');

module.exports = {
    getByItemId: (item_id) => db.prepare('SELECT * FROM item_variants WHERE item_id = ?').all(item_id),
    getById: (id) => db.prepare('SELECT * FROM item_variants WHERE id = ?').get(id),
    create: (variant) => db.prepare('INSERT INTO item_variants (item_id, size, colour, price, image) VALUES (?, ?, ?, ?, ?)').run(variant.item_id, variant.size, variant.colour, variant.price, variant.image),
    update: (id, variant) => db.prepare('UPDATE item_variants SET size = ?, colour = ?, price = ?, image = ? WHERE id = ?').run(variant.size, variant.colour, variant.price, variant.image, id),
    delete: (id) => {
        const result = db.prepare('DELETE FROM item_variants WHERE id = ?').run(id);
        if (result.changes === 0) throw new Error('Variant not found');
    }
};
