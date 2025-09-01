#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const workspace = path.resolve(__dirname, '..');
const dbPath = path.join(workspace, 'database', 'metalshop.db');
const imagesDir = path.join(workspace, 'public', 'images');
const outDir = path.join(workspace, 'scripts', 'export');

if (!fs.existsSync(dbPath)) {
  console.error('Database not found at', dbPath);
  process.exit(1);
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const db = new Database(dbPath, { readonly: true });

const exportObj = { items: [], variants: [], meta: { exportedAt: new Date().toISOString() } };

exportObj.items = db.prepare('SELECT * FROM items').all();
exportObj.variants = db.prepare('SELECT * FROM item_variants').all();

// write JSON
const jsonPath = path.join(outDir, 'export.json');
fs.writeFileSync(jsonPath, JSON.stringify(exportObj, null, 2), 'utf8');
console.log('Wrote', jsonPath);

// copy images referenced by items/variants
const imagesOutDir = path.join(outDir, 'images');
if (!fs.existsSync(imagesOutDir)) fs.mkdirSync(imagesOutDir, { recursive: true });

const referenced = new Set();
exportObj.items.forEach(i => { if (i.image) referenced.add(i.image); });
exportObj.variants.forEach(v => { if (v.image) referenced.add(v.image); });

for (const img of referenced) {
  const src = path.join(imagesDir, img);
  const dest = path.join(imagesOutDir, img);
  try {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log('Copied image', img);
    } else {
      console.warn('Image not found, skipping:', src);
    }
  } catch (e) {
    console.error('Failed copying', img, e.message);
  }
}

console.log('Export complete. Folder:', outDir);
