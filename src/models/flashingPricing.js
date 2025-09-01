const Database = require('better-sqlite3');
const db = new Database('database/metalshop.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS flashing_pricing (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    per_m2 REAL DEFAULT 0.0,
    per_bend REAL DEFAULT 0.0,
    base_fee REAL DEFAULT 0.0,
    per_width_mm REAL DEFAULT 0.0,
    per_length_mm REAL DEFAULT 0.0
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS flashing_bend_prices (
    bend_count INTEGER PRIMARY KEY,
    amount REAL DEFAULT 0.0
  );
`);

// Ensure bend rows 1..6 exist
for (let i = 1; i <= 6; i++) {
  const existing = db.prepare('SELECT bend_count FROM flashing_bend_prices WHERE bend_count = ?').get(i);
  if (!existing) {
    db.prepare('INSERT INTO flashing_bend_prices (bend_count, amount) VALUES (?, ?)').run(i, 0.0);
  }
}

// Ensure new columns exist (migrations for old DBs)
try { db.prepare('ALTER TABLE flashing_pricing ADD COLUMN per_width_mm REAL DEFAULT 0.0').run(); } catch (e) {}
try { db.prepare('ALTER TABLE flashing_pricing ADD COLUMN per_length_mm REAL DEFAULT 0.0').run(); } catch (e) {}
// Ensure a row exists with id=1
const exists = db.prepare('SELECT id FROM flashing_pricing WHERE id = 1').get();
if (!exists) {
  db.prepare('INSERT INTO flashing_pricing (id, per_m2, per_bend, base_fee, per_width_mm, per_length_mm) VALUES (1, 0.0, 0.0, 0.0, 0.0, 0.0)').run();
}

module.exports = {
  get: () => {
    const row = db.prepare('SELECT * FROM flashing_pricing WHERE id = 1').get();
    const bends = db.prepare('SELECT bend_count, amount FROM flashing_bend_prices ORDER BY bend_count ASC').all();
    row.bend_prices = {};
    for (const b of bends) row.bend_prices[b.bend_count] = b.amount;
    return row;
  },
  update: (obj) => {
    db.prepare('UPDATE flashing_pricing SET per_m2 = ?, per_bend = ?, base_fee = ?, per_width_mm = ?, per_length_mm = ? WHERE id = 1')
      .run(obj.per_m2 || 0, obj.per_bend || 0, obj.base_fee || 0, obj.per_width_mm || 0, obj.per_length_mm || 0);
    if (obj.bend_prices) {
      for (let i = 1; i <= 6; i++) {
        const v = Number(obj.bend_prices[i]) || 0;
        db.prepare('UPDATE flashing_bend_prices SET amount = ? WHERE bend_count = ?').run(v, i);
      }
    }
  }
};
