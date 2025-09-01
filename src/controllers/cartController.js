const Cart = require('../models/cart');

exports.getByUser = (req, res) => {
    const user_id = req.session.userId;
    const rows = Cart.getByUser(user_id);
    // parse custom_data JSON for each row if present
    const parsed = rows.map(r => {
        try {
            return Object.assign({}, r, { custom_data: r.custom_data ? JSON.parse(r.custom_data) : null });
        } catch (e) {
            return Object.assign({}, r, { custom_data: r.custom_data });
        }
    });
    res.json(parsed);
};

exports.addItem = (req, res) => {
    const { item_id, quantity = 1, variant_id, length_mm, size } = req.body;
    const user_id = req.session.userId;
    // build custom data object
    const custom = {};
    if (variant_id !== undefined) custom.variant_id = variant_id;
    if (length_mm !== undefined) custom.length_mm = Number(length_mm);
    if (size !== undefined) custom.size = size;
    const custom_data = Object.keys(custom).length ? custom : null;
    Cart.addItem(user_id, item_id, quantity, custom_data);
    res.json({ success: true });
};

exports.updateItem = (req, res) => {
    const { cart_id, quantity } = req.body;
    Cart.updateItem(cart_id, quantity);
    res.json({ success: true });
};

exports.removeItem = (req, res) => {
    const { cart_id } = req.body;
    Cart.removeItem(cart_id);
    res.json({ success: true });
};

exports.clearCart = (req, res) => {
    const user_id = req.session.userId;
    Cart.clearCart(user_id);
    res.json({ success: true });
};