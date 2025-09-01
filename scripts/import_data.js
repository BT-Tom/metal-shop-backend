#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const workspace = path.resolve(__dirname, '..');
const dbPath = path.join(workspace, 'database', 'metalshop.db');
const imagesDir = path.join(workspace, 'public', 'images');
const inDir = path.join(workspace, 'scripts', 'export');

if (!fs.existsSync(dbPath)) {
  console.error('Database not found at', dbPath);
  process.exit(1);
}
if (!fs.existsSync(inDir)) {
  console.error('Import folder not found:', inDir);
  process.exit(1);
}

const db = new Database(dbPath);
const dataPath = path.join(inDir, 'export.json');
if (!fs.existsSync(dataPath)) {
  console.error('export.json not found in', inDir);
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const items = payload.items || [];
const variants = payload.variants || [];

// Helper: copy images from import folder to imagesDir if present
function copyImage(filename) {
  if (!filename) return;
  const src = path.join(inDir, 'images', filename);
  const dest = path.join(imagesDir, filename);
  try {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log('Copied image', filename);
    }
  } catch (e) {
    console.warn('Failed to copy image', filename, e.message);
  }
}

// Merge items: if item with same name exists, skip or update; we'll skip to avoid overwriting
const insertItem = db.prepare('INSERT INTO items (name, price, category, description, image, unit) VALUES (?, ?, ?, ?, ?, ?)');
const getItemByName = db.prepare('SELECT id FROM items WHERE name = ?').get;

db.transaction(() => {
  for (const it of items) {
    const exists = getItemByName(it.name);
    if (exists) {
      console.log('Skipping existing item:', it.name);
    } else {
      copyImage(it.image);
      const info = insertItem.run(it.name, it.price || 0, it.category || '', it.description || '', it.image || '', it.unit || 'EACH');
      console.log('Inserted item:', it.name, 'id=', info.lastInsertRowid);
    }
  }
})();

// Merge variants: map item_id from names
const getItemId = db.prepare('SELECT id FROM items WHERE name = ?').get;
const insertVariant = db.prepare('INSERT INTO item_variants (item_id, size, colour, price, image) VALUES (?, ?, ?, ?, ?)');

db.transaction(() => {
  for (const v of variants) {
    const item = db.prepare('SELECT name FROM items WHERE id = ?').get(v.item_id);
    let targetItemId = null;
    if (item && item.name) {
      const found = getItemId(item.name);
      if (found) targetItemId = found.id;
    }
    // If we couldn't resolve by id, try to find by name field inside v (if available)
    if (!targetItemId && v.item_name) {
      const found = getItemId(v.item_name);
      if (found) targetItemId = found.id;
    }
    if (!targetItemId) {
      console.log('Could not resolve variant owner for variant id', v.id, 'skipping');
      continue;
    }
    // Avoid exact duplicates
    const existsVar = db.prepare('SELECT id FROM item_variants WHERE item_id = ? AND size = ? AND colour = ?').get(targetItemId, v.size, v.colour);
    if (existsVar) {
      console.log('Skipping existing variant for', targetItemId, v.size, v.colour);
      continue;
    }
    copyImage(v.image);
    insertVariant.run(targetItemId, v.size || '', v.colour || '', v.price || 0, v.image || '');
    console.log('Inserted variant for item', targetItemId, v.size, v.colour);
  }
})();

console.log('Import complete.');
