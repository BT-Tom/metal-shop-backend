const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const Database = require('better-sqlite3');

(async function() {
  try {
    const repoRoot = path.resolve(__dirname, '..');
    const imagesDir = path.join(repoRoot, 'public', 'images');
    const dbPath = path.join(repoRoot, 'database', 'metalshop.db');

    const db = new Database(dbPath);

    const files = fs.readdirSync(imagesDir).filter(f => /^flashing_thumb_\d+_\d+\.jpg$/i.test(f));
    if (files.length === 0) {
      console.log('No flashing_thumb_*.jpg files found.');
      return;
    }

    for (const file of files) {
      try {
        const fullPath = path.join(imagesDir, file);
        const newName = file.replace(/\.jpg$/i, '.png');
        const newPath = path.join(imagesDir, newName);

        console.log('Processing', file, '->', newName);
        const img = await Jimp.read(fullPath);
        // Ensure image fits within 600x600 and center on white bg
        img.scaleToFit(600, 600);
        const bg = new Jimp(600, 600, 0xffffffff);
        const x = Math.round((600 - img.bitmap.width) / 2);
        const y = Math.round((600 - img.bitmap.height) / 2);
        bg.composite(img, x, y);
        await bg.quality(90).writeAsync(newPath);

        // Update items table where image == old file name
        const updateItem = db.prepare('UPDATE items SET image = ? WHERE image = ?');
        const infoItem = updateItem.run(newName, file);
        if (infoItem.changes > 0) console.log(`Updated items rows: ${infoItem.changes}`);

        // Update cart_items.custom_data if it contains the old filename
        const rows = db.prepare('SELECT id, custom_data FROM cart_items WHERE custom_data LIKE ?').all('%' + file + '%');
        for (const r of rows) {
          try {
            let cd = r.custom_data;
            if (!cd) continue;
            // replace old filename in JSON text
            const replaced = cd.replace(new RegExp(file, 'g'), newName);
            db.prepare('UPDATE cart_items SET custom_data = ? WHERE id = ?').run(replaced, r.id);
            console.log(`Updated cart_items id=${r.id}`);
          } catch (err) { console.error('cart update error', err); }
        }

      } catch (err) {
        console.error('Error processing', file, err);
      }
    }

    console.log('Done.');
    db.close();
  } catch (err) {
    console.error('Script error', err);
    process.exit(1);
  }
})();
