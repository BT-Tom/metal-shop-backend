const User = require('../models/user');

exports.getAll = (req, res) => {
    res.json(User.getAll());
};

exports.updateTier = (req, res) => {
    // Prevent admin from changing their own tier
    if (req.session && req.session.userId && String(req.session.userId) === String(req.params.id)) {
        return res.status(403).json({ success: false, message: 'Admins cannot change their own tier.' });
    }
    User.updateTier(req.params.id, req.body.tier);
    res.json({ success: true });
};