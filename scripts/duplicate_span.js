// duplicate_span.js
// Finds an item with 'span' in the name and clones it under several new names.
const Database = require('better-sqlite3');
const db = new Database('database/metalshop.db');

const namesToAdd = ['LokClad','MiniClad','MiniCoro','FlatClad','CurvedClad'];

function findSpanItem() {
    const row = db.prepare("SELECT * FROM items WHERE LOWER(name) LIKE '%span%' COLLATE NOCASE").get();
    return row;
}

function exists(name) {
    const r = db.prepare('SELECT id FROM items WHERE name = ?').get(name);
    return !!r;
}

function duplicate(base, name) {
    if (exists(name)) {
        console.log('Skipped (exists):', name);
        return;
    }
    const stmt = db.prepare('INSERT INTO items (name, price, category, description, image, unit) VALUES (?, ?, ?, ?, ?, ?)');
    const info = stmt.run(name, base.price || 0, base.category || 'roofing', base.description || '', base.image || 'default.png', base.unit || 'EACH');
    console.log('Inserted', name, 'id=', info.lastInsertRowid);
}

(function main(){
    const base = findSpanItem();
    if (!base) {
        console.error('No item found with "span" in the name. Aborting.');
        process.exit(2);
    }
    console.log('Found base item:', base.name, 'id=', base.id);
    for (const n of namesToAdd){
        duplicate(base, n);
    }
    console.log('Done.');
})();
