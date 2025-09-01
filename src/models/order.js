const Database = require('better-sqlite3');
const db = new Database('database/metalshop.db');

// Orders and order_items to record checkout attempts and results
db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        stripe_session_id TEXT,
        total_amount INTEGER,
        currency TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        item_id INTEGER,
        quantity INTEGER,
        unit_price INTEGER,
        custom_data TEXT
    );
`);

module.exports = {
    createOrder: (user_id, stripe_session_id, total_amount, currency = 'usd') => {
        const info = db.prepare('INSERT INTO orders (user_id, stripe_session_id, total_amount, currency, status) VALUES (?, ?, ?, ?, ?)').run(user_id, stripe_session_id, total_amount, currency, 'pending');
        return info.lastInsertRowid;
    },
    addOrderItem: (order_id, item_id, quantity, unit_price, custom_data = null) => {
        const customStr = custom_data && typeof custom_data === 'object' ? JSON.stringify(custom_data) : custom_data;
        db.prepare('INSERT INTO order_items (order_id, item_id, quantity, unit_price, custom_data) VALUES (?, ?, ?, ?, ?)').run(order_id, item_id, quantity, unit_price, customStr);
    },
    markPaidBySessionId: (session_id) => {
        const info = db.prepare('UPDATE orders SET status = ? WHERE stripe_session_id = ?').run('paid', session_id);
        return info.changes;
    },
    getBySessionId: (session_id) => {
        return db.prepare('SELECT * FROM orders WHERE stripe_session_id = ?').get(session_id);
    }
};
