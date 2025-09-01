const Database = require('better-sqlite3');
const db = new Database('database/metalshop.db');

// Create cart_items table if it doesn't exist
// Each row is an item in a user's cart
// custom_data can be used for custom flashings, etc.
db.exec(`
    CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        custom_data TEXT,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);

module.exports = {
    getByUser: (user_id) => {
        return db.prepare(`
            SELECT ci.id as cart_id, ci.item_id, ci.quantity, ci.custom_data, i.*
            FROM cart_items ci
            JOIN items i ON ci.item_id = i.id
            WHERE ci.user_id = ?
        `).all(user_id);
    },
    addItem: (user_id, item_id, quantity = 1, custom_data = null) => {
        // Serialize custom_data to JSON string if object
        const customStr = custom_data && typeof custom_data === 'object' ? JSON.stringify(custom_data) : custom_data;
        // If item already in cart with same custom_data string, update quantity
        const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND item_id = ? AND (custom_data IS ? OR custom_data = ?)').get(user_id, item_id, customStr, customStr);
        if (existing) {
            db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?').run(quantity, existing.id);
        } else {
            db.prepare('INSERT INTO cart_items (user_id, item_id, quantity, custom_data) VALUES (?, ?, ?, ?)').run(user_id, item_id, quantity, customStr);
        }
    },
    updateItem: (cart_id, quantity) => {
        db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(quantity, cart_id);
    },
    removeItem: (cart_id) => {
        db.prepare('DELETE FROM cart_items WHERE id = ?').run(cart_id);
    },
    clearCart: (user_id) => {
        db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(user_id);
    }
};