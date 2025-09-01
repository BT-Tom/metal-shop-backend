const Database = require('better-sqlite3');
const { db } = require('../utils/initDb');

class User {
    static updateTier(userId, tier) {
        const stmt = db.prepare('UPDATE users SET tier = ? WHERE id = ?');
        return stmt.run(tier, userId);
    }
    constructor() {
            this.db = require('../utils/initDb').db;
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE,
                    password TEXT,
                    name TEXT,
                    provider TEXT,
                    providerId TEXT,
                    tier INTEGER DEFAULT 1,
                    total_spent DECIMAL(10,2) DEFAULT 0.00,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
    }

    static getAll() {
        const stmt = db.prepare(`
            SELECT id, name, email, tier, 
                   COALESCE(total_spent, 0) as total_spent 
            FROM users
        `);
        return stmt.all();
    }

    static create({ email, password, name, provider = null, providerId = null }) {
        try {
            const stmt = db.prepare(`
                INSERT INTO users (email, password, name, provider, providerId)
                VALUES (?, ?, ?, ?, ?)
            `);
            const result = stmt.run(email, password, name, provider, providerId);
            return this.getById(result.lastInsertRowid);
        } catch (err) {
            console.error('Create user error:', err);
            throw new Error('Failed to create user');
        }
    }
    static getByProviderId(provider, providerId) {
        const stmt = db.prepare('SELECT * FROM users WHERE provider = ? AND providerId = ?');
        return stmt.get(provider, providerId);
    }

    static getById(id) {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        return stmt.get(id);
    }

    static getByEmail(email) {
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        return stmt.get(email);
    }

    static getProgressToNextTier(userId) {
        const user = this.getById(userId);
        if (!user) return null;

        const tierThresholds = {
            1: 1000,    // Need $1000 to reach tier 2
            2: 2000,    // Need $2000 more to reach tier 3
            3: 4000,    // Need $4000 more to reach tier 4
            4: 8000     // And so on...
        };

        const currentTier = user.tier;
        const threshold = tierThresholds[currentTier] || null;
        if (!threshold) return null;

        return {
            currentSpent: user.total_spent,
            nextTierThreshold: threshold,
            progress: Math.min((user.total_spent / threshold) * 100, 100)
        };
    }

    static updateTotalSpent(userId, amount) {
        const stmt = db.prepare(`
            UPDATE users 
            SET total_spent = total_spent + ?,
                tier = CASE 
                    WHEN total_spent + ? >= 8000 THEN 4
                    WHEN total_spent + ? >= 4000 THEN 3
                    WHEN total_spent + ? >= 2000 THEN 2
                    ELSE 1
                END
            WHERE id = ?
        `);
        return stmt.run(amount, amount, amount, amount, userId);
    }
}

module.exports = User;

