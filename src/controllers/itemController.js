const Item = require('../models/item');

exports.getAll = (req, res) => {
    const { category, sort } = req.query;
    res.json(Item.getAll(category, sort));
};

exports.getById = (req, res) => {
    res.json(Item.getById(req.params.id));
};

exports.create = (req, res) => {
    const item = req.body;
    if (req.file) {
        item.image = req.file.filename;
    }
    Item.create(item);
    res.json({ success: true });
};

exports.update = (req, res) => {
    let item = req.body;
    // Fetch existing item to preserve image if not updated
    const existing = Item.getById(req.params.id);
    if (!existing) {
        return res.status(404).json({ success: false, message: 'Item not found' });
    }
    if (req.file) {
        item.image = req.file.filename;
    } else {
        item.image = existing.image;
    }
    Item.update(req.params.id, item);
    res.json({ success: true });
};

exports.delete = (req, res) => {
    try {
        console.log('Deleting item:', req.params.id);
        Item.delete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};