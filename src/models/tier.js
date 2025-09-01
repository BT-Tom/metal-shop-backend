const Database = require('better-sqlite3');
const db = new Database('database/metalshop.db');

module.exports = {
    getAll: (category) => {
        if (category) {
            return db.prepare('SELECT * FROM items WHERE category = ?').all(category);
        }
        return db.prepare('SELECT * FROM items').all();
    },
    getById: (id) => db.prepare('SELECT * FROM items WHERE id = ?').get(id),
    create: (item) => db.prepare('INSERT INTO items (name, price, category, description, image) VALUES (?, ?, ?, ?, ?)').run(item.name, item.price, item.category, item.description, item.image),
    update: (id, item) => db.prepare('UPDATE items SET name = ?, price = ?, category = ?, description = ?, image = ? WHERE id = ?').run(item.name, item.price, item.category, item.description, item.image, id),
    delete: (id) => db.prepare('DELETE FROM items WHERE id = ?').run(id)
};