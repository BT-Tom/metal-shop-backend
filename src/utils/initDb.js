const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../database/metalshop.db'));

// Create tables if they don't exist
db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    tier INTEGER DEFAULT 1,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

// Create admin user if it doesn't exist
const createAdmin = db.prepare(`
    INSERT OR IGNORE INTO users (email, password, name, tier)
    VALUES ('admin@metalshop.com', 'admin123', 'Admin', 999)
`);
createAdmin.run();

// Log database status
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
console.log(`Database initialized! Users in database: ${userCount.count}`);

module.exports = { db };