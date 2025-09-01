const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const Items = require('../models/item');
const Cart = require('../models/cart');
const pricingModel = require('../models/flashingPricing');

function ensureImagesDir() {
  const imagesDir = path.join(__dirname, '../../public/images');
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
  return imagesDir;
}

module.exports = {
  createFlashing: async (req, res) => {
    try {
      const user_id = req.session.userId;
      if (!user_id) return res.status(403).json({ success: false, message: 'login_required' });

      const { imageData, area, bends, length_mm, metadata, quantity } = req.body;
      if (!imageData) return res.status(400).json({ success: false, message: 'no_image' });

      // Parse data URL
      const matches = imageData.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/);
      if (!matches) return res.status(400).json({ success: false, message: 'invalid_image' });
      const mime = matches[1];
      const ext = matches[2] === 'jpeg' ? 'jpg' : matches[2];
      const b64 = matches[3];
      const buffer = Buffer.from(b64, 'base64');

      const imagesDir = ensureImagesDir();
      const timestamp = Date.now();
      const fullFilename = `flashing_full_${user_id}_${timestamp}.${ext}`;

  const thumbFilename = `flashing_thumb_${user_id}_${timestamp}.png`;
  const fullPath = path.join(imagesDir, fullFilename);
  const thumbPath = path.join(imagesDir, thumbFilename);

      // Save full image
      fs.writeFileSync(fullPath, buffer);

  // Create thumbnail (max 600px on longest side)
  const img = await Jimp.read(buffer);
  // Resize to fit within 600x600, preserving aspect
  img.scaleToFit(600, 600);
  // Create white background and composite the resized image centered to avoid black showing through transparent PNGs
  const bg = new Jimp(600, 600, 0xffffffff); // white background
  const x = Math.round((600 - img.bitmap.width) / 2);
  const y = Math.round((600 - img.bitmap.height) / 2);
  bg.composite(img, x, y);
  await bg.quality(80).writeAsync(thumbPath);

      // Compute price using new pricing model: base_fee + per_bend * bends + per_width_mm * width_mm + per_length_mm * length_mm
      const pricing = pricingModel.get();
      const per_bend = pricing.per_bend || 0;
      const per_width_mm = pricing.per_width_mm || 0;
      const per_length_mm = pricing.per_length_mm || 0;
      const base_fee = pricing.base_fee || 0;
      const bendsNum = Number(bends) || 0;
      // width_mm: sum of all line segment lengths (getTotalWidth from client)
      let width_mm = 0;
      if (metadata && metadata.nodes && metadata.lines) {
        // Recompute width_mm from geometry if possible
        const nodes = metadata.nodes;
        const lines = metadata.lines;
        width_mm = lines.reduce((sum, line) => {
          const a = nodes[line.start], b = nodes[line.end];
          if (!a || !b) return sum;
          return sum + Math.round(Math.hypot(a.x - b.x, a.y - b.y));
        }, 0);
      } else if (typeof area !== 'undefined' && typeof length_mm !== 'undefined') {
        // fallback: area / length_mm
        width_mm = Math.round((Number(area) * 1e6) / (Number(length_mm) || 1));
      }
      const lengthNum = Number(length_mm) || 0;
      const price = Number((base_fee + (per_bend * bendsNum) + (per_width_mm * width_mm) + (per_length_mm * lengthNum)).toFixed(2));

      // Create a new item for this custom flashing
      const name = `Custom Flashing ${new Date(timestamp).toISOString()}`;
      const description = JSON.stringify({ generated: true, metadata: metadata || null });
      const createRes = Items.create({ name, price, category: 'custom-flashings', description, image: thumbFilename, unit: 'EACH' });
      const newItemId = createRes.lastInsertRowid || (createRes && createRes.lastInsertRowid) || null;
      // If JSDb didn't return that, attempt to fetch by unique name
      let itemId = newItemId;
      if (!itemId) {
        // fallback: insert using raw SQL and get lastInsertRowid
        // but Items.create should have returned it; we'll try to query
        const found = Items.getAll('custom-flashings').find(i => i.name === name);
        itemId = found ? found.id : null;
      }

      if (!itemId) {
        return res.status(500).json({ success: false, message: 'failed_create_item' });
      }

      // Build custom_data: include full image path and metadata
      const custom_data = {
        full_image: fullFilename,
        thumb_image: thumbFilename,
        area: areaNum,
        bends: bendsNum,
        length_mm: Number(length_mm) || null,
        metadata: metadata || null
      };

      // Add to cart
      const qty = Number(quantity) || 1;
      Cart.addItem(user_id, itemId, qty, custom_data);

      res.json({ success: true, item_id: itemId, cart_added: true, thumbnail: thumbFilename });
    } catch (err) {
      console.error('createFlashing error', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
};
