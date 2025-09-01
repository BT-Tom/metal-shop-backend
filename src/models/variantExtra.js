const Database = require('better-sqlite3');
const db = new Database('database/metalshop.db');

module.exports = {
    getPriceRangeForItems: (itemIds) => {
        // itemIds: array of item ids
        if (!itemIds || itemIds.length === 0) return {};
        const placeholders = itemIds.map(() => '?').join(',');
        const rows = db.prepare(`
            SELECT item_id, MIN(price) as minPrice, MAX(price) as maxPrice
            FROM item_variants
            WHERE item_id IN (${placeholders})
            GROUP BY item_id
        `).all(...itemIds);
        const map = {};
        for (const row of rows) {
            map[row.item_id] = { min: row.minPrice, max: row.maxPrice };
        }
        return map;
    }
};
