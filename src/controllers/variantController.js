const Variant = require('../models/variant');

exports.getByItemId = (req, res) => {
    res.json(Variant.getByItemId(req.params.item_id));
};

exports.getById = (req, res) => {
    res.json(Variant.getById(req.params.id));
};

exports.create = (req, res) => {
    const variant = req.body;
    if (req.file) {
        variant.image = req.file.filename;
    }
    Variant.create(variant);
    res.json({ success: true });
};

exports.update = (req, res) => {
    let variant = req.body;
    // Fetch existing variant to preserve missing fields
    const existing = Variant.getById(req.params.id);
    if (!existing) {
        return res.status(404).json({ success: false, message: 'Variant not found' });
    }
    // If size or colour not provided, use existing
    if (!variant.size) variant.size = existing.size;
    if (!variant.colour) variant.colour = existing.colour;
    if (!variant.price) variant.price = existing.price;
    if (req.file) {
        variant.image = req.file.filename;
    } else if (!variant.image) {
        variant.image = existing.image;
    }
    Variant.update(req.params.id, variant);
    res.json({ success: true });
};

exports.delete = (req, res) => {
    try {
        Variant.delete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
